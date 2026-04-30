import { ITEM_DROP_CONFIGS } from "../config/progression.js";

const ITEM_RENDER_DEPTH = 15;
const ITEM_LIFETIME_MS = 15000;
const ITEM_PULSE_SPEED_MS = 220;
const ITEM_PULSE_AMPLITUDE = 0.06;
const ITEM_MAGNET_RADIUS = 160;
const ITEM_MAGNET_PULL = 380;

export class ItemDrop extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "__WHITE");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(ITEM_RENDER_DEPTH);
    this.setCircle(8, 0, 0);
    this.body.setAllowGravity(false);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.itemType = null;
    this.itemConfig = null;
    this.spawnedAt = 0;
    this.inPool = true;
  }

  resetForSpawn(x, y, itemTypeId) {
    const config = ITEM_DROP_CONFIGS[itemTypeId];
    if (!config) {
      return false;
    }

    this.setPosition(x, y);
    this.itemType = itemTypeId;
    this.itemConfig = config;
    this.spawnedAt = this.scene.time.now;
    this.inPool = false;

    this.setTexture("__WHITE");
    this.setTint(config.color);
    this.setScale(config.scale);
    this.setAlpha(0.92);
    this.setCircle(8, 0, 0);
    this.body.enable = true;
    this.setActive(true);
    this.setVisible(true);
    this.body.setVelocity(0, 0);
    return true;
  }

  resetForPool() {
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.setPosition(-1000, -1000);
    this.itemType = null;
    this.itemConfig = null;
    this.inPool = true;
  }

  updateVisual(nowMs) {
    if (!this.active || !this.itemConfig) {
      return;
    }

    const pulse = 1 + Math.sin(nowMs / ITEM_PULSE_SPEED_MS) * ITEM_PULSE_AMPLITUDE;
    this.setScale(this.itemConfig.scale * pulse);

    // Check lifetime
    if (nowMs - this.spawnedAt > ITEM_LIFETIME_MS) {
      this.setAlpha(Math.max(0, 1 - (nowMs - this.spawnedAt - ITEM_LIFETIME_MS + 2000) / 2000));
    }
  }

  isExpired(nowMs) {
    return nowMs - this.spawnedAt > ITEM_LIFETIME_MS + 2000;
  }

  pullTowardPlayer(playerX, playerY, deltaMs) {
    if (!this.active || !this.body) {
      return;
    }
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > ITEM_MAGNET_RADIUS || dist < 0.001) {
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    this.body.setVelocity(nx * ITEM_MAGNET_PULL, ny * ITEM_MAGNET_PULL);
  }

  applyEffect(player, scene) {
    if (!this.itemConfig || !this.active) {
      return;
    }
    const config = this.itemConfig;
    switch (config.id) {
      case "health_orb":
        player.hp = Math.min(player.maxHp, player.hp + config.healAmount);
        break;
      case "shield":
        player.shieldRemainingMs = config.shieldDurationMs;
        player.setTint(0x88ccff);
        break;
      case "speed_boost":
        if (!player.speedBoostActive) {
          player.speedBoostActive = true;
          player.speed = Math.round(player.speed * config.speedMultiplier);
          scene.time.delayedCall(config.speedDurationMs, () => {
            if (player.active) {
              player.speed = Math.round(player.speed / config.speedMultiplier);
              player.speedBoostActive = false;
            }
          });
        }
        break;
      case "magnet":
        // Pull all XP orbs to player immediately
        if (scene.xpOrbs) {
          scene.xpOrbs.getChildren().forEach((orb) => {
            if (orb.active && orb.body) {
              const dx = player.x - orb.x;
              const dy = player.y - orb.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 0.001) {
                const factor = 0.9;
                orb.x += dx * factor;
                orb.y += dy * factor;
              }
            }
          });
        }
        break;
    }
  }
}

// Simple item pool manager
export class ItemPool {
  constructor(scene, size = 60) {
    this.scene = scene;
    this.available = [];
    this.all = [];
    for (let i = 0; i < size; i++) {
      const item = new ItemDrop(scene, -1000, -1000);
      this.available.push(item);
      this.all.push(item);
    }
  }

  acquire(x, y, itemTypeId) {
    if (this.available.length === 0) {
      return null;
    }
    const item = this.available.pop();
    if (!item.resetForSpawn(x, y, itemTypeId)) {
      this.available.push(item);
      return null;
    }
    return item;
  }

  release(item) {
    if (!item || item.inPool) {
      return;
    }
    item.resetForPool();
    this.available.push(item);
  }

  releaseAll() {
    this.all.forEach((item) => {
      if (!item.inPool) {
        this.release(item);
      }
    });
  }
}
