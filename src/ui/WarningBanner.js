import { WARNING_BANNER_STYLE, HUD_ALERT_STYLE, HUD_ALERT_POOL_SIZE } from "../config/hud.js";
import { RENDER_DEPTH } from "../config/render-layers.js";

export class WarningBanner {
  constructor(scene) {
    this.scene = scene;
    this.activeBanner = null;
    this.hudAlertPool = [];

    for (let i = 0; i < HUD_ALERT_POOL_SIZE; i += 1) {
      const text = this.scene.add
        .text(640, 74, "", HUD_ALERT_STYLE)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.HUD + 4)
        .setVisible(false)
        .setActive(false);
      text.setData("alertKind", null);
      text.setData("alertTween", null);
      text.setData("alertHideEvent", null);
      this.hudAlertPool.push(text);
    }
  }

  clearWarningBanner() {
    const banner = this.activeBanner;
    if (!banner) {
      return;
    }

    const tween = banner.getData?.("bannerTween");
    if (tween) {
      tween.stop();
    }
    const hideEvent = banner.getData?.("bannerHideEvent");
    if (hideEvent) {
      hideEvent.remove(false);
    }

    banner.destroy();
    this.activeBanner = null;
  }

  showWarningBanner(message, options = {}) {
    if (!this.scene.add || !this.scene.tweens) {
      return;
    }

    this.clearWarningBanner();

    const tone = options.tone ?? "boss";
    const durationMs = Math.max(850, Number(options.durationMs) || 1400);
    const centerX = Math.round((this.scene.scale?.width ?? 1280) * 0.5);
    const centerY = Math.round(Math.max(116, (this.scene.scale?.height ?? 720) * 0.16));
    const palette =
      tone === "mini"
        ? {
            border: 0xe7b76a,
            glow: 0xffcf7f,
            fill: 0x3c2415,
            inner: 0x1b120d
          }
        : tone === "approach"
          ? {
              border: 0xffd5a1,
              glow: 0xffe8c4,
              fill: 0x4a1a13,
              inner: 0x23110f
            }
          : {
              border: 0xffb36b,
              glow: 0xffd6a0,
              fill: 0x531510,
              inner: 0x24100d
            };

    const label = this.scene.add
      .text(0, 0, message, WARNING_BANNER_STYLE)
      .setOrigin(0.5)
      .setShadow(0, 2, "#140804", 4, true, true);

    const padX = 28;
    const padY = 12;
    const width = Math.ceil(label.width + padX * 2);
    const height = Math.ceil(label.height + padY * 2);

    const outer = this.scene.add
      .rectangle(0, 0, width, height, palette.fill, 0.9)
      .setStrokeStyle(2, palette.border, 0.98);
    const inner = this.scene.add
      .rectangle(0, 0, width - 10, height - 10, palette.inner, 0.88)
      .setStrokeStyle(1, palette.glow, 0.42);
    const accentTop = this.scene.add.rectangle(0, -height * 0.5 + 4, width - 18, 3, palette.glow, 0.75);
    const accentBottom = this.scene.add.rectangle(0, height * 0.5 - 4, width - 18, 3, palette.border, 0.62);

    const container = this.scene.add
      .container(centerX, centerY, [outer, inner, accentTop, accentBottom, label])
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 8)
      .setAlpha(0)
      .setScale(0.92);

    this.activeBanner = container;

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 130,
      ease: "Back.Out"
    });

    const hideEvent = this.scene.time.delayedCall(durationMs, () => {
      const hideTween = this.scene.tweens.add({
        targets: container,
        alpha: 0,
        y: centerY - 12,
        duration: 180,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (this.activeBanner === container) {
            this.activeBanner = null;
          }
          container.destroy();
        }
      });
      container.setData("bannerTween", hideTween);
    });

    container.setData("bannerHideEvent", hideEvent);
  }

  releaseHudAlertText(text) {
    if (!text) {
      return;
    }

    const alertTween = text.getData("alertTween");
    if (alertTween) {
      alertTween.stop();
    }
    const hideEvent = text.getData("alertHideEvent");
    if (hideEvent) {
      hideEvent.remove(false);
    }

    text.setData("alertTween", null);
    text.setData("alertHideEvent", null);
    text.setData("alertKind", null);
    text.setAlpha(1);
    text.setScale(1);
    text.setVisible(false);
    text.setActive(false);
  }

  acquireHudAlertText(kind) {
    if (!Array.isArray(this.hudAlertPool) || this.hudAlertPool.length === 0) {
      return null;
    }

    let text = this.hudAlertPool.find((entry) => entry.active && entry.getData("alertKind") === kind);
    if (!text) {
      text = this.hudAlertPool.find((entry) => !entry.active);
    }
    if (!text) {
      text = this.hudAlertPool[0];
    }
    if (!text) {
      return null;
    }

    this.releaseHudAlertText(text);
    text.setData("alertKind", kind);
    text.setVisible(true);
    text.setActive(true);
    return text;
  }

  showHudAlert(message, durationMs = 1600) {
    const text = this.acquireHudAlertText("center_alert");
    if (!text) {
      return;
    }

    text.setStyle(HUD_ALERT_STYLE);
    text.setPosition(640, 74);
    text.setDepth(RENDER_DEPTH.HUD + 4);
    text.setText(message);

    const hideEvent = this.scene.time.delayedCall(durationMs, () => {
      this.releaseHudAlertText(text);
    });
    text.setData("alertHideEvent", hideEvent);
  }

  showStageAnnouncement(text, color = "#ffcc44") {
    const cx = 640;
    const cy = 300;
    const depth = RENDER_DEPTH.HUD + 10;

    const overlay = this.scene.add.rectangle(cx, cy, 500, 60, 0x000000, 0.6)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8)
      .setScrollFactor(0).setDepth(depth).setAlpha(0);

    const label = this.scene.add.text(cx, cy, text, {
      fontFamily: "ZpixOne", fontSize: "28px", color,
      stroke: "#000000", strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0);

    this.scene.tweens.add({ targets: [overlay, label], alpha: 1, duration: 300, ease: "Quad.easeOut" });

    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: [overlay, label], alpha: 0, duration: 500, ease: "Quad.easeIn",
        onComplete: () => { overlay.destroy(); label.destroy(); }
      });
    });
  }
}
