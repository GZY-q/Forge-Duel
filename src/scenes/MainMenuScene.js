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
      if (this.cache?.audio?.exists(key)) return;
      this.load.audio(key, path);
    });
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;

    // --- Background: dark with red radial glow ---
    this.add.rectangle(cx, cy, cam.width, cam.height, 0x0a0000, 1);
    // Red glow layer (centered upper area)
    const glow = this.add.graphics();
    for (let i = 6; i >= 0; i--) {
      const radius = 200 + i * 60;
      const alpha = 0.04 * (7 - i);
      glow.fillStyle(0x660000, alpha);
      glow.fillEllipse(cx, cy - 40, radius * 2, radius * 1.6);
    }

    // --- Top bar: coin display (gold pill) ---
    const coins = this.loadCoins();
    const coinPillBg = this.add.rectangle(cx, 36, 180, 40, 0x000000, 0.9)
      .setStrokeStyle(4, 0xd4af37, 1).setOrigin(0.5);
    // Gold pixel-bevel inner highlight
    this.add.rectangle(cx, 36, 172, 32, 0, 0)
      .setStrokeStyle(1, 0xfef08a, 0.3).setOrigin(0.5);
    this.add.text(cx - 30, 36, `💰`, {
      fontFamily: "Zpix", fontSize: "20px"
    }).setOrigin(0.5);
    this.add.text(cx + 20, 36, `${coins}`, {
      fontFamily: "Zpix", fontSize: "22px", color: "#fef08a",
      stroke: "#3a2a06", strokeThickness: 3
    }).setOrigin(0.5);

    // --- Top right: settings button ---
    this.createSmallButton(cx + 560, 36, "设置", () => {
      if (typeof window !== "undefined" && window.__forgeduelOpenSettings) {
        window.__forgeduelOpenSettings();
      }
    });

    // --- Center: title ---
    // "FORGE" line
    this.add.text(cx, cy - 140, "FORGE", {
      fontFamily: "Zpix", fontSize: "72px", color: "#f8fbff",
      fontStyle: "bold",
      stroke: "#000000", strokeThickness: 10,
      shadow: { offsetX: 3, offsetY: 3, color: "#000", blur: 0, fill: true },
    }).setOrigin(0.5);
    // "DUEL" line (gold)
    this.add.text(cx, cy - 70, "DUEL", {
      fontFamily: "Zpix", fontSize: "56px", color: "#d4af37",
      fontStyle: "bold",
      stroke: "#000000", strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: "#000", blur: 0, fill: true },
    }).setOrigin(0.5);

    // --- Start button (large, gold border) ---
    this.createPixelButton(cx, cy + 30, "开始游戏", true, () => {
      this.scene.start("ShipSelectionScene", { mode: "solo" });
    });

    // --- Sub buttons row ---
    const subY = cy + 120;
    const subW = 180;
    const subGap = 20;
    const subStartX = cx - (subW * 1.5 + subGap);

    this.createPixelButton(subStartX, subY, "联机模式", false, () => {
      const token = typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem("forgeduel_token") : null;
      if (!token) {
        this.scene.start("AuthScene");
      } else {
        this.scene.start("ShipSelectionScene", { mode: "coop" });
      }
    }, 0x2d6e2d);

    this.createPixelButton(subStartX + subW + subGap, subY, "升级商店", false, () => {
      this.scene.start("UpgradeScene");
    });

    this.createPixelButton(subStartX + 2 * (subW + subGap), subY, "排行榜", false, () => {
      this.scene.start("LeaderboardScene");
    });

    this.createPixelButton(subStartX + 3 * (subW + subGap), subY, "成就", false, () => {
    });

    // --- Footer ---
    this.add.text(60, cam.height - 30, "v1.0", {
      fontFamily: "Zpix", fontSize: "12px", color: "#ffffff",
    }).setOrigin(0, 0.5).setAlpha(0.4);

    this.add.text(cx, cam.height - 30, "ForgeDuel © 2025", {
      fontFamily: "Zpix", fontSize: "12px", color: "#ffffff",
    }).setOrigin(0.5).setAlpha(0.4);

    // Username display
    const authUser = this.loadAuthUser();
    if (authUser) {
      this.add.text(cx + 560, cam.height - 30, `👤 ${authUser.username}`, {
        fontFamily: "Zpix", fontSize: "12px", color: "#88ff88"
      }).setOrigin(1, 0.5).setAlpha(0.5);
    }

    this.hideLoadingScreen();
  }

  createPixelButton(x, y, label, isLarge, onClick, fillColor) {
    const w = isLarge ? 320 : 180;
    const h = isLarge ? 64 : 46;
    const fontSize = isLarge ? "28px" : "18px";
    const bg = fillColor || 0x3b5998;
    const borderColor = 0xd4af37;

    // Shadow
    this.add.rectangle(x, y + 4, w, h, 0x000000, 0.6).setOrigin(0.5);

    // Main plate
    const plate = this.add.rectangle(x, y, w, h, bg, 1)
      .setStrokeStyle(4, borderColor, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Inner bevel highlight (pixel-art style)
    const bevel = this.add.rectangle(x, y, w - 8, h - 8, 0, 0)
      .setStrokeStyle(1, 0xffffff, 0.12)
      .setOrigin(0.5);

    // Text
    const text = this.add.text(x, y, label, {
      fontFamily: "Zpix", fontSize, color: "#ffffff",
      fontStyle: "bold",
      stroke: "#0a0a0a", strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Hover effects
    let hoverTween = null;
    let pulseTween = null;

    const onOver = () => {
      plate.setStrokeStyle(4, 0xfef08a, 1);
      plate.setScale(1.04);
      // Border pulse
      pulseTween = this.tweens.add({
        targets: plate,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      text.setColor("#fef08a");
    };

    const onOut = () => {
      plate.setStrokeStyle(4, borderColor, 1);
      plate.setScale(1);
      if (pulseTween) { pulseTween.stop(); pulseTween = null; }
      text.setColor("#ffffff");
    };

    plate.on("pointerover", onOver);
    plate.on("pointerout", onOut);
    text.on("pointerover", onOver);
    text.on("pointerout", onOut);

    const trigger = () => {
      // Tap feedback
      this.tweens.add({
        targets: [plate, text, bevel],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 60,
        yoyo: true,
        onComplete: () => {
          if (typeof onClick === "function") onClick();
        }
      });
    };
    plate.on("pointerdown", trigger);
    text.on("pointerdown", trigger);

    return plate;
  }

  createSmallButton(x, y, label, onClick) {
    const w = 80;
    const h = 34;

    const plate = this.add.rectangle(x, y, w, h, 0x3b5998, 1)
      .setStrokeStyle(3, 0xd4af37, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontFamily: "Zpix", fontSize: "14px", color: "#ffffff",
      fontStyle: "bold", stroke: "#0a0a0a", strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    plate.on("pointerover", () => {
      plate.setFillStyle(0x4a6aaa, 1);
      plate.setStrokeStyle(3, 0xfef08a, 1);
    });
    plate.on("pointerout", () => {
      plate.setFillStyle(0x3b5998, 1);
      plate.setStrokeStyle(3, 0xd4af37, 1);
    });

    const trigger = () => { if (typeof onClick === "function") onClick(); };
    plate.on("pointerdown", trigger);
    text.on("pointerdown", trigger);
  }

  loadAuthUser() {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem("forgeduel_user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const parsed = Number(window.localStorage.getItem(COIN_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  loadBestTimeMs() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const parsed = Number(window.localStorage.getItem(BEST_TIME_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  formatTime(ms) {
    if (!ms || ms <= 0) return "--:--";
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  bindLoadingScreenProgress() {
    if (typeof document === "undefined") return;
    const subtitle = document.getElementById("loading-subtitle");
    const fill = document.getElementById("loading-bar-fill");
    this.load.on("progress", (value) => {
      if (fill) fill.style.width = `${Math.round(value * 100)}%`;
      if (subtitle) subtitle.textContent = `Loading assets... ${Math.round(value * 100)}%`;
    });
  }

  hideLoadingScreen() {
    if (typeof document === "undefined") return;
    const loadingScreen = document.getElementById("loading-screen");
    const fill = document.getElementById("loading-bar-fill");
    const subtitle = document.getElementById("loading-subtitle");
    if (fill) fill.style.width = "100%";
    if (subtitle) subtitle.textContent = "Ready";
    if (!loadingScreen) return;
    loadingScreen.classList.add("hidden");
    window.setTimeout(() => { loadingScreen.style.display = "none"; }, 260);
  }
}
