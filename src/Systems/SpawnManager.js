import { ENEMY_ARCHETYPE_CONFIGS } from "../config/enemies.js";
import { BossEnemy } from "../entities/BossEnemy.js";
import { SPAWN_LANES, WORLD_WIDTH, WORLD_HEIGHT, SPAWN_BURST_CONFIG } from "../config/progression.js";
const MAX_ACTIVE = 80;

const BOSS_ENTRY_LANES = [SPAWN_LANES.BOW, SPAWN_LANES.STERN];
const BOSS_WARNING_LEAD_MS = 12000;

export class SpawnManager {
  constructor(scene) {
    this.scene = scene;
    this._lastReaperIndex = -1;
  }

  /* ═══════════════════════════════════════════════
     Main spawn tick — called from GameScene.update()
     ═══════════════════════════════════════════════ */
  updateSpawnTick(delta) {
    const s = this.scene;
    s.spawnAccumulatorMs += delta;
    this.processDirectorBossSpawns();
    this.processDirectorMiniBossSpawns();
    this.processDirectorSpawnBursts();
    this.processDirectorLadderSpawns();
    this.processDirectorHatchBreaches();

    const spawnRateMultiplier = s.getEffectiveSpawnRateMultiplier();
    const effectiveSpawnIntervalMs = s.baseSpawnCheckIntervalMs / Math.max(0.2, spawnRateMultiplier);
    while (s.spawnAccumulatorMs >= effectiveSpawnIntervalMs) {
      s.spawnAccumulatorMs -= effectiveSpawnIntervalMs;
      this.maintainEnemyDensity();
    }
  }

  /* ═══════════════════════════════════════════════
     Non-host consumes director requests without spawning
     ═══════════════════════════════════════════════ */
  consumeDirectorRequests() {
    const s = this.scene;
    s.director.consumeBossSpawnRequests();
    s.director.consumeMiniBossSpawnRequests();
    s.director.consumeSpawnBurstRequests();
    s.director.consumeLadderSpawnRequests();
    s.director.consumeHatchBreachSpawnRequests();
  }

  /* ═══════════════════════════════════════════════
     Enemy AI update — called from GameScene.update()
     ═══════════════════════════════════════════════ */
  updateEnemyAI(delta, time) {
    const s = this.scene;
    const speedMultiplier = s.getEffectiveEnemySpeedMultiplier();
    const damageMultiplier = s.director.getEnemyDamageMultiplier();

    s.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      enemy.speed = enemy.baseSpeed * speedMultiplier;
      enemy.damage = Math.max(1, Math.round(enemy.baseDamage * damageMultiplier));
      const target = s._getNearestPlayerForEnemy(enemy);
      enemy.chase(target, delta, time);
      enemy.tryApplyPoisonAura(target, time);
      if (enemy.updateBossPattern) enemy.updateBossPattern(target, time);
      s.applyEnemyAntiJam(enemy, time);
    });
  }

  /* ── Density ── */
  maintainEnemyDensity() {
    const s = this.scene;
    if (s.isGameOver || s.isLeveling || s.isWeaponSelecting) return;

    const seconds = s.runTimeMs / 1000;
    const pacingTargetScale = Math.max(0.5, Number(s.spawnPacingPreset?.targetCountScale) || 1);
    const baseTarget = s.getTargetEnemyCount(seconds) * pacingTargetScale;
    const spawnRateMultiplier = s.getEffectiveSpawnRateMultiplier();
    const scaledTarget = baseTarget * spawnRateMultiplier;
    const performance = s.getPerformanceMetrics();
    const adaptiveOffset = s.director.getAdaptiveTargetOffset(scaledTarget, performance.dps, performance.killRate);
    s.targetEnemies = Math.min(MAX_ACTIVE, Math.round(scaledTarget + adaptiveOffset));

    const aliveEnemies = s.getAliveEnemyCount();
    if (aliveEnemies >= s.targetEnemies) return;

    const deficit = s.targetEnemies - aliveEnemies;
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
    const s = this.scene;
    if (s.isGameOver || s.isLeveling || s.isWeaponSelecting) return;
    if (s.getAliveEnemyCount() >= MAX_ACTIVE) return;

    const type = s.pickEnemyArchetype();
    const hpMultiplier = s.director.getEnemyHpMultiplier();
    const baseHp = ENEMY_ARCHETYPE_CONFIGS[type]?.hp ?? ENEMY_ARCHETYPE_CONFIGS.chaser.hp;
    const scaledHp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const groupCount = type === "swarm" ? Phaser.Math.Between(3, 5) : 1;
    const lane = s.director?.chooseSpawnLane?.(preferredLane) ?? null;
    const anchor = s.getSpawnPosition(lane);

    for (let i = 0; i < groupCount; i += 1) {
      if (s.getAliveEnemyCount() >= MAX_ACTIVE) break;
      const jitter = type === "swarm" ? Phaser.Math.Between(12, 48) : 0;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      let sx = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * jitter, 12, WORLD_WIDTH - 12);
      let sy = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * jitter, 12, WORLD_HEIGHT - 12);
      if (!s.isValidSpawnPoint(sx, sy)) {
        const fb = s.getSpawnPosition(lane);
        sx = fb.x; sy = fb.y;
      }
      if (!s.isValidSpawnPoint(sx, sy)) continue;
      s.spawnEnemyAtPosition(type, sx, sy, lane);
    }
  }

  /* ── Director processors ── */
  processDirectorBossSpawns() {
    const s = this.scene;
    const pending = s.director.consumeBossSpawnRequests();
    for (let i = 0; i < pending; i++) this.spawnBossEnemy();
  }

  processDirectorMiniBossSpawns() {
    const s = this.scene;
    if (s.hasActiveMiniBoss()) return;
    const pending = s.director.consumeMiniBossSpawnRequests();
    for (let i = 0; i < Math.min(1, pending); i++) this.spawnMiniBossEnemy();
  }

  processDirectorSpawnBursts() {
    const s = this.scene;
    const pending = s.director.consumeSpawnBurstRequests();
    for (let i = 0; i < pending; i++) this.spawnEnemyFromEdge();
  }

  processDirectorLadderSpawns() {
    const s = this.scene;
    const pending = s.director.consumeLadderSpawnRequests();
    if (pending <= 0) return;
    s.logSpawnEventPressure("LADDER", pending);
    for (let i = 0; i < pending; i++) {
      const lane = s.director.chooseLadderLane();
      s.spawnEnemyFromEventPoint(lane, s.getLadderSpawnPoint(lane), "ladder");
    }
  }

  processDirectorHatchBreaches() {
    const s = this.scene;
    const pending = s.director.consumeHatchBreachSpawnRequests();
    if (pending <= 0) return;
    s.logSpawnEventPressure("HATCH", pending);
    s.showHudAlert("HATCH BREACH", 1000);
    for (let i = 0; i < pending; i++) {
      s.spawnEnemyFromEventPoint(SPAWN_LANES.STERN, s.HATCH_BREACH_POINT, "hatch");
    }
  }

  /* ── Boss spawning ── */
  spawnBossEnemy(preferredLane = null) {
    const s = this.scene;
    const spawn = this.getBossEntrySpawn(preferredLane);
    const boss = new BossEnemy(s, spawn.position.x, spawn.position.y);
    const hpMultiplier = s.director.getEnemyHpMultiplier();
    boss.hp = Math.max(1, Math.round(boss.hp * hpMultiplier));
    boss.maxHp = boss.hp;
    boss.setData("lastDashHitId", -1);
    boss.setData("archetype", "boss");
    boss.setData("spawnLane", spawn.lane);
    s.enemies.add(boss);
    s.shakeScreen(210, 0.0048);
    s.playSfx("boss_warning");
    s.showWarningBanner("BOSS INCOMING", { tone: "boss", durationMs: 1500 });
  }

  spawnMiniBossEnemy(preferredLane = null) {
    const s = this.scene;
    const spawn = this.getBossEntrySpawn(preferredLane);
    const miniBoss = new BossEnemy(s, spawn.position.x, spawn.position.y, { variant: "mini" });
    const hpMultiplier = s.director.getEnemyHpMultiplier();
    miniBoss.hp = Math.max(1, Math.round(miniBoss.hp * hpMultiplier));
    miniBoss.maxHp = miniBoss.hp;
    miniBoss.setData("lastDashHitId", -1);
    miniBoss.setData("archetype", "mini_boss");
    miniBoss.setData("spawnLane", spawn.lane);
    s.enemies.add(miniBoss);
    s.shakeScreen(160, 0.0036);
    s.playSfx("boss_warning");
    s.showWarningBanner("MINI BOSS", { tone: "mini", durationMs: 1180 });
  }

  getBossEntrySpawn(preferredLane = null) {
    const s = this.scene;
    const safeLane = BOSS_ENTRY_LANES.includes(preferredLane) ? preferredLane : Phaser.Utils.Array.GetRandom(BOSS_ENTRY_LANES);
    const fallbackLane = safeLane === SPAWN_LANES.BOW ? SPAWN_LANES.STERN : SPAWN_LANES.BOW;
    const primary = s.getSpawnPosition(safeLane);
    if (s.isValidSpawnPoint(primary.x, primary.y)) return { lane: safeLane, position: primary };
    return { lane: fallbackLane, position: s.getSpawnPosition(fallbackLane) };
  }

  /* ── Reaper ── */
  updateReaperSpawning() {
    const s = this.scene;
    const REAPER_FIRST_AT_SEC = 900;
    const REAPER_INTERVAL_SEC = 45;
    const SUPER_REAPER_AT_SEC = 1200;
    if (s.runTimeMs < REAPER_FIRST_AT_SEC * 1000) return;

    const elapsed = s.runTimeMs - REAPER_FIRST_AT_SEC * 1000;
    const reaperIndex = Math.floor(elapsed / (REAPER_INTERVAL_SEC * 1000));
    if (reaperIndex > this._lastReaperIndex) {
      this._lastReaperIndex = reaperIndex;
      const isSuperWave = s.runTimeMs >= SUPER_REAPER_AT_SEC * 1000;
      const count = reaperIndex + 1;
      for (let i = 0; i < count; i++) {
        s.time.delayedCall(i * 400, () => isSuperWave ? this.spawnSuperReaper() : this.spawnReaper());
      }
      s.showHudAlert(isSuperWave ? "超级死神降临!" : "死神降临!", 2000);
      s.shakeScreen(isSuperWave ? 400 : 300, isSuperWave ? 0.012 : 0.008);
    }
  }

  spawnReaper() {
    const s = this.scene;
    const spawn = this.getBossEntrySpawn(null);
    const r = new BossEnemy(s, spawn.position.x, spawn.position.y, { variant: "reaper" });
    r.hp = 99999; r.maxHp = 99999;
    r.speed = 200; r.baseSpeed = 200;
    r.damage = 99; r.baseDamage = 99;
    r.xpValue = 0;
    r.setData("lastDashHitId", -1);
    r.setData("archetype", "reaper");
    r.setData("spawnLane", spawn.lane);
    r.setTint(0xff0000);
    r.setAlpha(0.85);
    s.enemies.add(r);
  }

  spawnSuperReaper() {
    const s = this.scene;
    const spawn = this.getBossEntrySpawn(null);
    const r = new BossEnemy(s, spawn.position.x, spawn.position.y, { variant: "reaper" });
    r.hp = 199999; r.maxHp = 199999;
    r.speed = 300; r.baseSpeed = 300;
    r.damage = 199; r.baseDamage = 199;
    r.xpValue = 0;
    r.setData("lastDashHitId", -1);
    r.setData("archetype", "reaper");
    r.setData("spawnLane", spawn.lane);
    r.setTint(0xff0000);
    r.setAlpha(0.9);
    s.enemies.add(r);
  }

  /* ── Stage announcements ── */
  updateBossApproachWarning() {
    const s = this.scene;
    const DIRECTOR_BOSS_SPAWN = { intervalMs: 180000 };
    const intervalMs = DIRECTOR_BOSS_SPAWN.intervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    const nextCycle = Math.floor(s.runTimeMs / intervalMs) + 1;
    const remaining = nextCycle * intervalMs - s.runTimeMs;
    if (remaining > BOSS_WARNING_LEAD_MS || remaining <= 0) return;
    if (s.bossApproachWarnedCycleIndex === nextCycle) return;

    s.bossApproachWarnedCycleIndex = nextCycle;
    s.playSfx("boss_warning");
    s.showWarningBanner("BOSS APPROACHING", { tone: "approach", durationMs: 1500 });
  }
}
