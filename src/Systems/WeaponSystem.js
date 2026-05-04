import {
  PROJECTILE_POOL_SIZE_BY_TEXTURE,
  PROJECTILE_TEXTURE_BY_WEAPON,
  WEAPON_DEFINITIONS,
  WEAPON_EVOLUTION_RULES,
  AURA_WEAPON_TYPES,
  SLASH_WEAPON_TYPES,
  BOOMERANG_WEAPON_TYPES,
  MOLOTOV_WEAPON_TYPES,
  GRAVITY_WEAPON_TYPES
} from "../config/weapons.js";
import { Enemy } from "../entities/Enemy.js";

const PROJECTILE_VISUAL_SCALE = 1.4;
const PROJECTILE_GLOW_ALPHA = 0.6;
const PROJECTILE_TRAIL_LIFETIME_MS = 200;
const PROJECTILE_RECT_TRAIL_LIFETIME_MS = 180;
const PROJECTILE_RECT_TRAIL_MAX = 320;
const PROJECTILE_GLOW_TINT = 0xffffaa;
const PROJECTILE_RENDER_DEPTH = 30;
const PROJECTILE_EFFECT_DEPTH = 31;
const PROJECTILE_TINT_BY_WEAPON = Object.freeze({
  dagger: 0xa8e7ff,
  fireball: 0xffb36a,
  meteor: 0xff8757,
  lightning: 0xc6f1ff,
  scatter_shot: 0xffee88,
  homing_missile: 0xff66aa,
  laser: 0xff3333
});
const PROJECTILE_VISUAL_PROFILE_BY_WEAPON = Object.freeze({
  dagger: Object.freeze({
    scaleX: 1.65,
    scaleY: 0.7,
    glowAlpha: 0.42,
    trailBurst: 1
  }),
  fireball: Object.freeze({
    scaleX: 1.85,
    scaleY: 1.85,
    glowAlpha: 0.75,
    trailBurst: 2
  }),
  meteor: Object.freeze({
    scaleX: 2.1,
    scaleY: 2.1,
    glowAlpha: 0.82,
    trailBurst: 2
  }),
  scatter_shot: Object.freeze({
    scaleX: 1.0,
    scaleY: 1.0,
    glowAlpha: 0.5,
    trailBurst: 1
  }),
  homing_missile: Object.freeze({
    scaleX: 1.4,
    scaleY: 1.4,
    glowAlpha: 0.7,
    trailBurst: 2
  }),
  default: Object.freeze({
    scaleX: PROJECTILE_VISUAL_SCALE,
    scaleY: PROJECTILE_VISUAL_SCALE,
    glowAlpha: PROJECTILE_GLOW_ALPHA,
    trailBurst: 1
  })
});

function getWeaponDefinition(type) {
  return WEAPON_DEFINITIONS[type] ?? null;
}

export class WeaponSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.paused = false;
    this.projectilePoolByTexture = new Map();
    this.globalDamageMultiplier = 1;
    this.globalCooldownMultiplier = 1;
    this.globalRangeMultiplier = 1;
    this.globalDurationMultiplier = 1;
    this.projectileCount = 1;
    this.projectileGlowGraphics = scene.add.graphics().setDepth(PROJECTILE_RENDER_DEPTH);
    this.projectileTrailRectsGraphics = scene.add.graphics().setDepth(PROJECTILE_RENDER_DEPTH - 1);
    this.projectileTrailRects = [];
    this.projectileTrailParticles = null;
    this.projectileTrailEmitter = null;
    this.projectileTrailAccumulatorMs = 0;

    this.projectiles = scene.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.orbitBlades = scene.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.preallocateProjectilePool();
    this.createProjectileTrailEmitter();

    scene.physics.add.overlap(this.projectiles, scene.enemies, this.handleProjectileHit, this.isValidProjectileEnemyCollision, this);
    scene.physics.add.overlap(this.orbitBlades, scene.enemies, this.handleOrbitBladeHit, null, this);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  createProjectileTrailEmitter() {
    const textureKey = this.scene.textures?.exists("hit_particle")
      ? "hit_particle"
      : this.scene.textures?.exists("__WHITE")
      ? "__WHITE"
      : null;
    if (!textureKey) {
      return;
    }

    this.projectileTrailEmitter = this.scene.add.particles(0, 0, textureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      lifespan: PROJECTILE_TRAIL_LIFETIME_MS,
      speed: { min: 6, max: 28 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.45, end: 0 },
      blendMode: "ADD"
    });
    this.projectileTrailEmitter.setDepth(PROJECTILE_RENDER_DEPTH);
    this.projectileTrailParticles = this.projectileTrailEmitter;
  }

  getProjectileVisualColor(type) {
    return PROJECTILE_GLOW_TINT;
  }

  getProjectileVisualProfile(type) {
    return PROJECTILE_VISUAL_PROFILE_BY_WEAPON[type] ?? PROJECTILE_VISUAL_PROFILE_BY_WEAPON.default;
  }

  normalizeProjectileEnemyPair(a, b) {
    let projectile = a;
    let enemy = b;

    if (a instanceof Enemy && !(b instanceof Enemy)) {
      enemy = a;
      projectile = b;
    }

    return { projectile, enemy };
  }

  warnInvalidProjectileCollision(_object) {
    // Intentionally no-op in release build.
  }

  isValidProjectileEnemyCollision(a, b) {
    const { projectile, enemy } = this.normalizeProjectileEnemyPair(a, b);
    const hasProjectileSignature = Boolean(projectile && typeof projectile.getData === "function" && projectile.getData("poolTexture"));
    const valid =
      enemy instanceof Enemy &&
      hasProjectileSignature &&
      !enemy.getData("isDying") &&
      !enemy.isDead?.();
    if (!valid) {
      this.warnInvalidProjectileCollision(enemy);
    }
    return valid;
  }

  preallocateProjectilePool() {
    Object.entries(PROJECTILE_POOL_SIZE_BY_TEXTURE).forEach(([texture, size]) => {
      const freeList = [];
      for (let i = 0; i < size; i += 1) {
        const projectile = this.projectiles.create(-1000, -1000, texture);
        projectile.setData("poolTexture", texture);
        projectile.setData("inProjectilePool", true);
        projectile.setDepth(PROJECTILE_RENDER_DEPTH);
        projectile.setAlpha(0.98);
        projectile.speed = 0;
        projectile.maxDistance = 0;
        projectile.travelled = 0;
        projectile.damage = 0;
        projectile.knockbackForce = 0;
        projectile.behavior = "fast";
        projectile.explosionRadius = 0;
        projectile.explosionDamage = 0;
        projectile.body.setCircle(projectile.displayWidth * 0.45, 0, 0);
        projectile.setScale(PROJECTILE_VISUAL_SCALE, PROJECTILE_VISUAL_SCALE);
        projectile.disableBody(true, true);
        freeList.push(projectile);
      }
      this.projectilePoolByTexture.set(texture, freeList);
    });
  }

  acquireProjectile(texture) {
    const freeList = this.projectilePoolByTexture.get(texture);
    if (!freeList || freeList.length === 0) {
      return null;
    }

    const projectile = freeList.pop();
    projectile.setData("inProjectilePool", false);
    return projectile;
  }

  releaseProjectile(projectile) {
    if (!projectile) {
      return;
    }

    if (projectile.getData("inProjectilePool") === true) {
      return;
    }

    const texture = projectile.getData("poolTexture") ?? projectile.texture.key;
    const freeList = this.projectilePoolByTexture.get(texture);
    if (!freeList) {
      projectile.destroy();
      return;
    }

    projectile.speed = 0;
    projectile.maxDistance = 0;
    projectile.travelled = 0;
    projectile.damage = 0;
    projectile.knockbackForce = 0;
    projectile.behavior = "fast";
    projectile.explosionRadius = 0;
    projectile.explosionDamage = 0;
    projectile.setTint(0xffffff);
    projectile.setScale(PROJECTILE_VISUAL_SCALE, PROJECTILE_VISUAL_SCALE);
    projectile.setRotation(0);
    projectile.setData("visualColor", 0xffffff);
    projectile.setData("glowAlpha", PROJECTILE_GLOW_ALPHA);
    projectile.setData("trailBurst", 1);
    projectile.setData("inProjectilePool", true);
    projectile.disableBody(true, true);
    freeList.push(projectile);
  }

  addGlobalDamagePercent(percent) {
    const safePercent = Number(percent) || 0;
    if (safePercent <= 0) {
      return this.globalDamageMultiplier;
    }

    this.globalDamageMultiplier *= 1 + safePercent;
    return this.globalDamageMultiplier;
  }

  addAttackSpeedPercent(percent) {
    const safePercent = Number(percent) || 0;
    if (safePercent <= 0) {
      return this.globalCooldownMultiplier;
    }

    this.globalCooldownMultiplier = Math.max(0.35, this.globalCooldownMultiplier * (1 - safePercent));
    return this.globalCooldownMultiplier;
  }

  addProjectileCount(amount = 1) {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount <= 0) {
      return this.projectileCount;
    }

    this.projectileCount = Math.min(8, this.projectileCount + safeAmount);
    return this.projectileCount;
  }

  addGlobalRangePercent(percent) {
    const safePercent = Number(percent) || 0;
    if (safePercent <= 0) {
      return this.globalRangeMultiplier;
    }
    this.globalRangeMultiplier *= 1 + safePercent;
    return this.globalRangeMultiplier;
  }

  addGlobalDurationPercent(percent) {
    const safePercent = Number(percent) || 0;
    if (safePercent <= 0) {
      return this.globalDurationMultiplier;
    }
    this.globalDurationMultiplier *= 1 + safePercent;
    return this.globalDurationMultiplier;
  }

  getScaledWeaponDamage(weapon) {
    return Math.max(1, Math.round(weapon.damage * this.globalDamageMultiplier));
  }

  getEffectiveCooldownMs(weapon) {
    return Math.max(90, Math.round(weapon.cooldownMs * this.globalCooldownMultiplier));
  }

  getEffectiveRange(weapon) {
    return Math.round(weapon.range * this.globalRangeMultiplier);
  }

  addWeapon(baseType) {
    const definition = getWeaponDefinition(baseType);
    if (!definition) {
      return false;
    }

    const existing = this.findWeaponByBaseType(baseType);
    if (existing) {
      this.levelUpWeapon(existing);
      this.checkEvolution(existing);
      return false;
    }

    if (this.player.weapons.length >= this.player.maxWeaponSlots) {
      const fallback = this.player.weapons[0];
      if (fallback) {
        this.levelUpWeapon(fallback);
        this.checkEvolution(fallback);
      }
      return false;
    }

    const weapon = this.createWeaponState(baseType, baseType);
    this.player.weapons.push(weapon);
    this.checkEvolution(weapon);
    return true;
  }

  onPassiveAcquired() {
    this.player.weapons.forEach((weapon) => {
      this.checkEvolution(weapon);
    });
  }

  createWeaponState(type, baseType) {
    const definition = getWeaponDefinition(type);
    return {
      type,
      baseType,
      level: 1,
      evolved: Boolean(definition.evolved),
      damage: definition.damage,
      cooldownMs: definition.cooldownMs,
      range: definition.range,
      knockbackForce: definition.knockbackForce,
      projectileBehavior: definition.projectileBehavior,
      projectileSpeed: definition.projectileSpeed ?? 0,
      explosionRadius: definition.explosionRadius ?? 0,
      explosionDamageMultiplier: definition.explosionDamageMultiplier ?? 0,
      orbitBladeCount: definition.orbitBladeCount ?? 0,
      orbitRadius: definition.orbitRadius ?? 0,
      orbitSpeed: definition.orbitSpeed ?? 0,
      orbitAngle: 0,
      orbitSprites: [],
      nextFireAt: 0,
      chainCount: definition.chainCount ?? 0,
      chainRange: definition.chainRange ?? 0,
      chainFalloff: definition.chainFalloff ?? 0,
      scatterCount: definition.scatterCount ?? 0,
      scatterSpreadDeg: definition.scatterSpreadDeg ?? 0,
      homingTurnRate: definition.homingTurnRate ?? 0,
      laserWidth: definition.laserWidth ?? 0,
      laserDurationMs: definition.laserDurationMs ?? 0,
      pierceCount: definition.pierceCount ?? 0,
      boomerangCount: definition.boomerangCount ?? 0,
      boomerangReturnSpeed: definition.boomerangReturnSpeed ?? 0,
      boomerangArcHeight: definition.boomerangArcHeight ?? 0,
      boomerangHitCooldownMs: definition.boomerangHitCooldownMs ?? 0,
      slashAngleDeg: definition.slashAngleDeg ?? 140,
      slashDurationMs: definition.slashDurationMs ?? 280,
      slashWidth: definition.slashWidth ?? 12,
      auraRadius: definition.auraRadius ?? 0,
      auraDamageIntervalMs: definition.auraDamageIntervalMs ?? 800,
      auraKnockback: definition.auraKnockback ?? 0,
      fireRadius: definition.fireRadius ?? 0,
      fireDamagePerTick: definition.fireDamagePerTick ?? 0,
      fireTickIntervalMs: definition.fireTickIntervalMs ?? 0,
      fireDurationMs: definition.fireDurationMs ?? 0,
      gravityRadius: definition.gravityRadius ?? 0,
      gravityForce: definition.gravityForce ?? 0,
      gravityDurationMs: definition.gravityDurationMs ?? 0,
      auraLastDamageAt: 0,
      slashActive: false,
      slashStartAt: 0,
      boomerangProjectiles: []
    };
  }

  levelUpWeapon(weapon) {
    weapon.level += 1;

    if (weapon.type === "orbit_blades") {
      weapon.damage = Math.round(weapon.damage * 1.15);
      weapon.cooldownMs = Math.max(120, Math.floor(weapon.cooldownMs * 0.94));
      weapon.orbitBladeCount = Math.min(5, 3 + Math.floor((weapon.level - 5) / 2));
      return;
    }

    weapon.damage = Math.round(weapon.damage * 1.16);
    weapon.cooldownMs = Math.max(170, Math.floor(weapon.cooldownMs * 0.92));
    weapon.range = Math.round(weapon.range * 1.03);

    if (weapon.type === "fireball" || weapon.type === "meteor") {
      weapon.explosionRadius = Math.round(Math.max(weapon.explosionRadius, 40) * 1.05);
    }
    if (weapon.type === "boomerang" || weapon.type === "death_spiral") {
      weapon.boomerangCount = Math.min(6, (weapon.boomerangCount || 2) + 1);
    }
    if (weapon.type === "slash" || weapon.type === "cyclone_slash") {
      weapon.slashWidth = Math.min(24, (weapon.slashWidth || 12) + 2);
    }
    if (weapon.type === "garlic_aura" || weapon.type === "holy_aura") {
      weapon.auraRadius = Math.round((weapon.auraRadius || 90) * 1.06);
    }
    if (weapon.type === "molotov" || weapon.type === "inferno") {
      weapon.fireRadius = Math.round((weapon.fireRadius || 64) * 1.08);
      weapon.fireDamagePerTick = Math.round((weapon.fireDamagePerTick || 5) * 1.12);
    }
    if (weapon.type === "gravity_well" || weapon.type === "singularity") {
      weapon.gravityRadius = Math.round((weapon.gravityRadius || 120) * 1.06);
      weapon.gravityForce = Math.round((weapon.gravityForce || 80) * 1.08);
    }
  }

  checkEvolution(weapon) {
    if (weapon.evolved) {
      return false;
    }

    const rule = WEAPON_EVOLUTION_RULES.find((entry) => entry.weapon === weapon.baseType);
    if (!rule) {
      return false;
    }

    if (weapon.level < rule.level) {
      return false;
    }

    if (!this.player.hasPassive(rule.requiredPassive)) {
      return false;
    }

    this.applyEvolution(weapon, rule.evolution);
    return true;
  }

  applyEvolution(weapon, evolutionType) {
    const evolved = getWeaponDefinition(evolutionType);
    if (!evolved) {
      return;
    }

    weapon.type = evolutionType;
    weapon.evolved = true;
    weapon.projectileBehavior = evolved.projectileBehavior;
    weapon.damage = Math.max(Math.round(weapon.damage * 1.5), evolved.damage);
    weapon.cooldownMs = evolved.cooldownMs;
    weapon.range = Math.max(weapon.range, evolved.range);
    weapon.knockbackForce = evolved.knockbackForce;
    weapon.projectileSpeed = evolved.projectileSpeed;
    weapon.explosionRadius = evolved.explosionRadius ?? 0;
    weapon.explosionDamageMultiplier = evolved.explosionDamageMultiplier ?? 0;
    weapon.orbitBladeCount = evolved.orbitBladeCount ?? 0;
    weapon.orbitRadius = evolved.orbitRadius ?? 0;
    weapon.orbitSpeed = evolved.orbitSpeed ?? 0;
    weapon.chainCount = evolved.chainCount ?? 0;
    weapon.chainRange = evolved.chainRange ?? 0;
    weapon.chainFalloff = evolved.chainFalloff ?? 0;
    weapon.scatterCount = evolved.scatterCount ?? 0;
    weapon.scatterSpreadDeg = evolved.scatterSpreadDeg ?? 0;
    weapon.homingTurnRate = evolved.homingTurnRate ?? 0;
    weapon.laserWidth = evolved.laserWidth ?? 0;
    weapon.laserDurationMs = evolved.laserDurationMs ?? 0;
    weapon.pierceCount = evolved.pierceCount ?? 0;
    weapon.boomerangCount = evolved.boomerangCount ?? 0;
    weapon.boomerangReturnSpeed = evolved.boomerangReturnSpeed ?? 0;
    weapon.boomerangArcHeight = evolved.boomerangArcHeight ?? 0;
    weapon.boomerangHitCooldownMs = evolved.boomerangHitCooldownMs ?? 0;
    weapon.slashAngleDeg = evolved.slashAngleDeg ?? 140;
    weapon.slashDurationMs = evolved.slashDurationMs ?? 280;
    weapon.slashWidth = evolved.slashWidth ?? 12;
    weapon.auraRadius = evolved.auraRadius ?? 0;
    weapon.auraDamageIntervalMs = evolved.auraDamageIntervalMs ?? 800;
    weapon.auraKnockback = evolved.auraKnockback ?? 0;
    weapon.fireRadius = evolved.fireRadius ?? 0;
    weapon.fireDamagePerTick = evolved.fireDamagePerTick ?? 0;
    weapon.fireTickIntervalMs = evolved.fireTickIntervalMs ?? 0;
    weapon.fireDurationMs = evolved.fireDurationMs ?? 0;
    weapon.gravityRadius = evolved.gravityRadius ?? 0;
    weapon.gravityForce = evolved.gravityForce ?? 0;
    weapon.gravityDurationMs = evolved.gravityDurationMs ?? 0;
    weapon.nextFireAt = 0;

    if (weapon.type === "orbit_blades") {
      this.rebuildOrbitBlades(weapon);
    }

    if (this.scene.showHudAlert) {
      this.scene.showHudAlert(`${weapon.baseType.toUpperCase()} EVOLVED`, 1800);
    }
    if (this.scene.playWeaponEvolutionFeedback) {
      this.scene.playWeaponEvolutionFeedback(weapon);
    }
  }

  update(time, delta) {
    if (this.paused) {
      return;
    }
    this.updateProjectiles(delta);
    this.updateOrbitBlades(time, delta);
    this.updateSlashes(time, delta);
    this.updateAuras(time, delta);
    this.updateBoomerangs(time, delta);
    this.updateGravityWells(time, delta);
    this.updateFireZones(time, delta);

    this.player.weapons.forEach((weapon) => {
      if (weapon.type === "orbit_blades") {
        this.ensureOrbitBlades(weapon);
        return;
      }
      if (AURA_WEAPON_TYPES.includes(weapon.type)) {
        return;
      }
      if (SLASH_WEAPON_TYPES.includes(weapon.type) && weapon.slashActive) {
        return;
      }

      if (time < weapon.nextFireAt) {
        return;
      }

      const fired = this.fireWeapon(weapon);
      if (fired) {
        weapon.nextFireAt = time + this.getEffectiveCooldownMs(weapon);
      }
    });
  }

  updateProjectiles(delta) {
    this.projectileGlowGraphics?.clear();
    this.projectileTrailRectsGraphics?.clear();
    for (let i = this.projectileTrailRects.length - 1; i >= 0; i -= 1) {
      const segment = this.projectileTrailRects[i];
      segment.life -= delta;
      if (segment.life <= 0) {
        this.projectileTrailRects.splice(i, 1);
        continue;
      }

      const alpha = Phaser.Math.Clamp(segment.life / segment.maxLife, 0, 1) * 0.42;
      this.projectileTrailRectsGraphics?.fillStyle(segment.color, alpha);
      this.projectileTrailRectsGraphics?.fillRect(
        Math.round(segment.x) - 2,
        Math.round(segment.y) - 1,
        4,
        3
      );
    }
    this.projectileTrailAccumulatorMs += delta;
    const shouldEmitTrail = this.projectileTrailAccumulatorMs >= 16;
    if (shouldEmitTrail) {
      this.projectileTrailAccumulatorMs = 0;
    }

    this.projectiles.getChildren().forEach((projectile) => {
      if (!projectile.active) {
        return;
      }

      const glowColor = projectile.getData("visualColor") ?? 0xffffff;
      const glowAlpha = projectile.getData("glowAlpha") ?? PROJECTILE_GLOW_ALPHA;
      const glowRadius = Math.max(3, projectile.displayWidth * 0.42);
      this.projectileGlowGraphics?.lineStyle(2, glowColor, glowAlpha);
      this.projectileGlowGraphics?.strokeCircle(projectile.x, projectile.y, glowRadius);
      if (shouldEmitTrail && this.projectileTrailEmitter) {
        const trailBurst = Math.max(1, Math.min(3, Math.floor(projectile.getData("trailBurst") ?? 1)));
        if (typeof this.projectileTrailEmitter.setTint === "function") {
          this.projectileTrailEmitter.setTint(glowColor);
        } else if (typeof this.projectileTrailEmitter.setParticleTint === "function") {
          this.projectileTrailEmitter.setParticleTint(glowColor);
        }

        if (typeof this.projectileTrailEmitter.emitParticleAt === "function") {
          this.projectileTrailEmitter.emitParticleAt(projectile.x, projectile.y, trailBurst);
        } else if (typeof this.projectileTrailEmitter.explode === "function") {
          this.projectileTrailEmitter.explode(trailBurst, projectile.x, projectile.y);
        }
      }
      if (shouldEmitTrail) {
        const vx = projectile.body?.velocity?.x ?? 0;
        const vy = projectile.body?.velocity?.y ?? 0;
        const trailX = projectile.x - vx * 0.012;
        const trailY = projectile.y - vy * 0.012;
        this.projectileTrailRects.push({
          x: trailX,
          y: trailY,
          color: glowColor,
          life: PROJECTILE_RECT_TRAIL_LIFETIME_MS,
          maxLife: PROJECTILE_RECT_TRAIL_LIFETIME_MS
        });
        if (this.projectileTrailRects.length > PROJECTILE_RECT_TRAIL_MAX) {
          this.projectileTrailRects.shift();
        }
      }

      // Homing behavior
      if (projectile.behavior === "homing" && projectile.homingTarget && projectile.homingTarget.active && !projectile.homingTarget.getData("isDying")) {
        const targetX = projectile.homingTarget.x;
        const targetY = projectile.homingTarget.y;
        const dx = targetX - projectile.x;
        const dy = targetY - projectile.y;
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(projectile.body.velocity.y, projectile.body.velocity.x);
        let angleDiff = targetAngle - currentAngle;
        // Normalize to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        const turnRate = projectile.homingTurnRate * (delta / 16);
        const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate);
        projectile.body.setVelocity(
          Math.cos(newAngle) * projectile.speed,
          Math.sin(newAngle) * projectile.speed
        );
        projectile.setRotation(newAngle);
      }

      projectile.travelled += (projectile.speed * delta) / 1000;
      if (projectile.travelled >= projectile.maxDistance) {
        this.releaseProjectile(projectile);
      }
    });
  }

  updateOrbitBlades(_time, delta) {
    this.player.weapons.forEach((weapon) => {
      if (weapon.type !== "orbit_blades") {
        return;
      }

      this.ensureOrbitBlades(weapon);

      weapon.orbitAngle += weapon.orbitSpeed * delta;
      const count = weapon.orbitSprites.length;
      for (let i = 0; i < count; i += 1) {
        const blade = weapon.orbitSprites[i];
        if (!blade.active) {
          continue;
        }

        const theta = weapon.orbitAngle + (Math.PI * 2 * i) / count;
        blade.x = this.player.x + Math.cos(theta) * weapon.orbitRadius;
        blade.y = this.player.y + Math.sin(theta) * weapon.orbitRadius;
        blade.setData("damage", this.getScaledWeaponDamage(weapon));
        blade.setData("knockbackForce", weapon.knockbackForce);
      }
    });
  }

  ensureOrbitBlades(weapon) {
    const targetCount = Math.max(1, weapon.orbitBladeCount || 3);
    if (weapon.orbitSprites.length !== targetCount || weapon.orbitSprites.some((blade) => !blade.active)) {
      this.rebuildOrbitBlades(weapon);
    }
  }

  rebuildOrbitBlades(weapon) {
    weapon.orbitSprites.forEach((blade) => blade.destroy());
    weapon.orbitSprites = [];

    const count = Math.max(1, weapon.orbitBladeCount || 3);
    for (let i = 0; i < count; i += 1) {
      const blade = this.orbitBlades.create(this.player.x, this.player.y, "proj_orbit_blade");
      blade.body.setCircle(blade.displayWidth * 0.48, 0, 0);
      blade.setDepth(PROJECTILE_RENDER_DEPTH);
      blade.setAlpha(0.96);
      blade.setData("weaponBaseType", weapon.baseType);
      blade.setData("orbitHitKey", `orbit_hit_${weapon.baseType}`);
      blade.setData("damage", this.getScaledWeaponDamage(weapon));
      blade.setData("knockbackForce", weapon.knockbackForce);
      weapon.orbitSprites.push(blade);
    }
  }

  rotateDirection(x, y, radians) {
    if (radians === 0) {
      return { x, y };
    }

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos
    };
  }

  fireProjectileWeapon(weapon, spreadDeg) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) {
      return false;
    }

    const baseDirection = {
      x: target.x - this.player.x,
      y: target.y - this.player.y
    };
    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const explosionDamage =
      weapon.explosionDamageMultiplier && weapon.explosionDamageMultiplier > 0
        ? Math.round(scaledDamage * weapon.explosionDamageMultiplier)
        : 0;

    const count = Math.max(1, this.projectileCount);
    const center = (count - 1) / 2;
    const spreadRad = Phaser.Math.DegToRad(spreadDeg);

    let fired = false;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - center) * spreadRad;
      const direction = this.rotateDirection(baseDirection.x, baseDirection.y, offset);
      const didFire = this.spawnProjectile(weapon.type, { x: this.player.x, y: this.player.y }, direction, {
        speed: weapon.projectileSpeed,
        maxDistance: effectiveRange,
        damage: scaledDamage,
        knockbackForce: weapon.knockbackForce,
        behavior: weapon.projectileBehavior,
        explosionRadius: weapon.explosionRadius,
        explosionDamage
      });
      fired = fired || didFire;
    }

    return fired;
  }

  fireWeapon(weapon) {
    let fired = false;
    if (weapon.type === "dagger") {
      fired = this.fireDagger(weapon);
    } else if (weapon.type === "fireball") {
      fired = this.fireFireball(weapon);
    } else if (weapon.type === "meteor") {
      fired = this.fireMeteor(weapon);
    } else if (weapon.type === "lightning" || weapon.type === "thunderstorm") {
      fired = this.fireLightning(weapon);
    } else if (weapon.type === "scatter_shot" || weapon.type === "gatling") {
      fired = this.fireScatterShot(weapon);
    } else if (weapon.type === "homing_missile" || weapon.type === "mega_missile") {
      fired = this.fireHomingMissile(weapon);
    } else if (weapon.type === "laser" || weapon.type === "prismatic_laser") {
      fired = this.fireLaser(weapon);
    } else if (BOOMERANG_WEAPON_TYPES.includes(weapon.type)) {
      fired = this.fireBoomerang(weapon);
    } else if (SLASH_WEAPON_TYPES.includes(weapon.type)) {
      fired = this.fireSlash(weapon);
    } else if (AURA_WEAPON_TYPES.includes(weapon.type)) {
      fired = this.fireAura(weapon);
    } else if (MOLOTOV_WEAPON_TYPES.includes(weapon.type)) {
      fired = this.fireMolotov(weapon);
    } else if (GRAVITY_WEAPON_TYPES.includes(weapon.type)) {
      fired = this.fireGravityWell(weapon);
    }

    if (fired && this.scene?.playWeaponFireFeedback) {
      this.scene.playWeaponFireFeedback(this.player.x, this.player.y, weapon.type);
    }
    return fired;
  }

  fireDagger(weapon) {
    return this.fireProjectileWeapon(weapon, 10);
  }

  fireFireball(weapon) {
    return this.fireProjectileWeapon(weapon, 8);
  }

  fireMeteor(weapon) {
    return this.fireProjectileWeapon(weapon, 6);
  }

  fireLightning(weapon) {
    const hitEnemies = [];
    const maxJumps = weapon.chainCount || 3;
    const jumpRange = weapon.chainRange || 175;
    const noFalloff = weapon.chainFalloff === 1.0;

    let currentTarget = this.findNearestEnemy(this.player.x, this.player.y, this.getEffectiveRange(weapon));
    if (!currentTarget) {
      return false;
    }

    let sourceX = this.player.x;
    let sourceY = this.player.y;

    const isEvolved = weapon.evolved;
    const baseColor = isEvolved ? 0xffee88 : 0xc1f6ff;
    const outerColor = isEvolved ? 0xffcc44 : 0x74d8ff;
    const fillColor = isEvolved ? 0xffffcc : 0xd8fbff;

    const gfx = this.scene.add.graphics().setDepth(PROJECTILE_EFFECT_DEPTH);

    for (let i = 0; i < maxJumps && currentTarget; i += 1) {
      const segmentFalloff = 1 - i * 0.22;
      const coreAlpha = Phaser.Math.Clamp(0.95 * segmentFalloff, 0.35, 0.95);
      const outerAlpha = Phaser.Math.Clamp(0.62 * segmentFalloff, 0.2, 0.62);
      const lineWidth = Phaser.Math.Linear(4.2, 2.2, i / Math.max(1, maxJumps - 1));

      gfx.lineStyle(lineWidth, baseColor, coreAlpha);
      gfx.lineBetween(sourceX, sourceY, currentTarget.x, currentTarget.y);
      gfx.lineStyle(Math.max(1.4, lineWidth * 0.52), outerColor, outerAlpha);
      gfx.lineBetween(sourceX, sourceY, currentTarget.x, currentTarget.y);
      gfx.fillStyle(fillColor, Phaser.Math.Clamp(0.6 * segmentFalloff, 0.24, 0.6));
      gfx.fillCircle(currentTarget.x, currentTarget.y, Math.max(3, 7 - i));

      const falloff = noFalloff ? 1 : (i === 0 ? 1 : i === 1 ? 0.8 : 0.65);
      const scaledDamage = this.getScaledWeaponDamage(weapon);
      this.applyDamage(currentTarget, Math.round(scaledDamage * falloff), weapon.knockbackForce, sourceX, sourceY, weapon.type);
      hitEnemies.push(currentTarget);

      sourceX = currentTarget.x;
      sourceY = currentTarget.y;
      currentTarget = this.findNearestEnemy(sourceX, sourceY, jumpRange, new Set(hitEnemies));
    }

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 120,
      onComplete: () => gfx.destroy()
    });

    return true;
  }

  fireScatterShot(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) {
      return false;
    }

    const baseDirection = {
      x: target.x - this.player.x,
      y: target.y - this.player.y
    };
    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const count = Math.max(1, weapon.scatterCount || 5);
    const spreadDeg = weapon.scatterSpreadDeg || 45;
    const spreadRad = Phaser.Math.DegToRad(spreadDeg);
    const center = (count - 1) / 2;

    let fired = false;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - center) * (spreadRad / count);
      const direction = this.rotateDirection(baseDirection.x, baseDirection.y, offset);
      const didFire = this.spawnProjectile(weapon.type, { x: this.player.x, y: this.player.y }, direction, {
        speed: weapon.projectileSpeed,
        maxDistance: effectiveRange,
        damage: scaledDamage,
        knockbackForce: weapon.knockbackForce,
        behavior: weapon.projectileBehavior
      });
      fired = fired || didFire;
    }

    return fired;
  }

  fireHomingMissile(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) {
      return false;
    }

    const direction = {
      x: target.x - this.player.x,
      y: target.y - this.player.y
    };
    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const count = Math.max(1, this.projectileCount);

    let fired = false;
    for (let i = 0; i < count; i += 1) {
      const angleOffset = (i - (count - 1) / 2) * 0.2;
      const dir = this.rotateDirection(direction.x, direction.y, angleOffset);
      const didFire = this.spawnProjectile(weapon.type, { x: this.player.x, y: this.player.y }, dir, {
        speed: weapon.projectileSpeed,
        maxDistance: effectiveRange,
        damage: scaledDamage,
        knockbackForce: weapon.knockbackForce,
        behavior: "homing",
        homingTurnRate: weapon.homingTurnRate || 0.06,
        targetEnemy: target
      });
      fired = fired || didFire;
    }

    return fired;
  }

  fireLaser(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) {
      return false;
    }

    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const pierceCount = Math.max(1, weapon.pierceCount || 1);
    const beamWidth = weapon.laserWidth || 4;
    const durationMs = weapon.laserDurationMs || 180;

    // Direction from player to target
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.001 ? dx / dist : 1;
    const ny = dist > 0.001 ? dy / dist : 0;

    // Find enemies in a line
    const hitEnemies = [];
    const beamEndX = this.player.x + nx * effectiveRange;
    const beamEndY = this.player.y + ny * effectiveRange;

    // Collect all enemies in range and sort by distance
    const enemiesInRange = [];
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.hp <= 0 || enemy.getData("isDying")) {
        return;
      }
      const ex = enemy.x - this.player.x;
      const ey = enemy.y - this.player.y;
      // Project onto beam direction
      const proj = ex * nx + ey * ny;
      if (proj < 0 || proj > effectiveRange) {
        return;
      }
      // Perpendicular distance
      const perp = Math.abs(ex * ny - ey * nx);
      const hitRadius = (enemy.body?.radius || 14) + beamWidth;
      if (perp <= hitRadius) {
        enemiesInRange.push({ enemy, dist: proj });
      }
    });
    enemiesInRange.sort((a, b) => a.dist - b.dist);

    const count = Math.min(pierceCount, enemiesInRange.length);
    for (let i = 0; i < count; i++) {
      const { enemy } = enemiesInRange[i];
      const falloff = i === 0 ? 1 : 0.7;
      this.applyDamage(enemy, Math.round(scaledDamage * falloff), weapon.knockbackForce, this.player.x, this.player.y, weapon.type);
      hitEnemies.push(enemy);
    }

    // Draw beam visual
    this.drawLaserBeam(this.player.x, this.player.y, beamEndX, beamEndY, beamWidth, durationMs, hitEnemies.length > 0);

    return hitEnemies.length > 0;
  }

  drawLaserBeam(x1, y1, x2, y2, width, durationMs, hit) {
    const gfx = this.scene.add.graphics().setDepth(31);
    // Core beam
    gfx.lineStyle(width + 2, 0xff2222, 0.4);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(width, 0xff6644, 0.7);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(width - 1, 0xffccaa, 0.95);
    gfx.lineBetween(x1, y1, x2, y2);

    // Hit flash at impact
    if (hit) {
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(x2, y2, width * 2);
    }

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: durationMs,
      onComplete: () => gfx.destroy()
    });
  }

  spawnProjectile(type, position, direction, config = {}) {
    const texture = PROJECTILE_TEXTURE_BY_WEAPON[type];
    if (!texture) {
      return false;
    }

    const projectile = this.acquireProjectile(texture);
    if (!projectile) {
      return false;
    }

    const dx = direction.x ?? 0;
    const dy = direction.y ?? 0;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.0001 ? dx / dist : 1;
    const ny = dist > 0.0001 ? dy / dist : 0;

    projectile.speed = config.speed;
    projectile.maxDistance = config.maxDistance;
    projectile.travelled = 0;
    projectile.damage = config.damage;
    projectile.knockbackForce = config.knockbackForce;
    projectile.weaponType = type;
    projectile.behavior = config.behavior;
    projectile.explosionRadius = config.explosionRadius ?? 0;
    projectile.explosionDamage = config.explosionDamage ?? 0;
    projectile.homingTurnRate = config.homingTurnRate ?? 0;
    projectile.homingTarget = config.targetEnemy ?? null;
    const visualProfile = this.getProjectileVisualProfile(type);
    const visualColor = this.getProjectileVisualColor(type);
    projectile.setTint(visualColor);
    projectile.setData("visualColor", visualColor);
    projectile.setData("glowAlpha", visualProfile.glowAlpha);
    projectile.setData("trailBurst", visualProfile.trailBurst);
    projectile.setScale(visualProfile.scaleX, visualProfile.scaleY);
    if (type === "dagger") {
      projectile.setRotation(Math.atan2(ny, nx));
    } else {
      projectile.setRotation(0);
    }

    projectile.enableBody(true, position.x, position.y, true, true);
    projectile.body.setVelocity(nx * config.speed, ny * config.speed);
    return true;
  }

  handleProjectileHit(projectile, enemy) {
    const { projectile: hitProjectile, enemy: hitEnemy } = this.normalizeProjectileEnemyPair(projectile, enemy);

    if (!(hitEnemy instanceof Enemy)) {
      this.warnInvalidProjectileCollision(hitEnemy);
      return;
    }

    if (!hitProjectile || !hitEnemy || !hitProjectile.active || !hitEnemy.active) {
      return;
    }

    const hitX = hitProjectile.x;
    const hitY = hitProjectile.y;
    const explosionRadius = hitProjectile.explosionRadius;
    const explosionDamage = hitProjectile.explosionDamage;
    const behavior = hitProjectile.behavior;

    this.applyDamage(hitEnemy, hitProjectile.damage, hitProjectile.knockbackForce, hitX, hitY, hitProjectile.weaponType);

    if (behavior === "explosion" || behavior === "meteor_explosion") {
      this.triggerExplosion(hitX, hitY, explosionRadius, explosionDamage);
    }

    if (hitProjectile.getData("isMolotiv")) {
      this.triggerFireZone(hitX, hitY, hitProjectile);
    }

    if (hitProjectile.getData("isGravityWell")) {
      this.triggerGravityWell(hitX, hitY, hitProjectile);
    }

    if (hitProjectile.getData("isGrenade")) {
      this.triggerGrenadeExplosion(hitX, hitY, hitProjectile);
    }

    this.releaseProjectile(hitProjectile);
  }

  handleOrbitBladeHit(blade, enemy) {
    if (!blade?.active || !enemy?.active || !(enemy instanceof Enemy)) {
      return;
    }

    const hitKey = blade.getData("orbitHitKey");
    const now = this.scene.time.now;
    const nextHitAt = enemy.getData(hitKey) || 0;
    if (now < nextHitAt) {
      return;
    }
    enemy.setData(hitKey, now + 120);

    let damage = Math.max(6, Math.round((blade.getData("damage") || 10) * 0.48));
    // Apply melee damage multiplier from fighter passives
    const meleeMultiplier = this.player.meleeDamageMultiplier || 1;
    damage = Math.round(damage * meleeMultiplier);
    const knockback = Math.max(40, Math.round((blade.getData("knockbackForce") || 90) * 0.62));
    this.applyDamage(enemy, damage, knockback, this.player.x, this.player.y, "orbit_blades");
  }

  triggerExplosion(x, y, radius, damage) {
    const safeRadius = Number.isFinite(radius) ? radius : 0;
    if (safeRadius <= 0) {
      return;
    }
    const safeDamage = Number.isFinite(damage) ? damage : 0;

    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffb169, 0.6);
    gfx.fillCircle(x, y, safeRadius);
    gfx.lineStyle(2, 0xffd8a8, 0.82);
    gfx.strokeCircle(x, y, safeRadius * 0.88);
    gfx.lineStyle(1.5, 0xfff0cc, 0.64);
    gfx.strokeCircle(x, y, safeRadius * 0.56);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 150,
      onComplete: () => gfx.destroy()
    });

    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) {
        return;
      }

      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > safeRadius) {
        return;
      }

      this.applyDamage(enemy, safeDamage, 120, x, y);
    });
  }

  triggerFireZone(x, y, projectile) {
    const radius = projectile.getData("fireRadius") ?? 64;
    const damagePerTick = projectile.getData("fireDamagePerTick") ?? 5;
    const tickIntervalMs = projectile.getData("fireTickIntervalMs") ?? 500;
    const durationMs = projectile.getData("fireDurationMs") ?? 3000;
    const weaponType = projectile.weaponType ?? "molotov";

    const gfx = this.scene.add.graphics().setDepth(9);
    this.activeFireZones = this.activeFireZones || [];
    this.activeFireZones.push({
      x,
      y,
      radius,
      damagePerTick,
      tickIntervalMs,
      durationMs,
      elapsedMs: 0,
      lastTickMs: 0,
      weaponType,
      gfx
    });
  }

  triggerGravityWell(x, y, projectile) {
    const radius = projectile.getData("gravityRadius") ?? 120;
    const force = projectile.getData("gravityForce") ?? 80;
    const durationMs = projectile.getData("gravityDurationMs") ?? 2500;
    const weaponType = projectile.weaponType ?? "gravity_well";
    const damage = Math.max(1, Math.round((projectile.damage ?? 8) * 0.3));

    const gfx = this.scene.add.graphics().setDepth(9);
    this.activeGravityWells = this.activeGravityWells || [];
    this.activeGravityWells.push({
      x,
      y,
      radius,
      force,
      durationMs,
      elapsedMs: 0,
      damage,
      weaponType,
      gfx,
      lastDamageAt: 0
    });
  }

  triggerGrenadeExplosion(x, y, projectile) {
    const radius = projectile.getData("grenadeRadius") ?? 100;
    const damage = projectile.getData("grenadeDamage") ?? 35;

    const gfx = this.scene.add.graphics().setDepth(PROJECTILE_EFFECT_DEPTH);
    gfx.fillStyle(0xff4422, 0.6);
    gfx.fillCircle(x, y, radius);
    gfx.lineStyle(3, 0xff8844, 0.8);
    gfx.strokeCircle(x, y, radius * 0.8);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 200,
      onComplete: () => gfx.destroy()
    });

    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.getData("isDying")) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > radius) return;
      const falloff = 1 - (dist / radius) * 0.5;
      this.applyDamage(enemy, Math.round(damage * falloff), 140, x, y);
    });
  }

  applyDamage(enemy, damage, knockbackForce, sourceX, sourceY, sourceWeaponType) {
    // Non-host clients send damage events to the host instead of applying locally.
    // The host applies damage, syncs enemy HP, and sends kill events.
    if (this.scene.gameMode === "coop" && !this.scene.isHost) {
      if (enemy?.serverId && enemy.active && !enemy.getData("isDying")) {
        this.scene.networkManager?.sendEnemyDamage(
          enemy.serverId,
          Number.isFinite(damage) ? damage : 0,
          sourceWeaponType
        );
      }
      return;
    }

    if (!(enemy instanceof Enemy) || !enemy.active) {
      this.warnInvalidProjectileCollision(enemy);
      return;
    }
    if (enemy.getData("isDying") || enemy.isDead?.()) {
      return;
    }

    const safeDamage = Number.isFinite(damage) ? damage : 0;
    const safeKnockback = Number.isFinite(knockbackForce) ? knockbackForce : 0;
    enemy?.takeDamage(safeDamage);
    if (this.scene.spawnWeaponHitParticles) {
      this.scene.spawnWeaponHitParticles(enemy.x, enemy.y, 3);
    }
    enemy?.applyKnockbackFrom(sourceX, sourceY, safeKnockback);

    // Apply status effects from weapon
    if (sourceWeaponType && this.scene.statusEffectSystem) {
      this.scene.statusEffectSystem.tryApplyFromWeapon(enemy, sourceWeaponType);
    }

    if (!enemy.isDead()) {
      return;
    }

    if (this.scene.handleEnemyDefeat) {
      this.scene.handleEnemyDefeat(enemy);
      return;
    }

    this.scene.spawnXpOrb(enemy.x, enemy.y, enemy.xpValue);
    enemy?.destroy?.();
  }

  findNearestEnemy(fromX, fromY, range, excluded = null) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) {
        return;
      }
      if (enemy.getData("isDying") || enemy.isDead?.()) {
        return;
      }
      if (excluded && excluded.has(enemy)) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(fromX, fromY, enemy.x, enemy.y);
      if (distance > range || distance >= nearestDistance) {
        return;
      }

      nearestDistance = distance;
      nearest = enemy;
    });

    return nearest;
  }

  fireSlash(weapon) {
    const target = this.findNearestEnemy(this.player.x, this.player.y, this.getEffectiveRange(weapon) + 40);
    if (!target) {
      return false;
    }

    if (weapon.slashActive) {
      return false;
    }

    weapon.slashActive = true;
    weapon.slashStartAt = this.scene.time.now;
    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const slashAngle = Phaser.Math.DegToRad(weapon.slashAngleDeg ?? 140);
    const slashWidth = weapon.slashWidth ?? 12;
    const slashRange = this.getEffectiveRange(weapon);
    const slashDuration = weapon.slashDurationMs ?? 280;
    const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);

    const gfx = this.scene.add.graphics().setDepth(PROJECTILE_EFFECT_DEPTH);
    const startTime = weapon.slashStartAt;
    const player = this.player;
    const halfAngle = slashAngle / 2;
    const hitSet = new Set();

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: slashDuration,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const sweepProgress = progress;
        gfx.clear();
        const currentAngle = baseAngle - halfAngle + slashAngle * (sweepProgress < 0.5 ? sweepProgress * 2 : 1 - (sweepProgress - 0.5) * 2);
        const scaleEase = progress < 0.5 ? progress * 2 : 1;
        const arcStart = currentAngle - halfAngle * 0.3;
        const arcEnd = currentAngle + halfAngle * 0.3;

        gfx.lineStyle(slashWidth * scaleEase, 0xffffff, 0.8);
        gfx.lineStyle(Math.max(2, slashWidth * 0.6 * scaleEase), 0xffddaa, 0.9);

        for (let a = arcStart; a <= arcEnd; a += 0.15) {
          const endX = player.x + Math.cos(a) * slashRange * scaleEase;
          const endY = player.y + Math.sin(a) * slashRange * scaleEase;
          gfx.lineBetween(player.x, player.y, endX, endY);
        }

        gfx.fillStyle(0xffffff, 0.3 * scaleEase);
        gfx.slice(player.x, player.y, slashRange * scaleEase, arcStart, arcEnd, false);
        gfx.fillPath();

        this.scene.enemies.getChildren().forEach((enemy) => {
          if (!enemy?.active || enemy.getData("isDying") || enemy.isDead?.()) return;
          if (hitSet.has(enemy)) return;
          const ex = enemy.x - player.x;
          const ey = enemy.y - player.y;
          const proj = ex * Math.cos(currentAngle) + ey * Math.sin(currentAngle);
          if (proj < 0 || proj > slashRange) return;
          const perp = Math.abs(-ex * Math.sin(currentAngle) + ey * Math.cos(currentAngle));
          const hitRadius = (enemy.body?.radius || 14) + slashWidth;
          if (perp <= hitRadius) {
            hitSet.add(enemy);
            this.applyDamage(enemy, Math.round(scaledDamage * (progress < 0.5 ? 1 : 0.7)), weapon.knockbackForce, player.x, player.y, weapon.type);
          }
        });
      },
      onComplete: () => {
        gfx.destroy();
        weapon.slashActive = false;
      }
    });

    return true;
  }

  updateSlashes(time, delta) {
  }

  fireAura(weapon) {
    return true;
  }

  updateAuras(time, delta) {
    this.player.weapons.forEach((weapon) => {
      if (!AURA_WEAPON_TYPES.includes(weapon.type)) return;
      if (time < (weapon.auraLastDamageAt ?? 0) + (weapon.auraDamageIntervalMs ?? 800)) return;

      const auraRadius = weapon.auraRadius ?? 90;
      const scaledDamage = this.getScaledWeaponDamage(weapon);
      const auraDamage = Math.max(1, Math.round(scaledDamage * 0.3));
      const knockback = weapon.auraKnockback ?? 60;

      this.scene.enemies.getChildren().forEach((enemy) => {
        if (!enemy?.active || enemy.getData("isDying") || enemy.isDead?.()) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (dist <= auraRadius) {
          this.applyDamage(enemy, auraDamage, knockback, this.player.x, this.player.y, weapon.type);
        }
      });

      weapon.auraLastDamageAt = time;

      const auraGfx = this.scene.add.graphics().setDepth(9);
      const auraColor = weapon.type === "holy_aura" ? 0xaaddff : 0xaaffaa;
      auraGfx.lineStyle(2, auraColor, 0.4);
      auraGfx.strokeCircle(this.player.x, this.player.y, auraRadius);
      auraGfx.fillStyle(auraColor, 0.08);
      auraGfx.fillCircle(this.player.x, this.player.y, auraRadius);
      this.scene.tweens.add({
        targets: auraGfx,
        alpha: 0,
        duration: 300,
        onComplete: () => auraGfx.destroy()
      });
    });
  }

  fireBoomerang(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) return false;

    const count = weapon.boomerangCount ?? 2;
    const scaledDamage = this.getScaledWeaponDamage(weapon);
    const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    let fired = false;

    for (let i = 0; i < count; i++) {
      const angleOffset = count > 1 ? (i - (count - 1) / 2) * 0.4 : 0;
      const throwAngle = baseAngle + angleOffset;

      const boomerangObj = {
        x: this.player.x,
        y: this.player.y,
        targetX: target.x,
        targetY: target.y,
        originX: this.player.x,
        originY: this.player.y,
        angle: throwAngle,
        speed: weapon.projectileSpeed ?? 280,
        returnSpeed: weapon.boomerangReturnSpeed ?? 320,
        arcHeight: weapon.boomerangArcHeight ?? 120,
        damage: scaledDamage,
        knockbackForce: weapon.knockbackForce,
        progress: 0,
        phase: "out",
        hitCooldowns: new Map(),
        weaponType: weapon.type,
        gfx: null
      };

      weapon.boomerangProjectiles = weapon.boomerangProjectiles || [];
      weapon.boomerangProjectiles.push(boomerangObj);
      fired = true;
    }

    if (this.scene.playSfx) {
      this.scene.playSfx("slash");
    }
    return fired;
  }

  updateBoomerangs(time, delta) {
    this.player.weapons.forEach((weapon) => {
      if (!BOOMERANG_WEAPON_TYPES.includes(weapon.type)) return;
      weapon.boomerangProjectiles = weapon.boomerangProjectiles || [];

      for (let i = weapon.boomerangProjectiles.length - 1; i >= 0; i--) {
        const b = weapon.boomerangProjectiles[i];
        const dt = delta / 1000;
        const dist = Math.hypot(b.targetX - b.originX, b.targetY - b.originY);
        const totalDist = dist * 0.7;

        if (b.phase === "out") {
          b.progress += (b.speed * dt) / Math.max(1, totalDist);
          if (b.progress >= 1) {
            b.phase = "return";
            b.progress = 0;
          }
        } else if (b.phase === "return") {
          b.progress += (b.returnSpeed * dt) / Math.max(1, totalDist);
          if (b.progress >= 1) {
            if (b.gfx) b.gfx.destroy();
            weapon.boomerangProjectiles.splice(i, 1);
            continue;
          }
        }

        let bx, by;
        const outProgress = b.phase === "out" ? b.progress : 1;
        const returnProgress = b.phase === "return" ? b.progress : 0;

        if (b.phase === "out") {
          const t = b.progress;
          const easeT = 1 - (1 - t) * (1 - t);
          bx = b.originX + Math.cos(b.angle) * totalDist * easeT;
          by = b.originY + Math.sin(b.angle) * totalDist * easeT - Math.sin(Math.PI * t) * b.arcHeight * 0.3;
        } else {
          const t = b.progress;
          const easeT = t * t;
          bx = (b.originX + Math.cos(b.angle) * totalDist) * (1 - easeT) + this.player.x * easeT;
          by = (b.originY + Math.sin(b.angle) * totalDist) * (1 - easeT) + this.player.y * easeT;
        }

        if (!b.gfx) {
          b.gfx = this.scene.add.graphics().setDepth(PROJECTILE_RENDER_DEPTH);
        }
        b.gfx.clear();
        const color = weapon.type === "death_spiral" ? 0x8844ff : 0x44ddaa;
        b.gfx.fillStyle(color, 0.9);
        b.gfx.fillCircle(Math.round(bx), Math.round(by), 6);
        b.gfx.lineStyle(2, color, 0.7);
        b.gfx.strokeCircle(Math.round(bx), Math.round(by), 8);

        this.scene.enemies.getChildren().forEach((enemy) => {
          if (!enemy?.active || enemy.getData("isDying") || enemy.isDead?.()) return;
          const enemyDist = Phaser.Math.Distance.Between(bx, by, enemy.x, enemy.y);
          if (enemyDist > 20) return;
          const lastHit = b.hitCooldowns.get(enemy) ?? 0;
          if (time - lastHit < (weapon.boomerangHitCooldownMs ?? 300)) return;
          b.hitCooldowns.set(enemy, time);
          this.applyDamage(enemy, b.damage, b.knockbackForce, bx, by, weapon.type);
        });
      }
    });
  }

  fireMolotov(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) return false;

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.001 ? dx / dist : 1;
    const ny = dist > 0.001 ? dy / dist : 0;

    const speed = weapon.projectileSpeed ?? 200;
    const texture = PROJECTILE_TEXTURE_BY_WEAPON[weapon.type] || "proj_fireball";
    const projectile = this.acquireProjectile(texture);
    if (!projectile) return false;

    const scaledDamage = this.getScaledWeaponDamage(weapon);

    projectile.speed = speed;
    projectile.maxDistance = effectiveRange;
    projectile.travelled = 0;
    projectile.damage = scaledDamage;
    projectile.knockbackForce = weapon.knockbackForce;
    projectile.weaponType = weapon.type;
    projectile.behavior = "molotov";
    projectile.explosionRadius = weapon.fireRadius ?? 64;
    projectile.explosionDamage = Math.round(scaledDamage * 0.5);
    projectile.setData("fireRadius", weapon.fireRadius ?? 64);
    projectile.setData("fireDamagePerTick", weapon.fireDamagePerTick ?? 5);
    projectile.setData("fireTickIntervalMs", weapon.fireTickIntervalMs ?? 500);
    projectile.setData("fireDurationMs", weapon.fireDurationMs ?? 3000);
    projectile.setData("isMolotov", true);
    const visualProfile = this.getProjectileVisualProfile(weapon.type);
    const visualColor = 0xff6622;
    projectile.setTint(visualColor);
    projectile.setData("visualColor", visualColor);
    projectile.setData("glowAlpha", 0.8);
    projectile.setData("trailBurst", 3);

    projectile.enableBody(true, this.player.x, this.player.y, true, true);
    projectile.body.setVelocity(nx * speed, ny * speed - 60);

    return true;
  }

  fireGravityWell(weapon) {
    const effectiveRange = this.getEffectiveRange(weapon);
    const target = this.findNearestEnemy(this.player.x, this.player.y, effectiveRange);
    if (!target) return false;

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.001 ? dx / dist : 1;
    const ny = dist > 0.001 ? dy / dist : 0;

    const speed = weapon.projectileSpeed ?? 180;
    const texture = PROJECTILE_TEXTURE_BY_WEAPON[weapon.type] || "proj_homing";
    const projectile = this.acquireProjectile(texture);
    if (!projectile) return false;

    const scaledDamage = this.getScaledWeaponDamage(weapon);

    projectile.speed = speed;
    projectile.maxDistance = effectiveRange * 0.65;
    projectile.travelled = 0;
    projectile.damage = scaledDamage;
    projectile.knockbackForce = weapon.knockbackForce;
    projectile.weaponType = weapon.type;
    projectile.behavior = "gravity_well";
    projectile.explosionRadius = 0;
    projectile.explosionDamage = 0;
    projectile.setData("gravityRadius", weapon.gravityRadius ?? 120);
    projectile.setData("gravityForce", weapon.gravityForce ?? 80);
    projectile.setData("gravityDurationMs", weapon.gravityDurationMs ?? 2500);
    projectile.setData("isGravityWell", true);
    const visualColor = 0x6622ff;
    projectile.setTint(visualColor);
    projectile.setData("visualColor", visualColor);
    projectile.setData("glowAlpha", 0.9);
    projectile.setData("trailBurst", 2);

    projectile.enableBody(true, this.player.x, this.player.y, true, true);
    projectile.body.setVelocity(nx * speed, ny * speed);

    return true;
  }

  updateGravityWells(time, delta) {
    this.activeGravityWells = this.activeGravityWells || [];
    for (let i = this.activeGravityWells.length - 1; i >= 0; i--) {
      const well = this.activeGravityWells[i];
      well.elapsedMs += delta;
      if (well.elapsedMs >= well.durationMs) {
        if (well.gfx) well.gfx.destroy();
        this.activeGravityWells.splice(i, 1);
        continue;
      }

      const progress = well.elapsedMs / well.durationMs;
      const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

      if (well.gfx) {
        well.gfx.clear();
        well.gfx.fillStyle(0x6622ff, 0.15 * alpha);
        well.gfx.fillCircle(well.x, well.y, well.radius);
        well.gfx.lineStyle(2, 0x9944ff, 0.5 * alpha);
        well.gfx.strokeCircle(well.x, well.y, well.radius);
      }

      this.scene.enemies.getChildren().forEach((enemy) => {
        if (!enemy?.active || enemy.getData("isDying") || enemy.isDead?.()) return;
        const dx = well.x - enemy.x;
        const dy = well.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist > well.radius || dist < 1) return;
        const force = well.force * (1 - dist / well.radius);
        const nx = dx / dist;
        const ny = dy / dist;
        if (enemy.body) {
          enemy.body.setVelocity(
            enemy.body.velocity.x + nx * force * (delta / 16),
            enemy.body.velocity.y + ny * force * (delta / 16)
          );
        }
        if (dist < 20 && well.elapsedMs - (well.lastDamageAt ?? 0) > 500) {
          well.lastDamageAt = well.elapsedMs;
          this.applyDamage(enemy, well.damage, 30, well.x, well.y, well.weaponType);
        }
      });
    }
  }

  updateFireZones(time, delta) {
    this.activeFireZones = this.activeFireZones || [];
    for (let i = this.activeFireZones.length - 1; i >= 0; i--) {
      const zone = this.activeFireZones[i];
      zone.elapsedMs += delta;
      if (zone.elapsedMs >= zone.durationMs) {
        if (zone.gfx) zone.gfx.destroy();
        this.activeFireZones.splice(i, 1);
        continue;
      }

      const progress = zone.elapsedMs / zone.durationMs;
      const scaleProgress = progress < 0.2 ? progress / 0.2 : 1;
      const alphaProgress = progress > 0.8 ? (1 - progress) / 0.2 : 1;
      const currentRadius = zone.radius * scaleProgress;

      if (zone.gfx) {
        zone.gfx.clear();
        zone.gfx.fillStyle(0xff4422, 0.25 * alphaProgress);
        zone.gfx.fillCircle(zone.x, zone.y, currentRadius);
        zone.gfx.lineStyle(2, 0xff8844, 0.5 * alphaProgress);
        zone.gfx.strokeCircle(zone.x, zone.y, currentRadius * 0.7);
      }

      zone.lastTickMs = zone.lastTickMs ?? 0;
      if (zone.elapsedMs - zone.lastTickMs >= zone.tickIntervalMs) {
        zone.lastTickMs = zone.elapsedMs;
        this.scene.enemies.getChildren().forEach((enemy) => {
          if (!enemy?.active || enemy.getData("isDying") || enemy.isDead?.()) return;
          const dist = Phaser.Math.Distance.Between(zone.x, zone.y, enemy.x, enemy.y);
          if (dist <= currentRadius) {
            this.applyDamage(enemy, zone.damagePerTick, 40, zone.x, zone.y, zone.weaponType);
          }
        });
      }
    }
  }

  findWeaponByBaseType(baseType) {
    return this.player.weapons.find((weapon) => weapon.baseType === baseType) || null;
  }
}

export { WEAPON_DEFINITIONS, WEAPON_EVOLUTION_RULES };
