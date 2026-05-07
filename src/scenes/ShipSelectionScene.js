import {
  SHIP_CONFIGS,
  SHIP_KEYS,
  SHIP_PASSIVES,
  SHIP_STORAGE_KEY,
  loadShipStats,
  isShipUnlocked,
  getUnlockConditionText,
  getUnlockProgress
} from "../config/ships.js";
import {
  createMainMenuBackground,
  createVSTopBar,
  createVSBackButton,
  createVSPanel,
  createVSCard,
  createVSConfirmButton,
  createVSButton
} from "../ui/vsUI.js";
import { META_COINS_STORAGE_KEY } from "../config/storage-keys.js";

const UI_SFX_KEYS = {
  select: "sfx_sounds_pause7_in",
  confirm: "sfx_sounds_pause7_in",
  back: "sfx_sounds_pause7_out"
};

const UI_SFX_PATHS = {
  [UI_SFX_KEYS.select]: "assets/audio/sfx/sfx_sounds_pause7_in.wav",
  [UI_SFX_KEYS.back]: "assets/audio/sfx/sfx_sounds_pause7_out.wav"
};

export class ShipSelectionScene extends Phaser.Scene {
  constructor() {
    super("ShipSelectionScene");
  }

  playUiSfx(type, rate = 1) {
    if (!this.sound || !this.cache.audio.exists(type)) return;
    const sfxVol = this.settingsSfxVol ?? 1;
    if (sfxVol <= 0.001) return;
    this.sound.play(type, { volume: Phaser.Math.Clamp(sfxVol * 0.6, 0.01, 1), rate });
  }

  showToast(message) {
    const cx = 640;
    const cy = 360;
    const toast = this.add.rectangle(cx, cy, 300, 60, 0x2a2a4a, 0.98)
      .setStrokeStyle(2, 0xc4a040, 1)
      .setDepth(9999);
    const text = this.add.text(cx, cy, message, {
      fontFamily: "ZpixOne", fontSize: "18px", color: "#fef08a",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(9999);

    this.time.delayedCall(1500, () => {
      toast.destroy();
      text.destroy();
    });
  }

  init(data) {
    this.pendingMode = data?.mode || "solo";
  }

  preload() {
    if (!this.textures.exists("main_menu_bg")) {
      this.load.image("main_menu_bg", "assets/sprites/ui/Home Page Background.png");
    }
    SHIP_KEYS.forEach((key) => {
      const cfg = SHIP_CONFIGS[key];
      if (cfg.textureKey && !this.textures.exists(cfg.textureKey)) {
        this.load.image(cfg.textureKey, `assets/sprites/player/${cfg.textureKey}.png`);
      }
    });
    if (!this.cache.audio.exists(UI_SFX_KEYS.select)) {
      this.load.audio(UI_SFX_KEYS.select, UI_SFX_PATHS[UI_SFX_KEYS.select]);
    }
    if (!this.cache.audio.exists(UI_SFX_KEYS.back)) {
      this.load.audio(UI_SFX_KEYS.back, UI_SFX_PATHS[UI_SFX_KEYS.back]);
    }
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;

    // ── Background ──
    createMainMenuBackground(this);

    // ── Top bar ──
    const coins = this.loadCoins();
    const goBack = () => {
      this.playUiSfx(UI_SFX_KEYS.back);
      this.time.delayedCall(80, () => {
        this.scene.start("MainMenuScene", { fromShipSelection: true });
      });
    };
    this.topBar = createVSTopBar(this, {
      coins,
      showBack: true,
      onBack: goBack
    });

    if (this.input?.keyboard) {
      this.input.keyboard.on("keydown-ESC", goBack);
    }

//========== 角色选择面板尺寸 ==========
    // 面板宽度（默认700）
    const panelW = 700;
    // 面板高度（默认500）
    const panelH = 500;
    // 垂直位置（默认cy + 20）
    const panelCenterY = cy + 20;
    // 面板顶部Y
    const panelTop = panelCenterY - panelH / 2;
    // 面板底部Y
    const panelBottom = panelCenterY + panelH / 2;
    createVSPanel(this, cx, panelCenterY, panelW, panelH);

    //========== 标题 ==========
    // Y偏移42（面板顶部往下42px）| 字号28px
    this.add.text(cx, panelTop + 42, "角色选择", {
      fontFamily: "ZpixOne", fontSize: "28px", color: "#fef08a",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);

    // ── Load stats ──
    this.shipStats = loadShipStats();
    this.selectedShipId = null;
    this.shipCards = [];
    this.detailObjects = null;

    //========== 飞船卡片网格 ==========
    // 列数（默认4列）
    const cols = 4;
    // 卡片宽度（默认148）
    const cardW = 148;
    // 卡片高度（默认120）
    const cardH = 120;
    // 水平间距（默认10）
    const gapX = 10;
    // 垂直间距（默认8）
    const gapY = 8;
    // 网格总宽度
    const gridW = cols * cardW + (cols - 1) * gapX;
    // 网格起始X（居中）
    const startX = cx - gridW / 2 + cardW / 2;
    // 网格起始Y（默认panelTop + 128）
    const startY = panelTop + 128;

    SHIP_KEYS.forEach((key, index) => {
      const config = SHIP_CONFIGS[key];
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.createShipCard(x, y, cardW, cardH, config);
    });

    //========== 详情面板 ==========
    // 高度88 | Y位置panelBottom - 52
    this.createDetailPanel(cx, panelBottom - 52, panelW - 30, 88);

    createVSConfirmButton(this, cx + 250, panelBottom - 50, "确认", () => {
      if (!this.selectedShipId) {
        this.updateDetailPanel(null, "请先选择一个角色", true);
        return;
      }
      this.playUiSfx(UI_SFX_KEYS.confirm, 1.2);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(SHIP_STORAGE_KEY, this.selectedShipId);
      }
      if (this.pendingMode === "coop") {
        const token = window.localStorage.getItem("forgeduel_token") || "";
        const user = JSON.parse(window.localStorage.getItem("forgeduel_user") || "null");
        this.scene.start("LobbyScene", {
          mode: "select",
          selectedShip: this.selectedShipId,
          fighterType: this.selectedShipId,
          authToken: token,
          authUser: user
        });
      } else {
        this.scene.start("GameScene", { selectedShip: this.selectedShipId });
      }
    });
  }

  createShipCard(x, y, w, h, config) {
    const unlocked = isShipUnlocked(config.id, this.shipStats);
    const tint = config.tint;

    const { container, bg } = createVSCard(this, x, y, w, h, {
      onClick: () => {
        if (!unlocked) {
          const unlockText = getUnlockConditionText(config.id);
          this.showToast(`解锁条件: ${unlockText}`);
          return;
        }
        this.playUiSfx(UI_SFX_KEYS.select);
        this.selectShip(config.id);
      }
    });

    const iconSize = 48;
    const iconBg = this.add.rectangle(0, 0, iconSize + 4, iconSize + 4, 0x1a1a2a, 1)
      .setStrokeStyle(2, unlocked ? tint : 0x555555, unlocked ? 1 : 0.4);
    container.add(iconBg);

    const textureKey = config.textureKey;
    let shipImage;
    if (textureKey && this.textures.exists(textureKey)) {
      const texture = this.textures.get(textureKey);
      const srcW = texture.getSourceImage().width || 68;
      const srcH = texture.getSourceImage().height || 68;
      const maxDisplay = 40;
      const scale = Math.min(maxDisplay / srcW, maxDisplay / srcH);
      shipImage = this.add.image(0, 0, textureKey).setScale(scale).setRotation(Math.PI / 2);
      if (!unlocked) {
        shipImage.setTint(0x888888).setAlpha(0.5);
      }
      container.add(shipImage);
    } else {
      const icon = this.add.rectangle(0, 0, iconSize, iconSize, tint, unlocked ? 0.8 : 0.2);
      container.add(icon);
    }

    const weaponLabels = { dagger: "🗡️", fireball: "🔥", lightning: "⚡", orbit_blades: "🌀" };
    const wepIcon = this.add.text(w / 2 - 18, h / 2 - 18,
      weaponLabels[config.initialWeapon] || "⚔️", {
      fontFamily: "ZpixOne", fontSize: "16px"
    }).setOrigin(0.5);
    if (!unlocked) wepIcon.setAlpha(0.3);
    container.add(wepIcon);
    //选择界面位置（x，y）
    const nameColor = unlocked ? "#ffffff" : "#667788";
    const nameText = this.add.text(0, 40, config.name, {
      fontFamily: "ZpixOne", fontSize: "16px", color: nameColor,
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);
    container.add(nameText);

    if (!unlocked) {
      const lockOverlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.5).setOrigin(0.5);
      const lockText = this.add.text(0, -4, "🔒", {
        fontFamily: "ZpixOne", fontSize: "20px"
      }).setOrigin(0.5);
      container.add([lockOverlay, lockText]);
    //进度条未解锁
      const progress = getUnlockProgress(config.id, this.shipStats);
      if (progress) {
        const ratio = Math.min(1, progress.current / progress.target);
        const barW = w - 16;
        const barH = 6;
        const barY = h / 2 - 110;
        const barBg = this.add.rectangle(0, barY, barW, barH, 0x1a1a2a, 0.8).setOrigin(0.5);
        const barFill = this.add.rectangle(-barW / 2, barY, barW * ratio, barH, 0xc4a040, 1).setOrigin(0, 0.5);
        const progText = this.add.text(0, barY + 8, `${progress.current}/${progress.target}`, {
          fontFamily: "ZpixOne", fontSize: "8px", color: "#a0a0b0",
          stroke: "#000000", strokeThickness: 2
        }).setOrigin(0.5);
        container.add([barBg, barFill, progText]);
      }
    }

    this.shipCards.push({ id: config.id, bg, container, unlocked, config });
  }

  selectShip(shipId) {
    this.selectedShipId = shipId;

    // Update card highlights
    this.shipCards.forEach((entry) => {
      if (entry.id === shipId) {
        entry.bg.setStrokeStyle(3, 0xffffff, 1);
      } else {
        entry.bg.setStrokeStyle(2, 0xc4a040, entry.unlocked ? 0.9 : 0.4);
      }
    });

    const config = SHIP_CONFIGS[shipId];
    this.updateDetailPanel(config, null, false);
  }
  //============================================
  // 飞船详情面板 - 创建 (Vampire Survivors 简洁风格)
  //============================================
  createDetailPanel(x, y, w, h) {
    const container = this.add.container(x, y);

    // 面板背景
    const bg = this.add.rectangle(0, 0, w, h, 0x4a4a5a, 1)
      .setStrokeStyle(2, 0xc4a040, 1)
      .setOrigin(0.5);
    const inner = this.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
      .setStrokeStyle(1, 0x8a7a3a, 0.6)
      .setOrigin(0.5);
    container.add([bg, inner]);

    const leftX = -w / 2 + 14;
    const iconX = leftX + 24;
    const textX = leftX + 56;

    // 飞船图标 — 左侧垂直居中
    const iconBg = this.add.rectangle(iconX, 0, 52, 52, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0xc4a040, 1).setOrigin(0.5);
    const icon = this.add.rectangle(iconX, 0, 46, 46, 0x888888, 0.5).setOrigin(0.5);
    container.add([iconBg, icon]);
    const detailShipImage = this.add.image(iconX, 0, "").setOrigin(0.5).setVisible(false);
    container.add(detailShipImage);

    // 名称 — 大字，图标右侧上方
    const nameText = this.add.text(textX, -20, "", {
      fontFamily: "ZpixOne", fontSize: "18px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 3
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // 一句话概括 — tagline，名称下方
    const taglineText = this.add.text(textX, 2, "", {
      fontFamily: "ZpixOne", fontSize: "13px", color: "#fef08a",
      stroke: "#000000", strokeThickness: 3
    }).setOrigin(0, 0.5);
    container.add(taglineText);

    // 被动信息行 — tagline 下方
    const passiveText = this.add.text(textX, 22, "", {
      fontFamily: "ZpixOne", fontSize: "9px", color: "#c4a040",
      stroke: "#1a1a2a", strokeThickness: 1
    }).setOrigin(0, 0.5);
    container.add(passiveText);

    // 难度星级 — 面板右侧上方
    const diffText = this.add.text(w / 2 - 24, -24, "", {
      fontFamily: "ZpixOne", fontSize: "9px", color: "#fef08a",
      stroke: "#1a1a2a", strokeThickness: 2
    }).setOrigin(1, 0.5);
    container.add(diffText);

    // 解锁状态 — 面板右侧上方（难度旁边）
    const statusText = this.add.text(w / 2 - 90, -24, "", {
      fontFamily: "ZpixOne", fontSize: "9px", color: "#88ff88",
      stroke: "#1a1a2a", strokeThickness: 2
    }).setOrigin(1, 0.5);
    container.add(statusText);

    this.detailObjects = {
      container, icon, detailShipImage,
      nameText, taglineText, passiveText, diffText, statusText,
      extraObjects: [], panelW: w
    };
  }

  //============================================
  // 飞船详情面板 - 更新
  //============================================
  updateDetailPanel(config, errorMsg, isError) {
    const detail = this.detailObjects;
    if (!detail) return;

    // 清除旧的额外元素
    if (detail.extraObjects) {
      detail.extraObjects.forEach((obj) => { if (obj && obj.destroy) obj.destroy(); });
      detail.extraObjects = [];
    }

    // 错误状态
    if (errorMsg) {
      detail.nameText.setText("");
      detail.taglineText.setText("");
      detail.passiveText.setText("");
      detail.diffText.setText("");
      detail.statusText.setText(errorMsg);
      detail.statusText.setColor(isError ? "#ff8888" : "#88ff88");
      detail.icon.setFillStyle(0x888888, 0.5).setVisible(true);
      detail.detailShipImage.setVisible(false);
      return;
    }

    if (!config) return;

    // 更新名称和图标
    detail.nameText.setText(config.name);
    if (config.textureKey && this.textures.exists(config.textureKey)) {
      const texture = this.textures.get(config.textureKey);
      const srcW = texture.getSourceImage().width || 68;
      const srcH = texture.getSourceImage().height || 68;
      const maxDisplay = 44;
      const scale = Math.min(maxDisplay / srcW, maxDisplay / srcH);
      detail.detailShipImage.setTexture(config.textureKey).setScale(scale).setRotation(Math.PI / 2).setVisible(true);
      detail.detailShipImage.clearTint();
      detail.icon.setVisible(false);
    } else {
      detail.detailShipImage.setVisible(false);
      detail.icon.setFillStyle(config.tint, 0.8).setVisible(true);
    }

    // 一句话概括
    detail.taglineText.setText(config.tagline || "");

    // 被动信息
    if (config.passive) {
      const passive = SHIP_PASSIVES[config.passive];
      if (passive) {
        detail.passiveText.setText(`被动: ${passive.name} — ${passive.description}`);
      } else {
        detail.passiveText.setText("");
      }
    } else {
      detail.passiveText.setText("");
    }

    // 难度星级
    if (config.difficulty) {
      const stars = "★".repeat(config.difficulty) + "☆".repeat(5 - config.difficulty);
      detail.diffText.setText(stars);
    } else {
      detail.diffText.setText("");
    }

    // 解锁状态
    const unlocked = isShipUnlocked(config.id, this.shipStats);
    if (!unlocked) {
      const progress = getUnlockProgress(config.id, this.shipStats);
      const unlockText = getUnlockConditionText(config.id);
      let progressStr = "";
      if (progress) {
        progressStr = ` (${progress.current}/${progress.target})`;
      }
      detail.statusText.setColor("#c4a040");
      detail.statusText.setText(`${unlockText}${progressStr}`);
    } else {
      detail.statusText.setColor("#88ff88");
      detail.statusText.setText("已解锁 ✓");
    }
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const parsed = Number(window.localStorage.getItem(META_COINS_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }
}
