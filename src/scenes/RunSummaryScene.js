const UI_LAYER_ORDER = Object.freeze({
  GAME_WORLD: 0,
  COMBAT_UI: 40,
  HUD: 1000,
  OVERLAY: 1999,
  RUN_SUMMARY: 2000
});

export class RunSummaryScene extends Phaser.Scene {
  constructor() {
    super("RunSummaryScene");
  }

  create(data = {}) {
    // Disable GameScene input while summary is active
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.input.enabled = false;
    }

    const camera = this.cameras.main;
    const centerX = camera.width * 0.5;
    const centerY = camera.height * 0.5;
    const cardWidth = 440;
    const panelPadding = 32;
    const titleMarginBottom = 20;
    const statLineSpacing = 16;
    const buttonGap = 16;
    const primaryButtonWidth = 260;
    const primaryButtonHeight = 56;
    const secondaryButtonWidth = 220;
    const secondaryButtonHeight = 48;
    const statsContainerHeight = 230;
    const buttonStackHeight = primaryButtonHeight + secondaryButtonHeight + buttonGap;
    const cardHeight = panelPadding + 40 + titleMarginBottom + statsContainerHeight + 20 + buttonStackHeight + panelPadding;

    const stats = {
      timeSurvivedMs: data.timeSurvivedMs ?? 0,
      enemiesKilled: data.enemiesKilled ?? 0,
      maxCombo: data.maxCombo ?? 0,
      levelReached: data.levelReached ?? 1,
      coinsEarned: data.coinsEarned ?? 0,
      totalCoins: this.resolveTotalCoins(data.totalCoins)
    };

    this.add
      .rectangle(centerX, centerY, camera.width, camera.height, 0x000000, 0.65)
      .setDepth(UI_LAYER_ORDER.OVERLAY);
    this.add
      .rectangle(centerX, centerY, cardWidth + 16, cardHeight + 16, 0x1a0508, 0.98)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY);
    this.add
      .rectangle(centerX, centerY, cardWidth, cardHeight, 0x2a2a3a, 0.98)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY);
    this.add
      .rectangle(centerX, centerY, cardWidth, cardHeight, 0, 0)
      .setStrokeStyle(4, 0xc4a040, 1)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 1);
    this.add
      .rectangle(centerX, centerY, cardWidth - 12, cardHeight - 12, 0, 0)
      .setStrokeStyle(2, 0x8a7a3a, 0.95)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 1);

    const panelContainer = this.add.container(centerX, centerY).setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 2);
    const panelTop = -cardHeight * 0.5;
    const panelBottom = cardHeight * 0.5;

    const titleText = this.add
      .text(0, panelTop + panelPadding, "战斗总结", {
        fontFamily: "Zpix",
        fontSize: "34px",
        color: "#ffffff",
        stroke: "#0b1220",
        strokeThickness: 5
      })
      .setOrigin(0.5, 0);

    const lines = [
      `存活时间: ${this.formatTime(stats.timeSurvivedMs)}`,
      `击杀敌人: ${stats.enemiesKilled}`,
      `最大连击: x${stats.maxCombo}`,
      `最高等级: ${stats.levelReached}`,
      `获得金币: +${stats.coinsEarned}`,
      `金币余额: ${stats.totalCoins}`
    ];

    const titleBottomY = titleText.y + titleText.height;
    const statsTopY = titleBottomY + titleMarginBottom;
    const statsCenterY = statsTopY + statsContainerHeight * 0.5;
    const statsBg = this.add.rectangle(0, statsCenterY, 360, statsContainerHeight, 0x2a2a3a, 0.92);
    statsBg.setStrokeStyle(2, 0xc4a040, 1);
    const statsText = this.add
      .text(0, statsCenterY, lines.join("\n"), {
        fontFamily: "Zpix",
        fontSize: "21px",
        color: "#f3f7ff",
        align: "center",
        lineSpacing: statLineSpacing
      })
      .setOrigin(0.5, 0.5);

    const buttonsContainerTop = panelBottom - panelPadding - buttonStackHeight;
    const retryY = buttonsContainerTop + primaryButtonHeight * 0.5;
    const menuY = retryY + primaryButtonHeight * 0.5 + buttonGap + secondaryButtonHeight * 0.5;
    panelContainer.add([titleText, statsBg, statsText]);

    this.createActionButton(centerX, centerY + retryY, "重新开始", () => {
      this.scene.stop("RunSummaryScene");
      this.scene.stop("GameScene");
      const selectedShip = this.resolveSelectedShip();
      this.scene.start("GameScene", selectedShip ? { selectedShip } : undefined);
    }, { variant: "primary", width: primaryButtonWidth, height: primaryButtonHeight });

    this.createActionButton(centerX, centerY + menuY, "返回主页", () => {
      this.scene.stop("RunSummaryScene");
      this.scene.stop("GameScene");
      this.scene.start("MainMenuScene");
    }, { variant: "secondary", width: secondaryButtonWidth, height: secondaryButtonHeight });
  }

  createActionButton(x, y, label, onClick, options = {}) {
    const variant = options.variant === "primary" ? "primary" : "secondary";
    const width = Number.isFinite(options.width) ? options.width : variant === "primary" ? 260 : 220;
    const height = Number.isFinite(options.height) ? options.height : variant === "primary" ? 56 : 48;
    const baseFill = variant === "primary" ? 0x3b5998 : 0x2a2a4a;
    const baseStroke = variant === "primary" ? 0xc4a040 : 0x8a7a3a;
    const hoverFill = this.adjustHexBrightness(baseFill, variant === "primary" ? 0.08 : 0.06);
    const hoverStroke = this.adjustHexBrightness(baseStroke, variant === "primary" ? 0.08 : 0.06);

    const shadow = this.add
      .rectangle(x, y + 3, width + 12, height + 8, 0x0b1423, 0.95)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 1);
    const bg = this.add
      .rectangle(x, y, width, height, baseFill, 1)
      .setStrokeStyle(3, baseStroke, 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 2);
    this.add
      .rectangle(x, y, width - 10, height - 10, 0, 0)
      .setStrokeStyle(1, 0xc4a040, 0.3)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 2);
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Zpix",
        fontSize: variant === "primary" ? "26px" : "22px",
        color: "#ffffff",
        stroke: "#0e1a2a",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(UI_LAYER_ORDER.RUN_SUMMARY + 3);

    const trigger = () => {
      if (typeof onClick === "function") {
        onClick();
      }
    };

    bg.on("pointerover", () => {
      bg.setFillStyle(hoverFill, 1);
      bg.setStrokeStyle(3, hoverStroke, 1);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(baseFill, 1);
      bg.setStrokeStyle(3, baseStroke, 1);
    });
    bg.on("pointerdown", trigger);
    shadow.setData("decorative", true);
  }

  adjustHexBrightness(hexColor, ratio) {
    const color = Number.isFinite(hexColor) ? hexColor : 0x000000;
    const factor = Math.max(0, Number(ratio) || 0);
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const nr = Math.min(255, Math.round(r * (1 + factor)));
    const ng = Math.min(255, Math.round(g * (1 + factor)));
    const nb = Math.min(255, Math.round(b * (1 + factor)));
    return (nr << 16) | (ng << 8) | nb;
  }

  formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  resolveTotalCoins(payloadCoins) {
    if (Number.isFinite(payloadCoins) && payloadCoins >= 0) {
      return Math.floor(payloadCoins);
    }
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }

    const raw = window.localStorage.getItem("forgeduel_coins");
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  resolveSelectedShip() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem("forgeduel_selected_ship") || null;
  }
}
