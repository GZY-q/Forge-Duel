const DESTRUCTIBLE_DEPTH = 3;
const RESPAWN_INTERVAL_MS = 45000;

const DESTRUCTIBLE_TYPES = {
  lantern: {
    color: 0xffcc44,
    glowColor: 0xff9922,
    radius: 10,
    hp: 1,
    xpDrop: 5,
    goldDrop: 3,
    itemChance: 0.15,
    chestChance: 0.03
  },
  barrel: {
    color: 0x8b6914,
    glowColor: 0x6b4914,
    radius: 12,
    hp: 2,
    xpDrop: 8,
    goldDrop: 5,
    itemChance: 0.2,
    chestChance: 0.05
  },
  crate: {
    color: 0x9b7924,
    glowColor: 0x7b5924,
    radius: 14,
    hp: 3,
    xpDrop: 12,
    goldDrop: 8,
    itemChance: 0.25,
    chestChance: 0.08
  }
};

export class Destructible extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type = "lantern") {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(DESTRUCTIBLE_DEPTH);

    this.destructibleType = type;
    this.config = DESTRUCTIBLE_TYPES[type] || DESTRUCTIBLE_TYPES.lantern;
    this.currentHp = this.config.hp;
    this.destroyed = false;
    this.respawnAt = 0;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.draw();

    // Gentle sway animation
    scene.tweens.add({
      targets: this,
      angle: 3,
      duration: 1500 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  draw() {
    const g = this.gfx;
    g.clear();
    const r = this.config.radius;

    if (this.destructibleType === "lantern") {
      // Pole
      g.fillStyle(0x666666, 1);
      g.fillRect(-2, -r, 4, r * 2);
      // Lantern body
      g.fillStyle(this.config.color, 1);
      g.fillCircle(0, -r - 4, 6);
      // Glow
      g.fillStyle(this.config.glowColor, 0.3);
      g.fillCircle(0, -r - 4, 10);
    } else if (this.destructibleType === "barrel") {
      // Barrel body
      g.fillStyle(this.config.color, 1);
      g.fillRoundedRect(-r, -r, r * 2, r * 2, 4);
      // Bands
      g.lineStyle(1, 0x555555, 0.8);
      g.lineBetween(-r, -r / 2, r, -r / 2);
      g.lineBetween(-r, r / 2, r, r / 2);
    } else {
      // Crate
      g.fillStyle(this.config.color, 1);
      g.fillRect(-r, -r, r * 2, r * 2);
      // Cross
      g.lineStyle(1, 0x666644, 0.8);
      g.lineBetween(-r, -r, r, r);
      g.lineBetween(r, -r, -r, r);
      // Border
      g.lineStyle(1, 0x555533, 0.6);
      g.strokeRect(-r, -r, r * 2, r * 2);
    }
  }

  takeDamage(amount) {
    if (this.destroyed) return;
    this.currentHp -= amount;

    // Flash white
    this.gfx.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.gfx?.active) this.gfx.clearTint();
    });

    if (this.currentHp <= 0) {
      this.destroySelf();
    }
  }

  destroySelf() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Spawn particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 60 + Math.random() * 80;
      const particle = this.scene.add.circle(
        this.x, this.y, 2 + Math.random() * 3,
        this.config.color, 0.8
      ).setDepth(DESTRUCTIBLE_DEPTH + 1);
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        onComplete: () => particle.destroy()
      });
    }

    // Drop rewards
    this.dropRewards();

    // Hide and schedule respawn
    this.setVisible(false);
    this.setActive(false);
    this.respawnAt = this.scene.time.now + RESPAWN_INTERVAL_MS;
  }

  dropRewards() {
    const scene = this.scene;
    const cfg = this.config;

    // XP orbs
    if (cfg.xpDrop > 0 && scene.spawnXpOrb) {
      scene.spawnXpOrb(this.x, this.y, cfg.xpDrop);
    }

    // Gold
    if (cfg.goldDrop > 0) {
      scene.runMetaCurrency = (scene.runMetaCurrency || 0) + cfg.goldDrop;
      if (scene.showHudAlert) {
        scene.showHudAlert(`+${cfg.goldDrop} GOLD`, 800);
      }
    }

    // Item drop
    if (Math.random() < cfg.itemChance && scene.itemPool) {
      scene.trySpawnItemDrop(this.x, this.y);
    }

    // Chest drop
    if (Math.random() < cfg.chestChance && scene.spawnChest) {
      scene.spawnChest(this.x, this.y);
    }
  }

  tryRespawn(nowMs) {
    if (!this.destroyed) return false;
    if (nowMs < this.respawnAt) return false;

    this.destroyed = false;
    this.currentHp = this.config.hp;
    this.setVisible(true);
    this.setActive(true);
    this.draw();
    return true;
  }

  isNearWeapon(weaponX, weaponY, radius) {
    const dx = weaponX - this.x;
    const dy = weaponY - this.y;
    return Math.hypot(dx, dy) < radius + this.config.radius;
  }
}

export function spawnDestructibles(scene, count = 10) {
  const types = ["lantern", "lantern", "lantern", "barrel", "barrel", "crate"];
  const worldW = 2400;
  const worldH = 1350;
  const margin = 80;
  const destructibles = [];

  for (let i = 0; i < count; i++) {
    const x = margin + Math.random() * (worldW - margin * 2);
    const y = margin + Math.random() * (worldH - margin * 2);
    const type = types[Math.floor(Math.random() * types.length)];
    const d = new Destructible(scene, x, y, type);
    destructibles.push(d);
  }

  return destructibles;
}
