import {
  SHIP_CONFIGS,
  SHIP_KEYS,
  SHIP_STORAGE_KEY,
  loadShipStats,
  isShipUnlocked,
  getUnlockConditionText
} from "../config/ships.js";

export class ShipSelectionScene extends Phaser.Scene {
  constructor() {
    super("ShipSelectionScene");
  }

  init(data) {
    this.pendingMode = data?.mode || "solo";
  }

  create() {
    const cam = this.cameras.main;
    const centerX = cam.width * 0.5;
    const centerY = cam.height * 0.5;

    // Background
    this.add.rectangle(centerX, centerY, cam.width, cam.height, 0x071120, 1);
    for (let y = 0; y < cam.height; y += 32) {
      const color = Math.floor(y / 32) % 2 === 0 ? 0x0d1a31 : 0x11213d;
      this.add.rectangle(centerX, y + 16, cam.width, 30, color, 1).setOrigin(0.5);
    }

    // Panel
    const panelW = 900;
    const panelH = 600;
    this.add.rectangle(centerX, centerY, panelW, panelH, 0x10203a, 0.96)
      .setStrokeStyle(4, 0x5ca7ff, 1);
    this.add.rectangle(centerX, centerY, panelW - 16, panelH - 16, 0x0b1830, 0)
      .setStrokeStyle(2, 0x9bd3ff, 0.9);

    // Title
    this.add.text(centerX, centerY - panelH / 2 + 40, "选择你的战机", {
      fontFamily: "Arial", fontSize: "36px", color: "#f8fbff",
      stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, centerY - panelH / 2 + 72, "每种战机拥有不同属性和特殊能力", {
      fontFamily: "Arial", fontSize: "16px", color: "#8ab8e0",
      stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0.5);

    // Load stats for unlock checks
    this.shipStats = loadShipStats();
    this.selectedShipId = null;
    this.shipCards = [];
    this.confirmBtn = null;
    this.confirmLabel = null;
    this.statusText = null;

    // Ship cards grid: 4 columns x 2 rows
    const cols = 4;
    const cardW = 190;
    const cardH = 200;
    const gapX = 14;
    const gapY = 14;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = centerX - gridW / 2 + cardW / 2;
    const startY = centerY - 40;

    SHIP_KEYS.forEach((key, index) => {
      const config = SHIP_CONFIGS[key];
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.createShipCard(x, y, cardW, cardH, config);
    });

    // Status text
    this.statusText = this.add.text(centerX, centerY + panelH / 2 - 80, "", {
      fontFamily: "Arial", fontSize: "16px", color: "#ff8888",
      stroke: "#0d1a2d", strokeThickness: 3
    }).setOrigin(0.5);

    // Confirm button
    this.createConfirmButton(centerX, centerY + panelH / 2 - 45);

    // Back button
    const backBtn = this.add.text(centerX - panelW / 2 + 30, centerY - panelH / 2 + 20, "< 返回", {
      fontFamily: "Arial", fontSize: "18px", color: "#8ab8e0",
      stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => this.scene.start("MainMenuScene"));
    backBtn.on("pointerover", () => backBtn.setColor("#ffffff"));
    backBtn.on("pointerout", () => backBtn.setColor("#8ab8e0"));
  }

  createShipCard(x, y, w, h, config) {
    const unlocked = isShipUnlocked(config.id, this.shipStats);
    const tint = config.tint;

    // Card background
    const card = this.add.rectangle(x, y, w, h, 0x1a324f, 0.95)
      .setStrokeStyle(2, 0x5ca7ff, 0.9)
      .setInteractive({ useHandCursor: unlocked });

    // Inner
    const cardInner = this.add.rectangle(x, y, w - 10, h - 10, 0x0f2440, 0.9)
      .setStrokeStyle(1, 0x3a7abf, 0.6);

    // Ship icon area (colored circle as placeholder)
    const iconCircle = this.add.circle(x, y - 50, 28, tint, unlocked ? 0.85 : 0.25)
      .setStrokeStyle(2, tint, unlocked ? 1 : 0.3);

    // Ship name
    const nameColor = unlocked ? "#ffffff" : "#667788";
    const nameText = this.add.text(x, y - 14, config.name, {
      fontFamily: "Arial", fontSize: "20px", color: nameColor,
      stroke: "#0f1c2f", strokeThickness: 4
    }).setOrigin(0.5);

    // Difficulty stars
    const stars = "★".repeat(config.difficulty) + "☆".repeat(5 - config.difficulty);
    const starsText = this.add.text(x, y + 8, stars, {
      fontFamily: "Arial", fontSize: "14px", color: unlocked ? "#ffd866" : "#556666"
    }).setOrigin(0.5);

    // Stats
    const statsStr = `HP:${config.stats.maxHp} SPD:${config.stats.speed}`;
    const statsText = this.add.text(x, y + 28, statsStr, {
      fontFamily: "Arial", fontSize: "12px", color: unlocked ? "#cfe9ff" : "#556666"
    }).setOrigin(0.5);

    // Weapon
    const weaponLabels = { dagger: "匕首", fireball: "火球", lightning: "闪电", orbit_blades: "轨道刃" };
    const wepName = config.initialWeapons
      ? config.initialWeapons.map(w => weaponLabels[w] || w).join("+")
      : (weaponLabels[config.initialWeapon] || config.initialWeapon);
    const wepText = this.add.text(x, y + 44, `武器: ${wepName}`, {
      fontFamily: "Arial", fontSize: "11px", color: unlocked ? "#8ab8dd" : "#556666"
    }).setOrigin(0.5);

    // Lock overlay / unlock condition
    let lockOverlay = null;
    let lockText = null;
    if (!unlocked) {
      lockOverlay = this.add.rectangle(x, y, w, h, 0x000000, 0.55);
      const condText = getUnlockConditionText(config.id);
      lockText = this.add.text(x, y + 64, `🔒 ${condText}`, {
        fontFamily: "Arial", fontSize: "11px", color: "#ffaa66",
        stroke: "#0d1a2d", strokeThickness: 2,
        wordWrap: { width: w - 20 },
        align: "center"
      }).setOrigin(0.5);
    }

    // Click handler
    const onSelect = () => {
      if (!unlocked) {
        this.statusText.setText("此战机尚未解锁");
        this.statusText.setColor("#ff8888");
        return;
      }
      this.selectShip(config.id);
    };

    card.on("pointerdown", onSelect);
    cardInner.on("pointerdown", onSelect);
    iconCircle.on("pointerdown", onSelect);
    nameText.on("pointerdown", onSelect);

    if (unlocked) {
      card.on("pointerover", () => {
        if (this.selectedShipId !== config.id) {
          card.setStrokeStyle(3, 0x9bd3ff, 1);
        }
      });
      card.on("pointerout", () => {
        if (this.selectedShipId !== config.id) {
          card.setStrokeStyle(2, 0x5ca7ff, 0.9);
        }
      });
    }

    this.shipCards.push({
      id: config.id,
      card,
      cardInner,
      iconCircle,
      unlocked
    });
  }

  selectShip(shipId) {
    this.selectedShipId = shipId;

    // Update card highlights
    this.shipCards.forEach((entry) => {
      if (entry.id === shipId) {
        entry.card.setStrokeStyle(3, 0xffdd44, 1);
      } else {
        entry.card.setStrokeStyle(2, 0x5ca7ff, entry.unlocked ? 0.9 : 0.5);
      }
    });

    const config = SHIP_CONFIGS[shipId];
    this.statusText.setText(`已选择: ${config.name}`);
    this.statusText.setColor("#88ff88");
  }

  createConfirmButton(x, y) {
    const btn = this.add.rectangle(x, y, 200, 48, 0x255283, 1)
      .setStrokeStyle(3, 0x6ab8ff, 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, "开始游戏", {
      fontFamily: "Arial", fontSize: "24px", color: "#ffffff",
      stroke: "#0f1c2f", strokeThickness: 5
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const trigger = () => {
      if (!this.selectedShipId) {
        this.statusText.setText("请先选择一架战机");
        this.statusText.setColor("#ff8888");
        return;
      }
      // Save selection
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
    };

    btn.on("pointerdown", trigger);
    label.on("pointerdown", trigger);
    btn.on("pointerover", () => btn.setFillStyle(0x3a7abf, 1));
    btn.on("pointerout", () => btn.setFillStyle(0x255283, 1));

    this.confirmBtn = btn;
    this.confirmLabel = label;
  }
}
