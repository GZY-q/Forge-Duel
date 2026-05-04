import { ITEM_DROP_CONFIGS } from "../config/progression.js";
import { LEVEL_UP_UPGRADES } from "../config/weapons.js";
import { TreasureChest } from "../entities/TreasureChest.js";

const XP_ORB_BASE_SCALE = 1.16;
const XP_ORB_HIGH_VALUE_SCALE = 1.24;
const XP_ORB_SPECIAL_SCALE = 1.32;
const XP_ORB_BASE_ALPHA = 1;
const XP_ORB_HIGH_VALUE_ALPHA = 0.97;
const XP_ORB_SPECIAL_ALPHA = 1;
const XP_ORB_MAGNET_SCALE_BOOST = 0.14;
const ELITE_BONUS_XP_ORB_MIN = 2;
const ELITE_BONUS_XP_ORB_MAX = 4;
const ELITE_BONUS_XP_ORB_VALUE_FACTOR = 0.9;
const ELITE_UPGRADE_DROP_CHANCE = 0.28;
const ELITE_BONUS_UPGRADE_IDS = ["weapon_damage", "attack_speed", "movement_speed", "pickup_radius", "projectile_count"];
const MINI_BOSS_GOLD_BUNDLE = 12;
const MINI_BOSS_XP_BURST_COUNT = 8;
const MINI_BOSS_XP_BURST_MIN_FACTOR = 0.3;
const MINI_BOSS_XP_BURST_MAX_FACTOR = 1.6;

export class DropManager {
  constructor(scene) {
    this.scene = scene;
  }

  /* ── XP Orb ── */
  spawnXpOrb(x, y, value, config = {}) {
    const s = this.scene;
    let texture = config.texture;
    if (!texture) {
      if (value >= 50) texture = "xp_orb_gold";
      else if (value >= 25) texture = "xp_orb_purple";
      else if (value >= 10) texture = "xp_orb_blue";
      else texture = "xp_orb";
    }
    const orb = s.xpOrbs.create(x, y, texture);
    if (!orb) return;

    const isSpecialPickup = config.pickupType === "elite_upgrade" || config.pickupType === "mini_boss_gold";
    const isHighValue = value >= 20;
    const isUltraValue = value >= 50;
    const baseScale = config.scale ??
      (isSpecialPickup ? XP_ORB_SPECIAL_SCALE : isUltraValue ? 1.4 : isHighValue ? XP_ORB_HIGH_VALUE_SCALE : XP_ORB_BASE_SCALE);
    const baseAlpha = isSpecialPickup ? XP_ORB_SPECIAL_ALPHA : isHighValue ? XP_ORB_HIGH_VALUE_ALPHA : XP_ORB_BASE_ALPHA;
    const radius = config.radius ?? (config.pickupType === "elite_upgrade" ? 8 : 6);
    orb.setCircle?.(radius, 0, 0);
    orb.setDepth(config.pickupType === "elite_upgrade" ? 7 : 5);
    orb.setScale(baseScale);
    orb.setAlpha(baseAlpha);
    orb.xpValue = value;
    orb.setData("baseScale", baseScale);
    orb.setData("baseAlpha", baseAlpha);
    orb.setData("magnetScaleBoost", isSpecialPickup ? XP_ORB_MAGNET_SCALE_BOOST + 0.05 : XP_ORB_MAGNET_SCALE_BOOST);
    orb.setData("pickupType", config.pickupType || null);
    orb.setData("rewardUpgradeId", config.rewardUpgradeId ?? null);
    orb.setData("rewardCoins", Math.max(0, Math.floor(Number(config.rewardCoins) || 0)));
  }

  /* ── Elite drops ── */
  spawnEliteBonusXpOrbs(enemy) {
    const orbCount = Phaser.Math.Between(ELITE_BONUS_XP_ORB_MIN, ELITE_BONUS_XP_ORB_MAX);
    const perOrbValue = Math.max(3, Math.round((enemy.xpValue ?? 10) * ELITE_BONUS_XP_ORB_VALUE_FACTOR));
    for (let i = 0; i < orbCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(10, 26);
      this.spawnXpOrb(enemy.x + Math.cos(angle) * distance, enemy.y + Math.sin(angle) * distance, perOrbValue);
    }
  }

  spawnEliteUpgradePickup(x, y) {
    if (Math.random() >= ELITE_UPGRADE_DROP_CHANCE) return false;
    const rewardUpgradeId = Phaser.Utils.Array.GetRandom(ELITE_BONUS_UPGRADE_IDS);
    this.spawnXpOrb(x, y, 0, {
      texture: "upgrade_orb", pickupType: "elite_upgrade", rewardUpgradeId, radius: 8
    });
    return true;
  }

  applyEliteUpgradeReward(rewardUpgradeId) {
    const s = this.scene;
    const rewardUpgrade = LEVEL_UP_UPGRADES.find((upgrade) => upgrade.id === rewardUpgradeId);
    if (!rewardUpgrade) return false;
    s.levelUpManager.apply(rewardUpgrade);
    s.showHudAlert(`ELITE ${rewardUpgrade.label.toUpperCase()}`, 1200);
    return true;
  }

  /* ── Mini-boss drops ── */
  spawnMiniBossRewardDrops(enemy) {
    const goldBundle = MINI_BOSS_GOLD_BUNDLE;
    const xpBase = Math.max(4, Math.round(enemy.xpValue ?? 20));
    const cx = enemy.x, cy = enemy.y;

    this.spawnXpOrb(cx, cy, 0, {
      texture: "upgrade_orb", pickupType: "mini_boss_gold", rewardCoins: goldBundle, radius: 8
    });

    for (let i = 0; i < MINI_BOSS_XP_BURST_COUNT; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(14, 42);
      const xpFactor = Phaser.Math.FloatBetween(MINI_BOSS_XP_BURST_MIN_FACTOR, MINI_BOSS_XP_BURST_MAX_FACTOR);
      const xpValue = Math.max(3, Math.round(xpBase * xpFactor));
      this.spawnXpOrb(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, xpValue);
    }
  }

  /* ── Item drops ── */
  trySpawnItemDrop(x, y) {
    const s = this.scene;
    if (!s.itemPool) return;
    const itemKeys = Object.keys(ITEM_DROP_CONFIGS);
    for (let i = 0; i < itemKeys.length; i++) {
      const config = ITEM_DROP_CONFIGS[itemKeys[i]];
      if (Math.random() < config.dropChance) {
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        const item = s.itemPool.acquire(x + offsetX, y + offsetY, config.id);
        if (item) s.activeItems.push(item);
        break;
      }
    }
  }

  /* ── Chests ── */
  spawnChest(x, y) {
    const s = this.scene;
    const chest = new TreasureChest(s, x, y);
    s.chests.push(chest);
    s.playSfx("item_spawn");
  }

  /* ── Boss defeat effect ── */
  playBossDefeatEffect(x, y) {
    const s = this.scene;
    if (s.cameras?.main) {
      s.cameras.main.flash(200, 255, 215, 60, true);
      s.shakeScreen(260, 0.006);
    }
    // Gold pillar particles
    if (s.add && s.tweens) {
      for (let i = 0; i < 12; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const dist = Phaser.Math.Between(10, 60);
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist - Phaser.Math.Between(0, 80);
        const spark = s.add.rectangle(px, py, 3, Phaser.Math.Between(6, 18), 0xfef08a, 0.9)
          .setDepth(50).setAngle(Phaser.Math.Between(0, 360));
        s.tweens.add({
          targets: spark, alpha: 0, y: py - Phaser.Math.Between(40, 100),
          duration: Phaser.Math.Between(400, 800), ease: "Quad.easeOut",
          onComplete: () => spark.destroy()
        });
      }
    }
    s.showHudAlert("BOSS DEFEATED!", 2000);
  }

  /* ── Kill reward pipeline ── */
  handleEnemyDefeat(enemy) {
    const s = this.scene;
    if (!enemy || !enemy.active) return;
    if (enemy.getData("isDying")) return;

    enemy.setData("isDying", true);
    s.statusEffectSystem?.removeAllForEnemy(enemy);
    if (enemy.body) { enemy.body.setVelocity(0, 0); enemy.body.enable = false; }
    s.totalKills += 1;
    s.playKillCounterPulse();
    s.recordKillEvent();
    s.updateKillCombo();

    s.playSfx("enemy_death", { elite: enemy.isElite });
    if (enemy.isElite) s.spawnEliteKillParticles(enemy.x, enemy.y, 20);
    s.spawnKillParticles(enemy.x, enemy.y, enemy.isElite ? 14 : 10);

    const archetype = enemy.getData("archetype");
    if (archetype === "mini_boss" || enemy.getData("bossVariant") === "mini") {
      this.spawnMiniBossRewardDrops(enemy);
      s.showHudAlert("MINI BOSS LOOT", 1200);
    } else {
      this.spawnXpOrb(enemy.x, enemy.y, enemy.xpValue);
    }
    if (enemy.isElite) {
      this.spawnEliteBonusXpOrbs(enemy);
      if (this.spawnEliteUpgradePickup(enemy.x, enemy.y)) s.showHudAlert("ELITE LOOT", 1000);
    }

    this.trySpawnItemDrop(enemy.x, enemy.y);

    const isBoss = archetype === "boss" || enemy.getData("bossVariant") === "full";
    if (isBoss) {
      this.playBossDefeatEffect(enemy.x, enemy.y);
      this.spawnChest(enemy.x, enemy.y);
    } else if (enemy.isElite && Math.random() < 0.15) {
      this.spawnChest(enemy.x, enemy.y);
    } else if (!enemy.isElite && Math.random() < 0.015) {
      this.spawnChest(enemy.x, enemy.y);
    }

    if (s.gameMode === "coop" && s.isHost && s.networkManager) {
      s.networkManager.sendEnemyKilled(enemy.serverId || "unknown", {
        x: Math.round(enemy.x), y: Math.round(enemy.y), xpValue: enemy.xpValue
      });
    }

    s.tweens.add({
      targets: enemy, scaleX: enemy.scaleX * 1.3, scaleY: enemy.scaleY * 1.3,
      alpha: 0, duration: 120, ease: "Quad.easeOut",
      onComplete: () => {
        enemy.setData("isDying", false);
        enemy.setAlpha(1);
        if (enemy.getData("pooledEnemy") === true) { s.enemyPool.release(enemy); return; }
        enemy.destroy();
      }
    });
  }

  /* ── XP pickup ── */
  handleXpOrbPickup(_player, orb) {
    const s = this.scene;
    if (!orb.active) return;
    const xpValue = orb.xpValue ?? 0;
    if (xpValue > 0) s.gainXp(xpValue);

    const pickupType = orb.getData("pickupType");
    if (pickupType === "elite_upgrade") {
      this.applyEliteUpgradeReward(orb.getData("rewardUpgradeId"));
    } else if (pickupType === "mini_boss_gold") {
      const rewardCoins = Math.max(0, Math.floor(Number(orb.getData("rewardCoins")) || 0));
      s.runMetaCurrency += rewardCoins;
      s.showHudAlert(`+${rewardCoins} GOLD`, 900);
    }
    orb.destroy();
  }
}
