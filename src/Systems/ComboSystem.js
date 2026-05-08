import { COMBO_RESET_WINDOW_MS, COMBO_TEXT_SCALE, COMBO_TEXT_FADE_TIME_MS } from "../config/combo.js";
import { HUD_COMBO_STYLE } from "../config/hud.js";

export class ComboSystem {
  constructor(scene) {
    this.scene = scene;
    this.killCombo = 0;
    this.lastKillAtMs = Number.NEGATIVE_INFINITY;
    this.maxKillCombo = 0;
    this.killCounterPulseTween = null;
  }

  updateKillCombo() {
    const nowMs = this.scene.time?.now ?? 0;
    if (nowMs - this.lastKillAtMs > COMBO_RESET_WINDOW_MS) {
      this.killCombo = 0;
    }
    this.killCombo += 1;
    this.maxKillCombo = Math.max(this.maxKillCombo, this.killCombo);
    this.lastKillAtMs = nowMs;

    if (this.killCombo < 3) {
      return;
    }

    let label = `x${this.killCombo} COMBO`;
    if (this.killCombo >= 10) {
      label = `x${this.killCombo} RAMPAGE`;
    }

    const comboText = this.scene.acquireHudAlertText("combo");
    if (!comboText) {
      return;
    }

    comboText.setStyle(HUD_COMBO_STYLE);
    comboText.setPosition(1260, 28);
    comboText.setDepth(25);
    comboText.setText(label);
    comboText.setAlpha(1);
    comboText.setScale(COMBO_TEXT_SCALE);

    const tween = this.scene.tweens.add({
      targets: comboText,
      y: 14,
      scale: COMBO_TEXT_SCALE,
      alpha: 0,
      duration: COMBO_TEXT_FADE_TIME_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.scene.releaseHudAlertText(comboText);
      }
    });
    comboText.setData("alertTween", tween);
  }

  playKillCounterPulse() {
    if (!this.scene.killText || !this.scene.tweens) {
      return;
    }

    if (this.killCounterPulseTween) {
      this.killCounterPulseTween.stop();
      this.killCounterPulseTween = null;
    }

    this.scene.killText.setScale(1);
    this.killCounterPulseTween = this.scene.tweens.add({
      targets: this.scene.killText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 50,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        this.scene.killText?.setScale(1);
        this.killCounterPulseTween = null;
      }
    });
  }
}
