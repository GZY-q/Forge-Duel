export function getPlayerTextureKey(scene) {
  if (scene?.textures?.exists("sprite_player_crew")) {
    return "sprite_player_crew";
  }
  return "player_triangle";
}
const PLAYER_RENDER_DEPTH = 20;
const PLAYER_CREW_SCALE = 2.24;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config = {}) {
    const shipTextureKey = config.shipTextureKey;
    const initialTexture = shipTextureKey || getPlayerTextureKey(scene, "south");
    super(scene, x, y, initialTexture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = 100;
    this.hp = this.maxHp;
    this.speed = 200;
    this.damageCooldownMs = 400;
    this.hurtFlashDurationMs = 80;
    this.nextDamageAt = 0;
    this.lastHurtAt = -Infinity;
    this.lastMoveDir = new Phaser.Math.Vector2(1, 0);

    this.dashGaugeMax = 100;
    this.dashGauge = 0;
    this.dashCooldownMs = 4000;
    this.dashChargeRate = this.dashGaugeMax / (this.dashCooldownMs / 1000);
    this.dashDurationMs = 250;
    this.dashRemainingMs = 0;
    this.dashInvulnerabilityMs = 200;
    this.dashInvulnerabilityRemainingMs = 0;
    this.dashSpeedMultiplier = 4;
    this.dashDamage = 20;
    this.currentDashId = 0;
    this.maxWeaponSlots = 6;
    this.weapons = [];
    this.passives = {};
    this.pickupRadius = 140;
    this.fighterType = null;
    this.shieldRemainingMs = 0;
    this.speedBoostActive = false;
    this.damageReduction = 0;
    this.armorFlat = 0;
    this.dodgeChance = 0;
    this.fireTwiceChance = 0;
    this.shipPassive = null;
    this.slowAmount = 0;
    this.slowUntilMs = 0;

    this.shipTextureKey = shipTextureKey || null;

    this.setCircle(16, 0, 0);
    this.setCollideWorldBounds(true);
    this.setDepth(PLAYER_RENDER_DEPTH);
    if (this.shipTextureKey) {
      const texture = scene.textures.get(this.shipTextureKey);
      const srcH = texture.getSourceImage().height || 68;
      const scale = 44 / srcH;
      this.setScale(scale);
    } else if (this.texture?.key === "sprite_player_crew") {
      this.setScale(PLAYER_CREW_SCALE);
    }
  }

  updateFacingFromVector(x, y) {
    if (this.shipTextureKey) {
      if (Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001) return;
      const angle = Math.atan2(y, x) + Math.PI / 2;
      this.setRotation(angle);
    }
  }

  moveFromInput(keys, analogInput = null) {
    if (!this.body) {
      return;
    }

    if (this.isDashing()) {
      return;
    }

    let moveX = 0;
    let moveY = 0;

    if (keys.left.isDown) {
      moveX -= 1;
    }
    if (keys.right.isDown) {
      moveX += 1;
    }
    if (keys.up.isDown) {
      moveY -= 1;
    }
    if (keys.down.isDown) {
      moveY += 1;
    }

    if (analogInput) {
      moveX += analogInput.x ?? 0;
      moveY += analogInput.y ?? 0;
    }

    const direction = new Phaser.Math.Vector2(moveX, moveY);
    if (direction.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    const magnitude = Math.min(1, direction.length());
    direction.normalize();
    this.lastMoveDir.copy(direction);
    this.updateFacingFromVector(direction.x, direction.y);
    let effectiveSpeed = this.speed;
    if (this.slowUntilMs > 0 && this.scene?.time?.now < this.slowUntilMs) {
      effectiveSpeed = Math.round(this.speed * (1 - this.slowAmount));
    }
    this.body.setVelocity(direction.x * effectiveSpeed * magnitude, direction.y * effectiveSpeed * magnitude);
  }

  updateDash(delta) {
    if (this.isDashing()) {
      this.dashRemainingMs = Math.max(0, this.dashRemainingMs - delta);
      this.dashInvulnerabilityRemainingMs = Math.max(0, this.dashInvulnerabilityRemainingMs - delta);
      if (!this.isDashing()) {
        this.dashInvulnerabilityRemainingMs = 0;
        this.clearTint();
      }
      return;
    }

    this.dashGauge = Math.min(this.dashGaugeMax, this.dashGauge + (this.dashChargeRate * delta) / 1000);
  }

  canDash() {
    return !this.isDashing() && this.dashGauge >= this.dashGaugeMax;
  }

  tryDash() {
    if (!this.body) {
      return false;
    }

    if (!this.canDash()) {
      return false;
    }

    this.dashGauge = 0;
    this.dashRemainingMs = this.dashDurationMs;
    this.dashInvulnerabilityRemainingMs = this.dashInvulnerabilityMs;
    this.currentDashId += 1;

    const dir = this.lastMoveDir.clone();
    if (dir.lengthSq() === 0) {
      dir.set(1, 0);
    } else {
      dir.normalize();
    }

    const dashSpeed = this.speed * this.dashSpeedMultiplier;
    this.updateFacingFromVector(dir.x, dir.y);
    this.body.setVelocity(dir.x * dashSpeed, dir.y * dashSpeed);
    this.setTint(0xfff2a6);
    if (this.scene.audioManager?.playSfx) {
      this.scene.audioManager.playSfx("dash");
    }
    return true;
  }

  isDashing() {
    return this.dashRemainingMs > 0;
  }

  isDashInvulnerable() {
    return this.dashInvulnerabilityRemainingMs > 0;
  }

  getDashRatio() {
    return this.dashGauge / this.dashGaugeMax;
  }

  takeDamage(amount, now) {
    if (now < this.nextDamageAt || this.hp <= 0) {
      return false;
    }

    // Dodge chance (phase_shift passive)
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      this.nextDamageAt = now + this.damageCooldownMs;
      return false;
    }

    // Shield blocks all damage
    if (this.shieldRemainingMs > 0) {
      this.nextDamageAt = now + this.damageCooldownMs;
      return false;
    }

    // Apply damage reduction (flat armor first, then percentage)
    const afterFlat = Math.max(1, amount - this.armorFlat);
    const reducedAmount = Math.max(1, Math.round(afterFlat * (1 - this.damageReduction)));
    this.hp = Math.max(0, this.hp - reducedAmount);
    this.nextDamageAt = now + this.damageCooldownMs;
    this.lastHurtAt = now;

    this.setTint(0xff9e9e);
    this.scene.time.delayedCall(this.hurtFlashDurationMs, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    return true;
  }

  getHpRatio() {
    return this.hp / this.maxHp;
  }

  isDead() {
    return this.hp <= 0;
  }

  getLastHurtAt() {
    return this.lastHurtAt;
  }

  addPassive(passiveKey) {
    if (this.passives[passiveKey]) {
      return false;
    }
    this.passives[passiveKey] = true;
    return true;
  }

  hasPassive(passiveKey) {
    return Boolean(this.passives[passiveKey]);
  }
}
