import {
  SHIP_CONFIGS,
  SHIP_KEYS,
  SHIP_STORAGE_KEY,
  loadShipStats,
  isShipUnlocked,
  getUnlockConditionText
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
    this.topBar = createVSTopBar(this, {
      coins,
      showBack: true,
      onBack: () => this.scene.start("MainMenuScene")
    });

    // ── Central Panel ──
    const panelW = 780;
    const panelH = 520;
    const panelCenterY = cy + 20;
    const panelTop = panelCenterY - panelH / 2;
    const panelBottom = panelCenterY + panelH / 2;
    createVSPanel(this, cx, panelCenterY, panelW, panelH);

    // ── Title (above panel) ──
    this.add.text(cx, panelTop - 20, "角色选择", {
      fontFamily: "Zpix", fontSize: "26px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 5
    }).setOrigin(0.5).setDepth(100);

    // ── Load stats ──
    this.shipStats = loadShipStats();
    this.selectedShipId = null;
    this.shipCards = [];
    this.detailObjects = null;

    // ── Ship cards grid ──
    const cols = 4;
    const cardW = 150;
    const cardH = 140;
    const gapX = 12;
    const gapY = 12;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = cx - gridW / 2 + cardW / 2;
    const startY = panelTop + 100;

    SHIP_KEYS.forEach((key, index) => {
      const config = SHIP_CONFIGS[key];
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.createShipCard(x, y, cardW, cardH, config);
    });

    // ── Detail panel at bottom ──
    this.createDetailPanel(cx, panelBottom - 55, panelW - 30, 90);

    // ── Confirm button ──
    createVSConfirmButton(this, cx + 260, panelBottom - 55, "确认", () => {
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
          mode: "create",
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
          this.updateDetailPanel(config, "此角色尚未解锁", true);
          return;
        }
        this.selectShip(config.id);
      }
    });

    // Placeholder pixel-art icon (colored square with border)
    const iconSize = 48;
    const iconBg = this.add.rectangle(0, -30, iconSize + 4, iconSize + 4, 0x1a1a2a, 1)
      .setStrokeStyle(2, unlocked ? tint : 0x555555, unlocked ? 1 : 0.4);
    const icon = this.add.rectangle(0, -30, iconSize, iconSize, tint, unlocked ? 0.8 : 0.2);
    container.add([iconBg, icon]);

    // Weapon icon placeholder (small, bottom-right of main icon)
    const weaponLabels = { dagger: "🗡️", fireball: "🔥", lightning: "⚡", orbit_blades: "🌀" };
    const wepIcon = this.add.text(w / 2 - 18, h / 2 - 18,
      weaponLabels[config.initialWeapon] || "⚔️", {
      fontFamily: "Zpix", fontSize: "16px"
    }).setOrigin(0.5);
    if (!unlocked) wepIcon.setAlpha(0.3);
    container.add(wepIcon);

    // Ship name
    const nameColor = unlocked ? "#ffffff" : "#667788";
    const nameText = this.add.text(0, 16, config.name, {
      fontFamily: "Zpix", fontSize: "16px", color: nameColor,
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);
    container.add(nameText);

    // Lock overlay
    if (!unlocked) {
      const lockOverlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.5).setOrigin(0.5);
      const lockText = this.add.text(0, 0, "🔒", {
        fontFamily: "Zpix", fontSize: "24px"
      }).setOrigin(0.5);
      container.add([lockOverlay, lockText]);
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

  createDetailPanel(x, y, w, h) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x4a4a5a, 1)
      .setStrokeStyle(2, 0xc4a040, 1)
      .setOrigin(0.5);
    const inner = this.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
      .setStrokeStyle(1, 0x8a7a3a, 0.6)
      .setOrigin(0.5);

    container.add([bg, inner]);

    // Placeholder icon
    const iconBg = this.add.rectangle(-w / 2 + 50, 0, 56, 56, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0xc4a040, 1);
    const icon = this.add.rectangle(-w / 2 + 50, 0, 48, 48, 0x888888, 0.5);
    container.add([iconBg, icon]);

    // Name
    const nameText = this.add.text(-w / 2 + 110, -18, "", {
      fontFamily: "Zpix", fontSize: "20px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 5
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // Description / stats
    const descText = this.add.text(-w / 2 + 110, 12, "", {
      fontFamily: "Zpix", fontSize: "14px", color: "#d4d4e0",
      stroke: "#1a1a2a", strokeThickness: 2,
      wordWrap: { width: w - 240 }
    }).setOrigin(0, 0.5);
    container.add(descText);

    // Status / error
    const statusText = this.add.text(w / 2 - 20, 0, "", {
      fontFamily: "Zpix", fontSize: "16px", color: "#ff8888",
      stroke: "#1a1a2a", strokeThickness: 2
    }).setOrigin(1, 0.5);
    container.add(statusText);

    this.detailObjects = { container, icon, nameText, descText, statusText };
  }

  updateDetailPanel(config, errorMsg, isError) {
    const detail = this.detailObjects;
    if (!detail) return;

    if (errorMsg) {
      detail.nameText.setText("");
      detail.descText.setText("");
      detail.statusText.setText(errorMsg);
      detail.statusText.setColor(isError ? "#ff8888" : "#88ff88");
      detail.icon.setFillStyle(0x888888, 0.5);
      return;
    }

    if (!config) return;

    detail.nameText.setText(config.name);
    const statsStr = `HP:${config.stats.maxHp}  SPD:${config.stats.speed}  武器:${config.initialWeapon || "未知"}`;
    detail.descText.setText(statsStr);
    detail.statusText.setText("");
    detail.icon.setFillStyle(config.tint, 0.8);
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const parsed = Number(window.localStorage.getItem(COIN_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }
}
