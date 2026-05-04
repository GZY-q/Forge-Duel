export const STATUS_EFFECTS = {
  burn: {
    id: "burn",
    color: 0xff6622,
    tintColor: 0xff4400,
    durationMs: 3000,
    tickIntervalMs: 500,
    tickDamage: 5,
    speedMultiplier: 1.0,
    label: "燃烧"
  },
  freeze: {
    id: "freeze",
    color: 0x66ccff,
    tintColor: 0x4488cc,
    durationMs: 2000,
    tickIntervalMs: 0,
    tickDamage: 0,
    speedMultiplier: 0.4,
    label: "冻结"
  },
  slow: {
    id: "slow",
    color: 0x88aacc,
    tintColor: 0x6688aa,
    durationMs: 3000,
    tickIntervalMs: 0,
    tickDamage: 0,
    speedMultiplier: 0.7,
    label: "减速"
  },
  poison: {
    id: "poison",
    color: 0x66ff66,
    tintColor: 0x44cc44,
    durationMs: 4000,
    tickIntervalMs: 800,
    tickDamage: 3,
    speedMultiplier: 1.0,
    label: "中毒"
  },
  bleed: {
    id: "bleed",
    color: 0xff2244,
    tintColor: 0xcc1133,
    durationMs: 3000,
    tickIntervalMs: 400,
    tickDamage: 4,
    speedMultiplier: 1.0,
    label: "流血"
  }
};

export const WEAPON_STATUS_CHANCES = {
  fireball: { effect: "burn", chance: 0.3 },
  meteor: { effect: "burn", chance: 0.4 },
  lightning: { effect: "slow", chance: 0.2 },
  thunderstorm: { effect: "slow", chance: 0.3 },
  laser: { effect: "burn", chance: 0.1 },
  prismatic_laser: { effect: "burn", chance: 0.2 },
  frost_shard: { effect: "freeze", chance: 0.35 },
  dagger: { effect: "bleed", chance: 0.2 },
  slash: { effect: "bleed", chance: 0.3 },
  cyclone_slash: { effect: "bleed", chance: 0.4 },
  boomerang: { effect: "slow", chance: 0.15 },
  death_spiral: { effect: "slow", chance: 0.25 },
  garlic_aura: { effect: "slow", chance: 0.1 },
  holy_aura: { effect: "freeze", chance: 0.15 },
  molotov: { effect: "burn", chance: 0.5 },
  inferno: { effect: "burn", chance: 0.6 },
  gravity_well: { effect: "slow", chance: 0.3 },
  singularity: { effect: "freeze", chance: 0.2 }
};

export class StatusEffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeEffects = new Map();
  }

  applyEffect(enemy, effectId, sourceWeapon) {
    if (!enemy?.active || enemy.getData("isDying")) return false;
    const config = STATUS_EFFECTS[effectId];
    if (!config) return false;

    const enemyId = enemy.getData("enemyId") || enemy.body?.id || enemy.x + "," + enemy.y;
    const key = `${enemyId}_${effectId}`;

    const existing = this.activeEffects.get(key);
    if (existing) {
      existing.remainingMs = config.durationMs;
      return false;
    }

    const effect = {
      enemyId,
      enemy,
      effectId,
      config,
      remainingMs: config.durationMs,
      nextTickAt: this.scene.time.now + config.tickIntervalMs,
      originalTint: enemy.tintTopLeft || 0xffffff,
      indicatorDot: null
    };

    // Visual indicator dot
    const dot = this.scene.add.circle(enemy.x, enemy.y - enemy.displayHeight / 2 - 8, 4, config.color, 0.9)
      .setDepth(20);
    effect.indicatorDot = dot;

    // Apply tint
    enemy.setTint(config.tintColor);

    // Slow effect: reduce speed
    if (config.speedMultiplier < 1 && enemy.baseSpeed == null) {
      enemy.baseSpeed = enemy.speed ?? enemy.getData("speed") ?? 110;
      const newSpeed = Math.round(enemy.baseSpeed * config.speedMultiplier);
      enemy.speed = newSpeed;
      if (enemy.body) {
        const vx = enemy.body.velocity.x;
        const vy = enemy.body.velocity.y;
        const currentSpeed = Math.hypot(vx, vy);
        if (currentSpeed > 1) {
          enemy.body.setVelocity(
            (vx / currentSpeed) * newSpeed,
            (vy / currentSpeed) * newSpeed
          );
        }
      }
    }

    this.activeEffects.set(key, effect);
    return true;
  }

  tryApplyFromWeapon(enemy, weaponType) {
    const entry = WEAPON_STATUS_CHANCES[weaponType];
    if (!entry) return false;
    if (Math.random() > entry.chance) return false;
    return this.applyEffect(enemy, entry.effect, weaponType);
  }

  update(time, delta) {
    for (const [key, effect] of this.activeEffects) {
      if (!effect.enemy?.active || effect.enemy.getData("isDying")) {
        this.removeEffect(key);
        continue;
      }

      effect.remainingMs -= delta;

      // Update indicator position
      if (effect.indicatorDot) {
        effect.indicatorDot.setPosition(effect.enemy.x, effect.enemy.y - effect.enemy.displayHeight / 2 - 8);
      }

      // Tick damage
      if (effect.config.tickDamage > 0 && effect.config.tickIntervalMs > 0 && time >= effect.nextTickAt) {
        effect.nextTickAt = time + effect.config.tickIntervalMs;
        const dmg = effect.config.tickDamage;
        if (typeof effect.enemy.takeDamage === "function") {
          effect.enemy.takeDamage(dmg);
        } else {
          effect.enemy.hp = Math.max(0, (effect.enemy.hp ?? 0) - dmg);
        }

        // Damage number
        if (this.scene.spawnDamageNumber) {
          this.scene.spawnDamageNumber(effect.enemy.x, effect.enemy.y, dmg, effect.effectId);
        }
      }

      // Expire
      if (effect.remainingMs <= 0) {
        this.removeEffect(key);
      }
    }
  }

  removeEffect(key) {
    const effect = this.activeEffects.get(key);
    if (!effect) return;

    // Restore tint
    if (effect.enemy?.active) {
      effect.enemy.clearTint();
      // Restore speed
      if (effect.config.speedMultiplier < 1 && effect.enemy.baseSpeed != null) {
        effect.enemy.speed = effect.enemy.baseSpeed;
        delete effect.enemy.baseSpeed;
      }
    }

    // Remove indicator
    if (effect.indicatorDot) {
      effect.indicatorDot.destroy();
    }

    this.activeEffects.delete(key);
  }

  removeAllForEnemy(enemy) {
    for (const [key, effect] of this.activeEffects) {
      if (effect.enemy === enemy) {
        this.removeEffect(key);
      }
    }
  }

  clear() {
    for (const key of this.activeEffects.keys()) {
      this.removeEffect(key);
    }
    this.activeEffects.clear();
  }

  hasEffect(enemy, effectId) {
    const enemyId = enemy.getData("enemyId") || enemy.body?.id || enemy.x + "," + enemy.y;
    return this.activeEffects.has(`${enemyId}_${effectId}`);
  }
}
