const CHEST_DEPTH = 16;
const CHEST_PICKUP_RADIUS = 50;
const CHEST_LIFETIME_MS = 20000;

export class TreasureChest extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "treasure_chest");
    scene.add.existing(this);
    this.setDepth(CHEST_DEPTH);

    this.spawnedAt = scene.time.now;
    this.collected = false;

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  isExpired(nowMs) {
    return nowMs - this.spawnedAt > CHEST_LIFETIME_MS;
  }

  isNearPlayer(playerX, playerY) {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    return Math.hypot(dx, dy) < CHEST_PICKUP_RADIUS;
  }

  collect() {
    if (this.collected) return null;
    this.collected = true;

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => this.destroy()
    });

    return this.generateReward();
  }

  generateReward() {
    const reward = {
      gold: 20 + Math.floor(Math.random() * 31),
      weaponUpgrade: Math.random() < 0.8,
      newWeapon: Math.random() < 0.2
    };
    return reward;
  }
}
