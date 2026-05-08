/**
 * GameContext — Centralized interface facade for systems to access game state.
 *
 * Systems receive a GameContext instance instead of directly accessing the
 * raw Phaser scene. This defines a clear contract between systems and the
 * game world, enabling independent testing and future refactoring.
 *
 * Usage in systems:
 *   constructor(gameContext) {
 *     this.ctx = gameContext;
 *   }
 *
 *   // Access entities
 *   this.ctx.enemies.forEach(...)
 *
 *   // Play audio
 *   this.ctx.audio.playSfx("dash")
 *
 *   // Visual effects
 *   this.ctx.fx.shake(200, 0.005)
 *   this.ctx.fx.spawnKillParticles(x, y, 10)
 *
 *   // Game state
 *   if (this.ctx.state.isGameOver) return;
 *   const elapsed = this.ctx.state.runTimeMs;
 *
 *   // HUD
 *   this.ctx.hud.showAlert("BOSS!", 2000)
 *
 *   // Networking (only used in coop)
 *   if (this.ctx.net.isHost) { ... }
 */

export class GameContext {
  constructor(scene) {
    const s = scene;

    /**
     * Entity access — enemies, player, projectiles, pools.
     */
    this.entities = Object.freeze({
      get enemies() { return s.enemies; },
      get player() { return s.player; },
      get xpOrbs() { return s.xpOrbs; },
      get bossProjectiles() { return s.bossProjectiles; },
      get obstacles() { return s.obstacles; },
      get enemyPool() { return s.enemyPool; },
      get itemPool() { return s.itemPool; },
      get chests() { return s.chests; },
      get activeItems() { return s.activeItems; },
      get aliveEnemyCount() { return s.getAliveEnemyCount(); }
    });

    /**
     * Phaser subsystems — graphics, physics, tweens, time, cameras, textures.
     */
    this.phaser = Object.freeze({
      get add() { return s.add; },
      get tweens() { return s.tweens; },
      get time() { return s.time; },
      get physics() { return s.physics; },
      get cameras() { return s.cameras; },
      get textures() { return s.textures; },
      get input() { return s.input; },
      get sound() { return s.sound; },
      get cache() { return s.cache; },
      get scene() { return s.scene; },
      get scale() { return s.scale; },
      get sys() { return s.sys; },
      get keys() { return s.keys; }
    });

    /**
     * Audio — play sound effects.
     */
    this.audio = Object.freeze({
      playSfx(type, options) {
        s.audioManager?.playSfx(type, options);
      },
      get bgmEnabled() { return s.audioManager?.bgmEnabled; },
      set bgmEnabled(v) { if (s.audioManager) s.audioManager.bgmEnabled = v; },
      startBgm() { s.audioManager?.startBgm(); },
      stopBgm() { s.audioManager?.stopBgm(); }
    });

    /**
     * Visual effects — screen shake, particles.
     */
    this.fx = Object.freeze({
      shake(durationMs, intensity) {
        s.cameraController?.shake(durationMs, intensity);
      },
      spawnKillParticles(x, y, count) {
        s.particleFactory?.killEmitter?.explode(count, x, y);
      },
      spawnEliteKillParticles(x, y, count) {
        s.particleFactory?.eliteKillEmitter?.explode(count, x, y);
      },
      spawnDamageParticles(x, y, count) {
        s.particleFactory?.damageEmitter?.explode(count, x, y);
      },
      spawnHitSparkParticles(x, y, count) {
        s.particleFactory?.damageEmitter?.explode(count, x, y);
      },
      playWeaponFireFeedback(weaponType) {
        if (s.playWeaponFireFeedback) s.playWeaponFireFeedback(weaponType);
      },
      playWeaponEvolutionFeedback(weapon) {
        if (s.playWeaponEvolutionFeedback) s.playWeaponEvolutionFeedback(weapon);
      },
      spawnWeaponHitParticles(x, y, count) {
        if (s.spawnWeaponHitParticles) s.spawnWeaponHitParticles(x, y, count);
      },
      releaseBossProjectile(proj) {
        if (s.releaseBossProjectile) s.releaseBossProjectile(proj);
      },
      triggerPlayerHurtFeedback(player) {
        if (s.triggerPlayerHurtFeedback) s.triggerPlayerHurtFeedback(player);
      },
      triggerGameOver(instant) {
        if (s.triggerGameOver) s.triggerGameOver(instant);
      }
    });

    /**
     * HUD — alerts, banners, visibility.
     */
    this.hud = Object.freeze({
      showAlert(message, durationMs) {
        s.warningBanner?.showHudAlert(message, durationMs);
      },
      showWarning(message, options) {
        s.warningBanner?.showWarningBanner(message, options);
      },
      setDomVisible(visible) {
        if (s.setDomHudVisible) s.setDomHudVisible(visible);
      },
      setTouchVisible(visible) {
        if (s.setDomTouchControlsVisible) s.setDomTouchControlsVisible(visible);
      },
      applyModalFocus(active) {
        if (s.applyHudModalFocus) s.applyHudModalFocus(active);
      }
    });

    /**
     * Game state — read-only status flags and runtime values.
     */
    this.state = Object.freeze({
      get isGameOver() { return s.isGameOver; },
      get isLeveling() { return s.isLeveling; },
      get isWeaponSelecting() { return s.isWeaponSelecting; },
      get isPaused() { return s.isPaused; },
      get runTimeMs() { return s.runTimeMs; },
      get playTime() { return s.playTime; },
      get level() { return s.level; },
      get totalKills() { return s.totalKills; },
      set totalKills(v) { s.totalKills = v; },
      get spawnAccumulatorMs() { return s.spawnAccumulatorMs; },
      set spawnAccumulatorMs(v) { s.spawnAccumulatorMs = v; },
      get baseSpawnCheckIntervalMs() { return s.baseSpawnCheckIntervalMs; },
      get targetEnemies() { return s.targetEnemies; },
      set targetEnemies(v) { s.targetEnemies = v; },
      get bossApproachWarnedCycleIndex() { return s.bossApproachWarnedCycleIndex; },
      set bossApproachWarnedCycleIndex(v) { s.bossApproachWarnedCycleIndex = v; },
      get pendingLevelUps() { return s.pendingLevelUps; },
      set pendingLevelUps(v) { s.pendingLevelUps = v; },
      get lastAttackAt() { return s.lastAttackAt; },
      set lastAttackAt(v) { s.lastAttackAt = v; }
    });

    /**
     * XP / Currency / Progression.
     */
    this.progression = Object.freeze({
      gainXp(amount) { if (s.gainXp) s.gainXp(amount); },
      spawnXpOrb(x, y, value, config) {
        if (s.spawnXpOrb) s.spawnXpOrb(x, y, value, config);
      },
      get runMetaCurrency() { return s.runMetaCurrency; },
      set runMetaCurrency(v) { s.runMetaCurrency = v; },
      get metaXpMultiplier() { return s.metaXpMultiplier; },
      set metaXpMultiplier(v) { s.metaXpMultiplier = v; }
    });

    /**
     * Networking — coop mode state.
     */
    this.net = Object.freeze({
      get gameMode() { return s.gameMode; },
      get isHost() { return s.isHost; },
      get isCoop() { return s.gameMode === "coop"; },
      get networkManager() { return s.networkManager; },
      sendEnemyDamage(enemyId, damage, x, y) {
        s.networkManager?.sendEnemyDamage(enemyId, damage, x, y);
      },
      sendEnemyKilled(serverId, data) {
        s.networkManager?.sendEnemyKilled(serverId, data);
      }
    });

    /**
     * Manager access — other systems that may need to be called.
     */
    this.managers = Object.freeze({
      get director() { return s.director; },
      get weaponSystem() { return s.weaponSystem; },
      get levelUpManager() { return s.levelUpManager; },
      get statusEffectSystem() { return s.statusEffectSystem; },
      get playerSync() { return s.playerSync; },
      get enemySync() { return s.enemySync; },
      get coopSync() { return s.coopSync; },
      get textureFactory() { return s.textureFactory; }
    });

    /**
     * Scene-level arrays (mutable state shared between systems).
     */
    this.arrays = Object.freeze({
      get levelUpOptionActions() { return s.levelUpOptionActions; },
      get levelUpUi() { return s.levelUpUi; },
      get pauseUi() { return s.pauseUi; }
    });

    /**
     * Scene-level methods — game logic methods on the scene.
     */
    this.methods = Object.freeze({
      getEffectiveSpawnRateMultiplier() { return s.getEffectiveSpawnRateMultiplier(); },
      getEffectiveEnemySpeedMultiplier() { return s.getEffectiveEnemySpeedMultiplier(); },
      getTargetEnemyCount(seconds) { return s.getTargetEnemyCount(seconds); },
      getPerformanceMetrics() { return s.getPerformanceMetrics(); },
      pickEnemyArchetype() { return s.pickEnemyArchetype(); },
      getSpawnPosition(lane) { return s.getSpawnPosition(lane); },
      getLadderSpawnPoint(lane) { return s.getLadderSpawnPoint(lane); },
      isValidSpawnPoint(x, y) { return s.isValidSpawnPoint(x, y); },
      spawnEnemyAtPosition(type, x, y, lane) { return s.spawnEnemyAtPosition(type, x, y, lane); },
      spawnEnemyFromEventPoint(lane, point, type) { return s.spawnEnemyFromEventPoint(lane, point, type); },
      hasActiveMiniBoss() { return s.hasActiveMiniBoss(); },
      logSpawnEventPressure(type, count) { if (s.logSpawnEventPressure) s.logSpawnEventPressure(type, count); },
      applyEnemyAntiJam(enemy, time) { s.applyEnemyAntiJam(enemy, time); },
      handleEnemyDefeat(enemy) { if (s.handleEnemyDefeat) s.handleEnemyDefeat(enemy); },
      playKillCounterPulse() { if (s.playKillCounterPulse) s.playKillCounterPulse(); },
      recordKillEvent() { if (s.recordKillEvent) s.recordKillEvent(); },
      updateKillCombo() { if (s.updateKillCombo) s.updateKillCombo(); },
      finalizeMetaRun() { if (s.finalizeMetaRun) s.finalizeMetaRun(); },
      spawnDamageText(x, y, value, enemy) {
        if (s.spawnDamageText) s.spawnDamageText(x, y, value, enemy);
      },
      spawnDamageNumber(x, y, value, priority, options) {
        if (s.spawnDamageNumber) s.spawnDamageNumber(x, y, value, priority, options);
      }
    });

    /**
     * Convenience — get the nearest player for an enemy (for coop).
     */
    this.getNearestPlayer = (enemy) => s._getNearestPlayerForEnemy?.(enemy);

    Object.defineProperty(this, 'rawScene', {
      get() { return s; },
      enumerable: true,
      configurable: false
    });
  }
}
