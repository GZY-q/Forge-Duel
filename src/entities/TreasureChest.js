const CHEST_DEPTH = 16;
const CHEST_PICKUP_RADIUS = 50;
const CHEST_LIFETIME_MS = 20000;

export class TreasureChest extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(CHEST_DEPTH);

    this.chestGfx = scene.add.graphics();
    this.drawChest();
    this.add(this.chestGfx);

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

  drawChest() {
    const g = this.chestGfx;
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 12, 28, 8);

    // Chest body
    g.fillStyle(0xc89020, 1);
    g.fillRoundedRect(-14, -10, 28, 20, 3);

    // Chest lid
    g.fillStyle(0xe8a828, 1);
    g.fillRoundedRect(-16, -16, 32, 10, 4);

    // Lock
    g.fillStyle(0xffd866, 1);
    g.fillCircle(0, -4, 4);
    g.fillStyle(0x805c10, 1);
    g.fillCircle(0, -4, 2);

    // Highlight
    g.fillStyle(0xffee88, 0.6);
    g.fillRoundedRect(-12, -14, 8, 4, 2);

    // Rim lines
    g.lineStyle(1, 0x805c10, 0.8);
    g.strokeRoundedRect(-14, -10, 28, 20, 3);
    g.strokeRoundedRect(-16, -16, 32, 10, 4);
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
