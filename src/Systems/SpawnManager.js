import { ENEMY_ARCHETYPE_CONFIGS } from "../config/enemies.js";
import { BossEnemy } from "../entities/BossEnemy.js";
import { SPAWN_LANES, WORLD_WIDTH, WORLD_HEIGHT, SPAWN_BURST_CONFIG } from "../config/progression.js";
import { HATCH_BREACH_POINT } from "../config/spawn-points.js";
import { processHealerHeal } from "../entities/enemies/Healer.js";
const MAX_ACTIVE = 80;

const BOSS_ENTRY_LANES = [SPAWN_LANES.BOW, SPAWN_LANES.STERN];
const BOSS_WARNING_LEAD_MS = 12000;

export class SpawnManager {
  constructor(gameContext) {
    this.ctx = gameContext;
    this._lastReaperIndex = -1;
  }

  /* ═══════════════════════════════════════════════
     Main spawn tick — called from GameScene.update()
     ═══════════════════════════════════════════════ */
  updateSpawnTick(delta) {
    this.ctx.state.spawnAccumulatorMs += delta;
    this.processDirectorBossSpawns();
    this.processDirectorMiniBossSpawns();
    this.processDirectorSpawnBursts();
    this.processDirectorLadderSpawns();
    this.processDirectorHatchBreaches();

    const spawnRateMultiplier = this.ctx.methods.getEffectiveSpawnRateMultiplier();
    const effectiveSpawnIntervalMs = this.ctx.state.baseSpawnCheckIntervalMs / Math.max(0.2, spawnRateMultiplier);
    while (this.ctx.state.spawnAccumulatorMs >= effectiveSpawnIntervalMs) {
      this.ctx.state.spawnAccumulatorMs -= effectiveSpawnIntervalMs;
      this.maintainEnemyDensity();
    }
  }

  /* ═══════════════════════════════════════════════
     Non-host consumes director requests without spawning
     ═══════════════════════════════════════════════ */
  consumeDirectorRequests() {
    this.ctx.managers.director.consumeBossSpawnRequests();
    this.ctx.managers.director.consumeMiniBossSpawnRequests();
    this.ctx.managers.director.consumeSpawnBurstRequests();
    this.ctx.managers.director.consumeLadderSpawnRequests();
    this.ctx.managers.director.consumeHatchBreachSpawnRequests();
  }

  /* ═══════════════════════════════════════════════
     Enemy AI update — called from GameScene.update()
     ═══════════════════════════════════════════════ */
  updateEnemyAI(delta, time) {
    const speedMultiplier = this.ctx.methods.getEffectiveEnemySpeedMultiplier();
    const damageMultiplier = this.ctx.managers.director.getEnemyDamageMultiplier();

    this.ctx.entities.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      enemy.speed = enemy.baseSpeed * speedMultiplier;
      enemy.damage = Math.max(1, Math.round(enemy.baseDamage * damageMultiplier));
      const target = this.ctx.getNearestPlayer(enemy);
      enemy.chase(target, delta, time);
      enemy.tryApplyPoisonAura(target, time);
      if (enemy.updateBossPattern) enemy.updateBossPattern(target, time);
      this.ctx.methods.applyEnemyAntiJam(enemy, time);
      processHealerHeal(this.ctx.rawScene, enemy, time);
    });
  }

  updateEnemyBehaviorsOnly(time) {
    const damageMultiplier = this.ctx.managers.director.getEnemyDamageMultiplier();

    this.ctx.entities.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      enemy.damage = Math.max(1, Math.round(enemy.baseDamage * damageMultiplier));
      const target = this.ctx.getNearestPlayer(enemy);
      enemy.tryApplyPoisonAura(target, time);
      if (enemy.updateBossPattern) enemy.updateBossPattern(target, time);
    });
  }

  /* ── Density ── */
  maintainEnemyDensity() {
    if (this.ctx.state.isGameOver || this.ctx.state.isLeveling || this.ctx.state.isWeaponSelecting) return;

    const seconds = this.ctx.state.runTimeMs / 1000;
    const pacingTargetScale = 1;
    const baseTarget = this.ctx.methods.getTargetEnemyCount(seconds) * pacingTargetScale;
    const spawnRateMultiplier = this.ctx.methods.getEffectiveSpawnRateMultiplier();
    const scaledTarget = baseTarget * spawnRateMultiplier;
    const performance = this.ctx.methods.getPerformanceMetrics();
    const adaptiveOffset = this.ctx.managers.director.getAdaptiveTargetOffset(scaledTarget, performance.dps, performance.killRate);
    this.ctx.state.targetEnemies = Math.min(MAX_ACTIVE, Math.round(scaledTarget + adaptiveOffset));

    const aliveEnemies = this.ctx.entities.aliveEnemyCount;
    if (aliveEnemies >= this.ctx.state.targetEnemies) return;

    const deficit = this.ctx.state.targetEnemies - aliveEnemies;
    const spawnCount = this.getSpawnBurst(seconds, deficit);
    for (let i = 0; i < spawnCount; i += 1) this.spawnEnemyFromEdge();
  }

  getSpawnBurst(seconds, deficit) {
    let burst = SPAWN_BURST_CONFIG.defaultBurst;
    for (let i = 0; i < SPAWN_BURST_CONFIG.steps.length; i += 1) {
      if (seconds >= SPAWN_BURST_CONFIG.steps[i].atSec) burst = SPAWN_BURST_CONFIG.steps[i].burst;
    }
    return Math.min(burst, Math.max(1, Math.ceil(deficit * 0.6)));
  }

  /* ── Spawn from edge ── */
  spawnEnemyFromEdge(preferredLane = null) {
    if (this.ctx.state.isGameOver || this.ctx.state.isLeveling || this.ctx.state.isWeaponSelecting) return;
    if (this.ctx.entities.aliveEnemyCount >= MAX_ACTIVE) return;

    const type = this.ctx.methods.pickEnemyArchetype();
    const hpMultiplier = this.ctx.managers.director.getEnemyHpMultiplier();
    const baseHp = ENEMY_ARCHETYPE_CONFIGS[type]?.hp ?? ENEMY_ARCHETYPE_CONFIGS.chaser.hp;
    const scaledHp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const groupCount = type === "swarm" ? Phaser.Math.Between(3, 5) : 1;
    const lane = this.ctx.managers.director?.chooseSpawnLane?.(preferredLane) ?? null;
    const anchor = this.ctx.methods.getSpawnPosition(lane);

    for (let i = 0; i < groupCount; i += 1) {
      if (this.ctx.entities.aliveEnemyCount >= MAX_ACTIVE) break;
      const jitter = type === "swarm" ? Phaser.Math.Between(12, 48) : 0;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      let sx = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * jitter, 12, WORLD_WIDTH - 12);
      let sy = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * jitter, 12, WORLD_HEIGHT - 12);
      if (!this.ctx.methods.isValidSpawnPoint(sx, sy)) {
        const fb = this.ctx.methods.getSpawnPosition(lane);
        sx = fb.x; sy = fb.y;
      }
      if (!this.ctx.methods.isValidSpawnPoint(sx, sy)) continue;
      this.ctx.methods.spawnEnemyAtPosition(type, sx, sy, lane);
    }
  }

  /* ── Director processors ── */
  processDirectorBossSpawns() {
    const pending = this.ctx.managers.director.consumeBossSpawnRequests();
    for (let i = 0; i < pending; i++) this.spawnBossEnemy();
  }

  processDirectorMiniBossSpawns() {
    if (this.ctx.methods.hasActiveMiniBoss()) return;
    const pending = this.ctx.managers.director.consumeMiniBossSpawnRequests();
    for (let i = 0; i < Math.min(1, pending); i++) this.spawnMiniBossEnemy();
  }

  processDirectorSpawnBursts() {
    const pending = this.ctx.managers.director.consumeSpawnBurstRequests();
    for (let i = 0; i < pending; i++) this.spawnEnemyFromEdge();
  }

  processDirectorLadderSpawns() {
    const pending = this.ctx.managers.director.consumeLadderSpawnRequests();
    if (pending <= 0) return;
    this.ctx.methods.logSpawnEventPressure("LADDER", pending);
    for (let i = 0; i < pending; i++) {
      const lane = this.ctx.managers.director.chooseLadderLane();
      this.ctx.methods.spawnEnemyFromEventPoint(lane, this.ctx.methods.getLadderSpawnPoint(lane), "ladder");
    }
  }

  processDirectorHatchBreaches() {
    const pending = this.ctx.managers.director.consumeHatchBreachSpawnRequests();
    if (pending <= 0) return;
    this.ctx.methods.logSpawnEventPressure("HATCH", pending);
    this.ctx.hud.showAlert("HATCH BREACH", 1000);
    for (let i = 0; i < pending; i++) {
      this.ctx.methods.spawnEnemyFromEventPoint(SPAWN_LANES.STERN, HATCH_BREACH_POINT, "hatch");
    }
  }

  /* ── Boss spawning ── */
  spawnBossEnemy(preferredLane = null) {
    const spawn = this.getBossEntrySpawn(preferredLane);
    const boss = new BossEnemy(this.ctx.entities.enemies.scene, spawn.position.x, spawn.position.y);
    const hpMultiplier = this.ctx.managers.director.getEnemyHpMultiplier();
    boss.hp = Math.max(1, Math.round(boss.hp * hpMultiplier));
    boss.maxHp = boss.hp;
    boss.setData("lastDashHitId", -1);
    boss.setData("archetype", "boss");
    boss.setData("spawnLane", spawn.lane);
    this.ctx.entities.enemies.add(boss);
    this.ctx.fx.shake(210, 0.0048);
    this.ctx.audio.playSfx("boss_warning");
    this.ctx.hud.showWarning("BOSS INCOMING", { tone: "boss", durationMs: 1500 });
  }

  spawnMiniBossEnemy(preferredLane = null) {
    const spawn = this.getBossEntrySpawn(preferredLane);
    const miniBoss = new BossEnemy(this.ctx.entities.enemies.scene, spawn.position.x, spawn.position.y, { variant: "mini" });
    const hpMultiplier = this.ctx.managers.director.getEnemyHpMultiplier();
    miniBoss.hp = Math.max(1, Math.round(miniBoss.hp * hpMultiplier));
    miniBoss.maxHp = miniBoss.hp;
    miniBoss.setData("lastDashHitId", -1);
    miniBoss.setData("archetype", "mini_boss");
    miniBoss.setData("spawnLane", spawn.lane);
    this.ctx.entities.enemies.add(miniBoss);
    this.ctx.fx.shake(160, 0.0036);
    this.ctx.audio.playSfx("boss_warning");
    this.ctx.hud.showWarning("MINI BOSS", { tone: "mini", durationMs: 1180 });
  }

  getBossEntrySpawn(preferredLane = null) {
    const safeLane = BOSS_ENTRY_LANES.includes(preferredLane) ? preferredLane : Phaser.Utils.Array.GetRandom(BOSS_ENTRY_LANES);
    const fallbackLane = safeLane === SPAWN_LANES.BOW ? SPAWN_LANES.STERN : SPAWN_LANES.BOW;
    const primary = this.ctx.methods.getSpawnPosition(safeLane);
    if (this.ctx.methods.isValidSpawnPoint(primary.x, primary.y)) return { lane: safeLane, position: primary };
    return { lane: fallbackLane, position: this.ctx.methods.getSpawnPosition(fallbackLane) };
  }

  /* ── Reaper ── */
  updateReaperSpawning() {
    const REAPER_FIRST_AT_SEC = 900;
    const REAPER_INTERVAL_SEC = 45;
    const SUPER_REAPER_AT_SEC = 1200;
    if (this.ctx.state.runTimeMs < REAPER_FIRST_AT_SEC * 1000) return;

    const elapsed = this.ctx.state.runTimeMs - REAPER_FIRST_AT_SEC * 1000;
    const reaperIndex = Math.floor(elapsed / (REAPER_INTERVAL_SEC * 1000));
    if (reaperIndex > this._lastReaperIndex) {
      this._lastReaperIndex = reaperIndex;
      const isSuperWave = this.ctx.state.runTimeMs >= SUPER_REAPER_AT_SEC * 1000;
      const count = reaperIndex + 1;
      for (let i = 0; i < count; i++) {
        this.ctx.phaser.time.delayedCall(i * 400, () => isSuperWave ? this.spawnSuperReaper() : this.spawnReaper());
      }
      this.ctx.hud.showAlert(isSuperWave ? "超级死神降临!" : "死神降临!", 2000);
      this.ctx.fx.shake(isSuperWave ? 400 : 300, isSuperWave ? 0.012 : 0.008);
    }
  }

  spawnReaper() {
    const spawn = this.getBossEntrySpawn(null);
    const r = new BossEnemy(this.ctx.entities.enemies.scene, spawn.position.x, spawn.position.y, { variant: "reaper" });
    r.hp = 99999; r.maxHp = 99999;
    r.speed = 200; r.baseSpeed = 200;
    r.damage = 99; r.baseDamage = 99;
    r.xpValue = 0;
    r.setData("lastDashHitId", -1);
    r.setData("archetype", "reaper");
    r.setData("spawnLane", spawn.lane);
    r.setTint(0xff0000);
    r.setAlpha(0.85);
    this.ctx.entities.enemies.add(r);
  }

  spawnSuperReaper() {
    const spawn = this.getBossEntrySpawn(null);
    const r = new BossEnemy(this.ctx.entities.enemies.scene, spawn.position.x, spawn.position.y, { variant: "reaper" });
    r.hp = 199999; r.maxHp = 199999;
    r.speed = 300; r.baseSpeed = 300;
    r.damage = 199; r.baseDamage = 199;
    r.xpValue = 0;
    r.setData("lastDashHitId", -1);
    r.setData("archetype", "reaper");
    r.setData("spawnLane", spawn.lane);
    r.setTint(0xff0000);
    r.setAlpha(0.9);
    this.ctx.entities.enemies.add(r);
  }

  /* ── Stage announcements ── */
  updateBossApproachWarning() {
    const DIRECTOR_BOSS_SPAWN = { intervalMs: 180000 };
    const intervalMs = DIRECTOR_BOSS_SPAWN.intervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    const nextCycle = Math.floor(this.ctx.state.runTimeMs / intervalMs) + 1;
    const remaining = nextCycle * intervalMs - this.ctx.state.runTimeMs;
    if (remaining > BOSS_WARNING_LEAD_MS || remaining <= 0) return;
    if (this.ctx.state.bossApproachWarnedCycleIndex === nextCycle) return;

    this.ctx.state.bossApproachWarnedCycleIndex = nextCycle;
    this.ctx.audio.playSfx("boss_warning");
    this.ctx.hud.showWarning("BOSS APPROACHING", { tone: "approach", durationMs: 1500 });
  }
}
