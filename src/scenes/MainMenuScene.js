import { FIGHTER_CONFIGS, FIGHTER_KEYS, FIGHTER_STORAGE_KEY } from "../config/fighters.js";

const COIN_STORAGE_KEY = "forgeduel_coins";
const BEST_TIME_STORAGE_KEY = "forgeduel_best_time_ms";
const MENU_ATLAS_KEY = "ui_atlas";
const MENU_ATLAS_IMAGE = "assets/atlas/ui_atlas.png";
const MENU_ATLAS_DATA = "assets/atlas/ui_atlas.json";
const SHARED_AUDIO_FILES = {
  dash: "assets/audio/sfx/dash.wav",
  enemy_hit: "assets/audio/sfx/enemy_hit.wav",
  enemy_death: "assets/audio/sfx/enemy_die.wav",
  level_up: "assets/audio/sfx/level_up.wav",
  boss_warning: "assets/audio/sfx/boss_warning.wav"
};

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  preload() {
    this.bindLoadingScreenProgress();

    if (!this.textures.exists(MENU_ATLAS_KEY)) {
      this.load.atlas(MENU_ATLAS_KEY, MENU_ATLAS_IMAGE, MENU_ATLAS_DATA);
    }

    Object.entries(SHARED_AUDIO_FILES).forEach(([key, path]) => {
      if (this.cache?.audio?.exists(key)) {
        return;
      }
      this.load.audio(key, path);
    });
  }

  create() {
    const camera = this.cameras.main;
    const centerX = camera.width * 0.5;
    const centerY = camera.height * 0.5;

    this.add.rectangle(centerX, centerY, camera.width, camera.height, 0x071120, 1);
    for (let y = 0; y < camera.height; y += 32) {
      const color = Math.floor(y / 32) % 2 === 0 ? 0x0d1a31 : 0x11213d;
      this.add.rectangle(centerX, y + 16, camera.width, 30, color, 1).setOrigin(0.5);
    }
    this.add.rectangle(centerX, centerY, camera.width - 84, camera.height - 92, 0x10203a, 0.9).setStrokeStyle(4, 0x5ca7ff, 1);
    this.add.rectangle(centerX, centerY, camera.width - 96, camera.height - 104, 0x0b1830, 0).setStrokeStyle(2, 0x9bd3ff, 0.9);
    if (this.textures.exists(MENU_ATLAS_KEY)) {
      this.add.image(centerX, 62, MENU_ATLAS_KEY, "dot").setScale(18, 18).setTint(0x78c7ff).setAlpha(0.75);
    }

    this.add
      .text(centerX, 132, "ForgeDuel", {
        fontFamily: "Arial",
        fontSize: "64px",
        color: "#f8fbff",
        stroke: "#102640",
        strokeThickness: 8
      })
      .setOrigin(0.5);

    const bestTimeMs = this.loadBestTimeMs();
    const coins = this.loadCoins();
    this.add.rectangle(centerX, 226, 420, 54, 0x152947, 0.95).setStrokeStyle(2, 0x7bc3ff, 1);
    this.add
      .text(centerX, 226, `最佳时间: ${this.formatTime(bestTimeMs)}   金币: ${coins}`, {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#cfe9ff",
        stroke: "#0d1a2d",
        strokeThickness: 5
      })
      .setOrigin(0.5);

    this.createButton(centerX, 352, "开始游戏", () => {
      this.openFighterSelection();
    });

    this.createButton(centerX, 432, "升级商店", () => {
      this.scene.start("UpgradeScene");
    });

    this.fighterSelectionUi = [];

    this.hideLoadingScreen();
  }

  createButton(x, y, label, onClick) {
    const button = this.add
      .rectangle(x, y + 4, 292, 62, 0x0b1423, 0.95)
      .setStrokeStyle(2, 0x0b1423, 1)
      .setOrigin(0.5);
    const plate = this.add
      .rectangle(x, y, 280, 58, 0x1a324f, 1)
      .setStrokeStyle(3, 0x6ab8ff, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 268, 46, 0, 0).setStrokeStyle(1, 0xb8e0ff, 0.9).setOrigin(0.5);

    const text = this.add
      .text(x, y, label, {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#ffffff",
        stroke: "#0f1c2f",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const trigger = () => {
      if (typeof onClick === "function") {
        onClick();
      }
    };
    plate.on("pointerdown", trigger);
    text.on("pointerdown", trigger);
  }

  openFighterSelection() {
    if (this.fighterSelectionUi.length > 0) {
      return;
    }

    const camera = this.cameras.main;
    const centerX = camera.width * 0.5;
    const centerY = camera.height * 0.5;

    const backdrop = this.add.rectangle(centerX, centerY, camera.width, camera.height, 0x000000, 0.65).setDepth(100);
    const panel = this.add.rectangle(centerX, centerY, 700, 520, 0x10203a, 0.96).setStrokeStyle(3, 0x5ca7ff, 0.96).setDepth(101);
    const panelInner = this.add.rectangle(centerX, centerY, 672, 490, 0x0b1830, 0.94).setStrokeStyle(1, 0x3a7abf, 0.88).setDepth(102);

    const title = this.add.text(centerX, centerY - 218, "选择战机", {
      fontFamily: "Arial", fontSize: "36px", color: "#f8fbff", stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5).setDepth(103);

    const subtitle = this.add.text(centerX, centerY - 178, "每种战机拥有不同属性和特殊能力", {
      fontFamily: "Arial", fontSize: "16px", color: "#8ab8e0", stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0.5).setDepth(103);

    const uiElements = [backdrop, panel, panelInner, title, subtitle];

    const cardWidth = 300;
    const cardHeight = 180;
    const gap = 20;
    const cols = 2;
    const startX = centerX - (cols * cardWidth + (cols - 1) * gap) / 2 + cardWidth / 2;
    const startY = centerY - 40;

    FIGHTER_KEYS.forEach((key, index) => {
      const config = FIGHTER_CONFIGS[key];
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);

      const card = this.add.rectangle(x, y, cardWidth, cardHeight, 0x1a324f, 0.95).setStrokeStyle(2, 0x5ca7ff, 0.9).setDepth(103).setInteractive({ useHandCursor: true });
      const cardInner = this.add.rectangle(x, y, cardWidth - 12, cardHeight - 12, 0x0f2440, 0.9).setStrokeStyle(1, 0x3a7abf, 0.6).setDepth(104).setInteractive({ useHandCursor: true });

      const nameLabel = this.add.text(x, y - 62, config.label, {
        fontFamily: "Arial", fontSize: "24px", color: "#ffffff", stroke: "#0f1c2f", strokeThickness: 4
      }).setOrigin(0.5).setDepth(105).setInteractive({ useHandCursor: true });

      const descLabel = this.add.text(x, y - 34, config.description, {
        fontFamily: "Arial", fontSize: "13px", color: "#a8c8e8", stroke: "#0d1a2d", strokeThickness: 2
      }).setOrigin(0.5).setDepth(105);

      const stats = [
        `HP: ${config.hp}`,
        `速度: ${config.speed}`,
        `武器: ${this.getWeaponLabel(config.startingWeapon)}`
      ];
      const statsLabel = this.add.text(x, y + 6, stats.join("  |  "), {
        fontFamily: "Arial", fontSize: "13px", color: "#cfe9ff", stroke: "#0d1a2d", strokeThickness: 2
      }).setOrigin(0.5).setDepth(105);

      const evolutionLabel = this.add.text(x, y + 30, `Lv${config.evolutionLevel} 进化: ${config.evolution.label}`, {
        fontFamily: "Arial", fontSize: "12px", color: "#ffd866", stroke: "#0d1a2d", strokeThickness: 2
      }).setOrigin(0.5).setDepth(105);

      const selectFighter = () => {
        this.selectFighter(key);
      };
      card.on("pointerdown", selectFighter);
      cardInner.on("pointerdown", selectFighter);
      nameLabel.on("pointerdown", selectFighter);

      card.on("pointerover", () => { card.setStrokeStyle(3, 0x9bd3ff, 1); });
      card.on("pointerout", () => { card.setStrokeStyle(2, 0x5ca7ff, 0.9); });

      uiElements.push(card, cardInner, nameLabel, descLabel, statsLabel, evolutionLabel);
    });

    const closeBtn = this.add.text(centerX + 320, centerY - 240, "✕", {
      fontFamily: "Arial", fontSize: "28px", color: "#ff8888", stroke: "#0d1a2d", strokeThickness: 3
    }).setOrigin(0.5).setDepth(105).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.closeFighterSelection());
    uiElements.push(closeBtn);

    this.fighterSelectionUi = uiElements;
  }

  getWeaponLabel(weaponType) {
    const labels = { dagger: "匕首", fireball: "火焰弹", lightning: "闪电", orbit_blades: "轨道刃" };
    return labels[weaponType] || weaponType;
  }

  selectFighter(fighterKey) {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(FIGHTER_STORAGE_KEY, fighterKey);
    }
    this.closeFighterSelection();
    this.scene.start("GameScene", { selectedFighter: fighterKey });
  }

  closeFighterSelection() {
    this.fighterSelectionUi.forEach((obj) => obj?.destroy?.());
    this.fighterSelectionUi = [];
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }
    const parsed = Number(window.localStorage.getItem(COIN_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  loadBestTimeMs() {
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }
    const parsed = Number(window.localStorage.getItem(BEST_TIME_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  formatTime(ms) {
    if (!ms || ms <= 0) {
      return "--:--";
    }
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  bindLoadingScreenProgress() {
    if (typeof document === "undefined") {
      return;
    }

    const subtitle = document.getElementById("loading-subtitle");
    const fill = document.getElementById("loading-bar-fill");
    this.load.on("progress", (value) => {
      if (fill) {
        fill.style.width = `${Math.round(value * 100)}%`;
      }
      if (subtitle) {
        subtitle.textContent = `Loading assets... ${Math.round(value * 100)}%`;
      }
    });
  }

  hideLoadingScreen() {
    if (typeof document === "undefined") {
      return;
    }

    const loadingScreen = document.getElementById("loading-screen");
    const fill = document.getElementById("loading-bar-fill");
    const subtitle = document.getElementById("loading-subtitle");
    if (fill) {
      fill.style.width = "100%";
    }
    if (subtitle) {
      subtitle.textContent = "Ready";
    }
    if (!loadingScreen) {
      return;
    }

    loadingScreen.classList.add("hidden");
    window.setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 260);
  }
}
