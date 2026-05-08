import {
  DAMAGE_NUMBER_MAX_ACTIVE, DAMAGE_NUMBER_MAX_ACTIVE_PRIORITY,
  DAMAGE_NUMBER_NORMAL_LIFETIME_MS, DAMAGE_NUMBER_ELITE_LIFETIME_MS,
  DAMAGE_NUMBER_BOSS_LIFETIME_MS, DAMAGE_NUMBER_NORMAL_RISE_PX,
  DAMAGE_NUMBER_ELITE_RISE_PX, DAMAGE_NUMBER_BOSS_RISE_PX
} from "../config/damage-text.js";
import { RENDER_DEPTH } from "../config/render-layers.js";

export class DamageNumberSystem {
  constructor(scene) {
    this.scene = scene;
    this.damageNumberPool = [];
  }

  spawn(x, y, value, priority = 0, options = {}) {
    if (this.scene.settingsShowDmgNum === false) return;
    const safeAmount = Math.max(0, Math.round(value ?? 0));
    if (safeAmount <= 0) {
      return;
    }

    const isBoss = options.isBoss === true;
    const isElite = options.isElite === true;
    const isPriority = isBoss || isElite || safeAmount >= 40 || priority > 0;
    const textColor = isBoss ? "#ff3b3b" : isElite ? "#ffb347" : "#ff4444";
    const lifetimeMs = isBoss
      ? DAMAGE_NUMBER_BOSS_LIFETIME_MS
      : isElite
        ? DAMAGE_NUMBER_ELITE_LIFETIME_MS
        : DAMAGE_NUMBER_NORMAL_LIFETIME_MS;
    const risePx = isBoss
      ? DAMAGE_NUMBER_BOSS_RISE_PX
      : isElite
        ? DAMAGE_NUMBER_ELITE_RISE_PX
        : DAMAGE_NUMBER_NORMAL_RISE_PX;
    const fontSize = isBoss ? 16 : isElite ? 15 : isPriority ? 14 : 13;
    const activeEntries = this.damageNumberPool.filter((entry) => entry.active);
    const activeCap = isPriority ? DAMAGE_NUMBER_MAX_ACTIVE_PRIORITY : DAMAGE_NUMBER_MAX_ACTIVE;

    if (!isPriority && activeEntries.length >= activeCap) {
      return;
    }

    let text = this.damageNumberPool.find((entry) => !entry.active);
    if (!text && isPriority) {
      text = activeEntries.find((entry) => !entry.getData("damagePriority")) ?? activeEntries[0];
    }
    if (!text) {
      text = this.scene.add
        .text(x, y, "", {
          fontFamily: "ZpixOne",
          fontSize: "14px",
          color: "#ff4444",
          stroke: "#000000",
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(RENDER_DEPTH.DAMAGE_TEXT)
        .setVisible(false)
        .setActive(false);
      this.damageNumberPool.push(text);
    }

    const prevTween = text.getData("damageTween");
    if (prevTween) {
      prevTween.stop();
    }
    const prevPopTween = text.getData("damagePopTween");
    if (prevPopTween) {
      prevPopTween.stop();
    }

    const baseYOffset = isBoss ? 30 : isElite ? 20 : 12;
    const spawnX = x + Phaser.Math.Between(-8, 8);
    const spawnY = y - baseYOffset + Phaser.Math.Between(-2, 2);

    text.setText(`${safeAmount}`);
    text.setStyle({
      fontSize: `${fontSize}px`,
      color: textColor
    });
    text.setPosition(spawnX, spawnY);
    text.setAlpha(isPriority ? 0.98 : 0.86);
    text.setScale(1);
    text.setVisible(true);
    text.setActive(true);
    text.setData("damagePriority", isPriority);
    text.setData("damageSpawnAt", this.scene.time.now);

    const popTween = this.scene.tweens.add({
      targets: text,
      scaleX: isPriority ? 1.18 : 1.1,
      scaleY: isPriority ? 1.18 : 1.1,
      duration: isPriority ? 70 : 50,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        text.setData("damagePopTween", null);
      }
    });
    text.setData("damagePopTween", popTween);

    const tween = this.scene.tweens.add({
      targets: text,
      y: spawnY - risePx,
      alpha: 0,
      duration: lifetimeMs,
      ease: "Cubic.easeOut",
      onComplete: () => {
        text.setVisible(false);
        text.setActive(false);
        text.setData("damagePriority", false);
        text.setData("damageSpawnAt", 0);
        text.setData("damageTween", null);
        text.setData("damagePopTween", null);
      }
    });
    text.setData("damageTween", tween);
  }
}
