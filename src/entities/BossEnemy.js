import { Enemy } from "./Enemy.js";

const BOSS_VARIANTS = {
  boss: {
    hp: 1800,
    speed: 52,
    damage: 44,
    xpValue: 600,
    radius: 34,
    scale: 3.05,
    tint: 0x6d34ff,
    shockwaveIntervalMs: 2500,
    shockwaveRadius: 190,
    rushIntervalMs: 5000,
    rushDurationMs: 320,
    rushSpeedMultiplier: 2.65,
    radialBurstIntervalMs: 6000,
    radialBurstWarningLeadMs: 1000,
    radialBurstBulletCount: 12,
    radialBurstBulletSpeed: 220,
    shotgunIntervalMs: 4000,
    shotgunBulletCount: 7,
    shotgunSpreadDeg: 45,
    shotgunBulletSpeedMin: 160,
    shotgunBulletSpeedMax: 260,
    grenadeIntervalMs: 7000,
    grenadeDamage: 35,
    grenadeRadius: 100
  },
  mini: {
    hp: 112,
    speed: 88,
    damage: 22,
    xpValue: 220,
    radius: 24,
    scale: 2.28,
    tint: 0xffffff,
    shockwaveIntervalMs: 3200,
    shockwaveRadius: 155,
    rushIntervalMs: 5800,
    rushDurationMs: 250,
    rushSpeedMultiplier: 2.35,
    radialBurstIntervalMs: 6000,
    radialBurstWarningLeadMs: 1000,
    radialBurstBulletCount: 12,
    radialBurstBulletSpeed: 205,
    shotgunIntervalMs: 5500,
    shotgunBulletCount: 5,
    shotgunSpreadDeg: 50,
    shotgunBulletSpeedMin: 140,
    shotgunBulletSpeedMax: 220,
    grenadeIntervalMs: 9000,
    grenadeDamage: 22,
    grenadeRadius: 70
  },
  reaper: {
    hp: 99999,
    speed: 200,
    damage: 99,
    xpValue: 0,
    radius: 28,
    scale: 2.8,
    tint: 0xff2222,
    shockwaveIntervalMs: 1800,
    shockwaveRadius: 220,
    rushIntervalMs: 3000,
    rushDurationMs: 400,
    rushSpeedMultiplier: 3.0,
    radialBurstIntervalMs: 3500,
    radialBurstWarningLeadMs: 600,
    radialBurstBulletCount: 16,
    radialBurstBulletSpeed: 280,
    shotgunIntervalMs: 2500,
    shotgunBulletCount: 10,
    shotgunSpreadDeg: 60,
    shotgunBulletSpeedMin: 200,
    shotgunBulletSpeedMax: 300,
    grenadeIntervalMs: 4000,
    grenadeDamage: 50,
    grenadeRadius: 130
  }
};
const MINI_BOSS_TEXTURE_KEY = "char_enemy_miniboss_davy_south";

function resolveDavyTextureKey(scene) {
  const candidates = [
    "char_enemy_miniboss_davy_south",
    "char_enemy_miniboss_davy_south_west",
    "char_enemy_miniboss_davy_south_east",
    "char_enemy_miniboss_davy_west",
    "char_enemy_miniboss_davy_east",
    "char_enemy_miniboss_davy_north_west",
    "char_enemy_miniboss_davy_north_east",
    "char_enemy_miniboss_davy_north"
  ];
  return candidates.find((key) => scene?.textures?.exists(key)) ?? null;
}

function abilityScore(distance, config) {
  if (!config) return 1;
  return config.scoreFunction ? config.scoreFunction(distance) : 1;
}

export class BossEnemy extends Enemy {
  constructor(scene, x, y, options = {}) {
    const variant = options.variant === "mini" ? "mini" : options.variant === "reaper" ? "reaper" : "boss";
    const config = BOSS_VARIANTS[variant];

    super(scene, x, y, {
      type: "boss",
      hp: config.hp,
      speed: config.speed,
      damage: config.damage,
      xpValue: config.xpValue,
      radius: config.radius,
      scale: config.scale,
      tint: config.tint
    });

    this.variant = variant;
    this.shockwaveIntervalMs = config.shockwaveIntervalMs;
    this.shockwaveRadius = config.shockwaveRadius;
    this.rushIntervalMs = config.rushIntervalMs;
    this.rushDurationMs = config.rushDurationMs;
    this.rushSpeedMultiplier = config.rushSpeedMultiplier;
    this.nextShockwaveAtMs = 0;
    this.nextRushAtMs = 0;
    this.rushUntilMs = 0;
    this.rushDirX = 0;
    this.rushDirY = 0;
    this.radialBurstIntervalMs = config.radialBurstIntervalMs;
    this.radialBurstWarningLeadMs = config.radialBurstWarningLeadMs;
    this.radialBurstBulletCount = config.radialBurstBulletCount;
    this.radialBurstBulletSpeed = config.radialBurstBulletSpeed;
    this.nextRadialBurstAtMs = 0;
    this.radialBurstWarningShownAtMs = -1;

    this.shotgunIntervalMs = config.shotgunIntervalMs;
    this.shotgunBulletCount = config.shotgunBulletCount;
    this.shotgunSpreadDeg = config.shotgunSpreadDeg;
    this.shotgunBulletSpeedMin = config.shotgunBulletSpeedMin;
    this.shotgunBulletSpeedMax = config.shotgunBulletSpeedMax;
    this.nextShotgunAtMs = config.shotgunIntervalMs * 0.5;

    this.grenadeIntervalMs = config.grenadeIntervalMs;
    this.grenadeDamage = config.grenadeDamage;
    this.grenadeRadius = config.grenadeRadius;
    this.nextGrenadeAtMs = config.grenadeIntervalMs;

    this.abilities = [
      { id: "shockwave", weight: 1, scoreDist: (d) => d < 220 ? 2 : 0.3 },
      { id: "rush", weight: 2, scoreDist: (d) => d / (d + 300) * 3 },
      { id: "radialBurst", weight: 1.5, scoreDist: (d) => 1 },
      { id: "shotgun", weight: 1.2, scoreDist: (d) => Math.exp(-Math.pow((d - 250) / 150, 2)) },
      { id: "grenade", weight: 0.8, scoreDist: (d) => d / (d + 200) }
    ];

    this.setData("isBoss", true);
    this.setData("bossVariant", this.variant);

    const davyTextureKey = resolveDavyTextureKey(scene);
    if (davyTextureKey) {
      this.setTexture(davyTextureKey);
      this.setData("bossTextureKey", davyTextureKey);
    } else if (this.variant === "mini" && scene?.textures?.exists(MINI_BOSS_TEXTURE_KEY)) {
      this.setTexture(MINI_BOSS_TEXTURE_KEY);
      this.setData("bossTextureKey", MINI_BOSS_TEXTURE_KEY);
    }
  }

  chooseAbility(target) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    let totalScore = 0;
    const scores = this.abilities.map((ability) => {
      const now = this.scene?.time?.now ?? 0;
      const nextKey = `next_${ability.id}_at_ms`;
      if (now < (this[nextKey] ?? 0)) return 0;
      const score = (ability.weight ?? 1) * ability.scoreDist(distance);
      totalScore += score;
      return score;
    });
    if (totalScore <= 0) return null;
    let rand = Math.random() * totalScore;
    for (let i = 0; i < this.abilities.length; i++) {
      rand -= scores[i];
      if (rand <= 0) return this.abilities[i].id;
    }
    return this.abilities[0].id;
  }

  updateBossPattern(target, nowMs) {
    if (!this.active || !target || !target.active) {
      return;
    }

    const fixedTextureKey = this.getData("bossTextureKey");
    if (fixedTextureKey && this.texture?.key !== fixedTextureKey && this.scene?.textures?.exists(fixedTextureKey)) {
      this.setTexture(fixedTextureKey);
    }

    if (nowMs >= this.nextShockwaveAtMs) {
      this.nextShockwaveAtMs = nowMs + this.shockwaveIntervalMs;
      const shockwaveRadius = this.shockwaveRadius;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
      if (distance <= shockwaveRadius) {
        const shockwaveDamage = Math.max(10, Math.round(this.damage * 0.55));
        target.takeDamage(shockwaveDamage, nowMs);
      }
    }

    if (nowMs >= this.nextRushAtMs) {
      this.nextRushAtMs = nowMs + this.rushIntervalMs;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.0001) {
        this.rushDirX = dx / distance;
        this.rushDirY = dy / distance;
        this.rushUntilMs = nowMs + this.rushDurationMs;
      }
    }

    if (nowMs < this.rushUntilMs) {
      const rushSpeed = this.speed * this.rushSpeedMultiplier;
      this.body.setVelocity(this.rushDirX * rushSpeed, this.rushDirY * rushSpeed);
    }

    if (this.nextRadialBurstAtMs <= 0) {
      this.nextRadialBurstAtMs = nowMs + this.radialBurstIntervalMs;
    }

    const warningAtMs = this.nextRadialBurstAtMs - this.radialBurstWarningLeadMs;
    if (nowMs >= warningAtMs && this.radialBurstWarningShownAtMs !== this.nextRadialBurstAtMs) {
      this.radialBurstWarningShownAtMs = this.nextRadialBurstAtMs;
      if (this.scene?.showBossRadialWarning) {
        this.scene.showBossRadialWarning(this, this.radialBurstWarningLeadMs);
      }
    }

    if (nowMs >= this.nextRadialBurstAtMs) {
      this.nextRadialBurstAtMs = nowMs + this.radialBurstIntervalMs;
      this.radialBurstWarningShownAtMs = -1;
      if (this.scene?.spawnBossRadialBurst) {
        this.scene.spawnBossRadialBurst(this, this.radialBurstBulletCount, this.radialBurstBulletSpeed);
      }
    }

    if (nowMs >= this.nextShotgunAtMs) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
      if (distance < 400) {
        this.nextShotgunAtMs = nowMs + this.shotgunIntervalMs;
        this.fireShotgun(target);
      } else {
        this.nextShotgunAtMs = nowMs + 2000;
      }
    }

    if (nowMs >= this.nextGrenadeAtMs) {
      this.nextGrenadeAtMs = nowMs + this.grenadeIntervalMs;
      this.throwGrenade(target);
    }
  }

  fireShotgun(target) {
    if (!this.scene?.bossProjectiles) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;

    const baseAngle = Math.atan2(dy, dx);
    const spreadRad = Phaser.Math.DegToRad(this.shotgunSpreadDeg);
    const count = this.shotgunBulletCount;
    const center = (count - 1) / 2;

    for (let i = 0; i < count; i++) {
      const offset = (i - center) * (spreadRad / count);
      const angle = baseAngle + offset;
      const speed = Phaser.Math.FloatBetween(this.shotgunBulletSpeedMin, this.shotgunBulletSpeedMax);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);

      let projectile = this.scene.bossProjectiles.getFirstDead(false);
      if (!projectile) {
        if (this.scene.bossProjectiles.getLength() >= 220) break;
        projectile = this.scene.bossProjectiles.create(-1000, -1000, "boss_bullet");
        if (!projectile?.body) continue;
        projectile.body.setCircle(Math.max(2, projectile.displayWidth * 0.42), 0, 0);
        projectile.setDepth(8);
      }
      projectile.setActive(true);
      projectile.setVisible(true);
      projectile.body.enable = true;
      projectile.setPosition(this.x, this.y);
      projectile.body.setVelocity(nx * speed, ny * speed);
      projectile.setData("damage", Math.round(this.damage * 0.35));
      projectile.setTint(0xff6644);
      projectile.setData("isBoomerangProjectile", false);

      this.scene.time.delayedCall(2500, () => {
        if (projectile.active) {
          this.scene.releaseBossProjectile(projectile);
        }
      });
    }
  }

  throwGrenade(target) {
    if (!this.scene?.bossProjectiles) return;
    let vx = 0;
    let vy = 0;
    if (target.body) {
      vx = target.body.velocity?.x ?? 0;
      vy = target.body.velocity?.y ?? 0;
    }
    const travelTime = 0.5;
    const predictedX = target.x + vx * travelTime * 0.5;
    const predictedY = target.y + vy * travelTime * 0.5;

    const dx = predictedX - this.x;
    const dy = predictedY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;

    const speed = 180;
    const nx = dx / dist;
    const ny = dy / dist;

    let projectile = this.scene.bossProjectiles.getFirstDead(false);
    if (!projectile) {
      if (this.scene.bossProjectiles.getLength() >= 220) return;
      projectile = this.scene.bossProjectiles.create(-1000, -1000, "boss_bullet");
      if (!projectile?.body) return;
      projectile.body.setCircle(Math.max(2, projectile.displayWidth * 0.42), 0, 0);
      projectile.setDepth(8);
    }
    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.body.enable = true;
    projectile.setPosition(this.x, this.y);
    projectile.body.setVelocity(nx * speed, ny * speed);
    projectile.setData("damage", 0);
    projectile.setTint(0xff4422);
    projectile.setData("isGrenade", true);
    projectile.setData("grenadeDamage", this.grenadeDamage);
    projectile.setData("grenadeRadius", this.grenadeRadius);
    projectile.setData("isBoomerangProjectile", false);
    projectile.setData("grenadeLaunchX", this.x);
    projectile.setData("grenadeLaunchY", this.y);
    projectile.setData("grenadeRange", dist * 1.1);

    this.scene.time.delayedCall(1200, () => {
      if (projectile.active) {
        this.scene.releaseBossProjectile(projectile);
      }
    });
  }
}
