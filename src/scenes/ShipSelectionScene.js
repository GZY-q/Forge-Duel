import {
  SHIP_CONFIGS,
  SHIP_KEYS,
  SHIP_STORAGE_KEY,
  loadShipStats,
  isShipUnlocked,
  getUnlockConditionText,
  getUnlockProgress
} from "../config/ships.js";
import {
  createVSBackground,
  createVSTopBar,
  createVSBackButton,
  createVSPanel,
  createVSCard,
  createVSConfirmButton,
  createVSButton
} from "../ui/vsUI.js";

const COIN_STORAGE_KEY = "forgeduel_coins";

export class ShipSelectionScene extends Phaser.Scene {
  constructor() {
    super("ShipSelectionScene");
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

  create() {
    const cam = this.cameras.main;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;

    // ── Background ──
    createVSBackground(this);

    // ── Top bar ──
    const coins = this.loadCoins();
    const goBack = () => this.scene.start("MainMenuScene");
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

    createVSConfirmButton(this, cx + 250, panelBottom - 70, "确认", () => {
      if (!this.selectedShipId) {
        this.updateDetailPanel(null, "请先选择一个角色", true);
        return;
      }
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
        this.selectShip(config.id);
      }
    });

    const iconSize = 48;
    const iconBg = this.add.rectangle(0, 0, iconSize + 4, iconSize + 4, 0x1a1a2a, 1)
      .setStrokeStyle(2, unlocked ? tint : 0x555555, unlocked ? 1 : 0.4);
    const icon = this.add.rectangle(0, 0, iconSize, iconSize, tint, unlocked ? 0.8 : 0.2);
    container.add([iconBg, icon]);

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
  // 飞船详情面板 - 创建
  //============================================
  createDetailPanel(x, y, w, h) {
    // x,y: 面板中心坐标 | w,h: 面板宽高
    const container = this.add.container(x, y);

    // 面板背景 - 深灰底色 + 金色边框
    const bg = this.add.rectangle(0, 0, w, h, 0x4a4a5a, 1)
      .setStrokeStyle(2, 0xc4a040, 1)
      .setOrigin(0.5);
    // 面板内嵌 - 内边框装饰
    const inner = this.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
      .setStrokeStyle(1, 0x8a7a3a, 0.6)
      .setOrigin(0.5);

    container.add([bg, inner]);

    // 左侧元素起始X坐标（相对面板中心）
    const leftX = -w / 2 + 10;
    // 右侧元素X偏移
    const rightX = 16;

    // 飞船图标 - 48x48 尺寸
    const iconBg = this.add.rectangle(leftX + 24, 0, 48, 48, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0xc4a040, 1).setOrigin(0.5);
    const icon = this.add.rectangle(leftX + 24, 0, 42, 42, 0x888888, 0.5).setOrigin(0.5);
    container.add([iconBg, icon]);

    // 飞船名称 - Y偏移-22（图标的右上方）
    const nameText = this.add.text(leftX + 52, -22, "", {
      fontFamily: "ZpixOne", fontSize: "16px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 3
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // 飞船描述 - Y偏移-24（名称下方）
    const descText = this.add.text(leftX + 52, -6, "", {
      fontFamily: "ZpixOne", fontSize: "10px", color: "#8898b0",
      stroke: "#1a1a2a", strokeThickness: 1
    }).setOrigin(0, 0.5);
    container.add(descText);

    // 解锁状态 - Y偏移-2（面板右下角）
    const statusText = this.add.text(w / 2 - 450, -22, "", {
      fontFamily: "ZpixOne", fontSize: "9px", color: "#c4a040",
      stroke: "#1a1a2a", strokeThickness: 1
    }).setOrigin(1, 0.5);
    container.add(statusText);

    this.detailObjects = { container, icon, nameText, descText, statusText, statBars: [], panelW: w };
  }

  //============================================
  // 飞船详情面板 - 更新
  //============================================
  updateDetailPanel(config, errorMsg, isError) {
    const detail = this.detailObjects;
    if (!detail) return;

    // 错误状态显示
    if (errorMsg) {
      detail.nameText.setText("");
      detail.descText.setText("");
      detail.statusText.setText(errorMsg);
      detail.statusText.setColor(isError ? "#ff8888" : "#88ff88");
      detail.icon.setFillStyle(0x888888, 0.5);
      if (detail.statBars) {
        detail.statBars.forEach((obj) => { if (obj && obj.destroy) obj.destroy(); });
        detail.statBars = [];
      }
      return;
    }

    if (!config) return;

    // 更新名称和图标颜色
    detail.nameText.setText(config.name);
    detail.icon.setFillStyle(config.tint, 0.8);

    // 清除旧的统计条
    if (detail.statBars) {
      detail.statBars.forEach((obj) => { if (obj && obj.destroy) obj.destroy(); });
    }
    detail.statBars = [];

    //========== 属性条 ==========
    // X坐标: 面板左侧 + 偏移 | 宽度120 | 高度8
    const barX = -detail.panelW / 2 + 90;
    const barW = 120;
    const barH = 8;

    const stats = config.stats;
    const bars = [
      { label: "HP", value: stats.maxHp, max: 160, color: 0x44cc44 },      // 生命值
      { label: "SPD", value: stats.speed, max: 360, color: 0x44aaff },    // 速度
      { label: "DASH", value: +((6000 - stats.dashCooldown) / 60).toFixed(1), max: 50, color: 0xffaa44 }, // 冲刺冷却
    ];
    // 初始Y = 8，每条间隔14
    let infoY = 8;
    bars.forEach((b) => {
      const ratio = Math.min(1, Math.max(0, b.value / b.max));
      const bg = this.add.rectangle(barX, infoY, barW, barH, 0x1a1a2a, 0.9).setOrigin(0, 0.5);
      const fill = this.add.rectangle(barX, infoY, Math.max(barH, barW * ratio), barH - 2, b.color, 0.9).setOrigin(0, 0.5);
      const lbl = this.add.text(barX - 2, infoY, b.label, {
        fontFamily: "ZpixOne", fontSize: "8px", color: "#a0a0b0",
        stroke: "#000000", strokeThickness: 1
      }).setOrigin(1, 0.5);
      detail.statBars.push(bg, fill, lbl);
      detail.container.add([bg, fill, lbl]);
      infoY += 14;  // 下一条Y + 14
    });

    //========== 武器信息 ==========
    const weaponLabel = config.initialWeapons
      ? config.initialWeapons.join("+")
      : (config.initialWeapon || "?");
    const weaponText = this.add.text(barX, infoY, `武器:${weaponLabel}`, {
      fontFamily: "ZpixOne", fontSize: "9px", color: "#c4a040",
      stroke: "#000000", strokeThickness: 1
    }).setOrigin(0, 1);
    detail.statBars.push(weaponText);
    detail.container.add(weaponText);

    //========== 难度星级 - 面板右下角 ==========
    const diffY = -23;  // Y偏移（负数=往上）
    if (config.difficulty) {
      const stars = "★".repeat(config.difficulty) + "☆".repeat(5 - config.difficulty);
      const diffText = this.add.text(detail.panelW / 2 - 500, diffY, stars, {
        fontFamily: "ZpixOne", fontSize: "8px", color: "#fef08a",
        stroke: "#000000", strokeThickness: 1
      }).setOrigin(1, 0.5);
      detail.statBars.push(diffText);
      detail.container.add(diffText);
    }

    // 更新描述文字
    const descLine = config.description + (config.difficulty ? `  难度${config.difficulty}/5` : "");
    detail.descText.setText(descLine);

    // 更新解锁状态
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
    const parsed = Number(window.localStorage.getItem(COIN_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }
}
