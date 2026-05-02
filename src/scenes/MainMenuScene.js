import {
  createVSBackground,
  createVSTopBar,
  createVSBackButton,
  createVSStartButton,
  createVSButton,
  createVSTitle,
  createVSFooter
} from "../ui/vsUI.js";

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

    this.currentSubScene = null;

    // ── Background ──
    createVSBackground(this);

    // ── Top bar ──
    const coins = this.loadCoins();
    this.topBar = createVSTopBar(this, {
      coins,
      showOptions: true,
      onOptions: () => {
        if (typeof window !== "undefined" && window.__forgeduelOpenSettings) {
          window.__forgeduelOpenSettings();
        }
      }
    });

    // ── Sub-menu back button (hidden by default) ──
    const backBtn = createVSBackButton(this, cam.width - 84, 36, () => {
      if (typeof window !== "undefined" && window.__forgeduelCloseSettings) {
        window.__forgeduelCloseSettings();
      }
      this.closeSubMenu();
    });
    backBtn.container.setVisible(false);
    this.backButton = backBtn;

    // ── Sub-menu overlay methods ──
    this.openSubMenu = (sceneKey, data) => {
      if (this.currentSubScene === sceneKey) return;
      if (this.currentSubScene) {
        this.scene.stop(this.currentSubScene);
      }
      this.currentSubScene = sceneKey;
      this.scene.launch(sceneKey, data);
      this.topBar.rightBtn.container.setVisible(false);
      this.backButton.container.setVisible(true);
    };

    this.closeSubMenu = () => {
      if (this.currentSubScene) {
        this.scene.stop(this.currentSubScene);
        this.currentSubScene = null;
      }
      this.backButton.container.setVisible(false);
      this.topBar.rightBtn.container.setVisible(true);
    };

    this.showBackButton = (show) => {
      if (show && !this.currentSubScene) {
        this.backButton.container.setVisible(true);
        this.topBar.rightBtn.container.setVisible(false);
      } else if (!show && !this.currentSubScene) {
        this.backButton.container.setVisible(false);
        this.topBar.rightBtn.container.setVisible(true);
      }
    };

    // ── Title ──
    createVSTitle(this, cx, cy - 140, "FORGE", { fontSize: "72px", color: "#f8fbff" });
    createVSTitle(this, cx, cy - 70, "DUEL", { fontSize: "56px", color: "#d4af37" });

    // ── Start button (large) ──
    createVSStartButton(this, cx, cy + 30, "开始", () => {
      this.scene.start("ShipSelectionScene", { mode: "solo" });
    });

    // ── Sub buttons row ──
    const subY = cy + 120;
    const subW = 160;
    const subH = 50;
    const subGap = 16;
    const totalSubW = 4 * subW + 3 * subGap;
    const subStartX = cx - totalSubW / 2 + subW / 2;

    const subButtons = [
      { label: "联机模式", onClick: () => {
        const token = typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem("forgeduel_token") : null;
        if (!token) {
          this.scene.start("AuthScene");
        } else {
          this.scene.start("ShipSelectionScene", { mode: "coop" });
        }
      }},
      { label: "增强", onClick: () => this.openSubMenu("UpgradeScene") },
      { label: "排行榜", onClick: () => this.openSubMenu("LeaderboardScene") },
      { label: "成就", onClick: () => {} }
    ];

    subButtons.forEach((btn, i) => {
      createVSButton(this, subStartX + i * (subW + subGap), subY, btn.label, {
        width: subW, height: subH, fontSize: "18px", onClick: btn.onClick
      });
    });

    // ── Footer ──
    createVSFooter(this);

    this.add.text(60, cam.height - 24, "v1.0", {
      fontFamily: "Zpix", fontSize: "12px", color: "#ffffff"
    }).setOrigin(0, 0.5).setAlpha(0.35);

    // Username display
    const authUser = this.loadAuthUser();
    if (authUser) {
      this.add.text(cx + 560, cam.height - 24, `👤 ${authUser.username}`, {
        fontFamily: "Zpix", fontSize: "12px", color: "#88ff88"
      }).setOrigin(1, 0.5).setAlpha(0.5);
    }

    this.hideLoadingScreen();
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


