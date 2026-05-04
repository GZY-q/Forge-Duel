const COIN_STORAGE_KEY = "forgeduel_coins";
const META_STORAGE_KEY = "forgeduel_meta_v1";
const UPGRADE_STORAGE_KEY = "forgeduel_shop_upgrades_v1";

const DEFAULT_UPGRADES = Object.freeze({
  dash_cooldown: 0,
  xp_gain: 0,
  movement_speed: 0,
  power: 0,
  max_hp: 0,
  armor: 0,
  amount: 0,
  cooldown: 0,
  area: 0,
  speed: 0,
  duration: 0,
  move_speed2: 0,
  magnet: 0,
  luck: 0,
  growth: 0
});

const UPGRADE_DEFINITIONS = [
  { key: "power", label: "威力", description: "每级提高 5% 造成的伤害", effectLabel: "+5%", baseCost: 200, costStep: 100, maxLevel: 5, icon: "⚔️" },
  { key: "max_hp", label: "最大生命值", description: "每级提高 10% 最大生命值", effectLabel: "+10%", baseCost: 200, costStep: 100, maxLevel: 3, icon: "❤️" },
  { key: "armor", label: "装甲", description: "每级增加 1 点护甲", effectLabel: "+1", baseCost: 600, costStep: 200, maxLevel: 3, icon: "🛡️" },
  { key: "amount", label: "数量", description: "增加 1 个武器投射物数量", effectLabel: "+1", baseCost: 5000, costStep: 0, maxLevel: 1, icon: "🔢" },
  { key: "cooldown", label: "冷却", description: "每级减少 2.5% 武器冷却时间", effectLabel: "-2.5%", baseCost: 900, costStep: 300, maxLevel: 2, icon: "⏱️" },
  { key: "area", label: "区域", description: "每级扩大 5% 武器效果范围", effectLabel: "+5%", baseCost: 300, costStep: 150, maxLevel: 2, icon: "📐" },
  { key: "speed", label: "速度", description: "每级提高 5% 武器投射物速度", effectLabel: "+5%", baseCost: 300, costStep: 150, maxLevel: 2, icon: "💨" },
  { key: "duration", label: "持续时间", description: "每级延长 5% 武器持续时间", effectLabel: "+5%", baseCost: 300, costStep: 150, maxLevel: 2, icon: "⏳" },
  { key: "move_speed2", label: "速度", description: "每级提高 5% 移动速度", effectLabel: "+5%", baseCost: 300, costStep: 150, maxLevel: 2, icon: "👢" },
  { key: "magnet", label: "Magnet", description: "每级扩大 25% 拾取范围", effectLabel: "+25%", baseCost: 300, costStep: 150, maxLevel: 2, icon: "🧲" },
  { key: "luck", label: "幸运", description: "每级提高 10% 幸运值", effectLabel: "+10%", baseCost: 600, costStep: 200, maxLevel: 3, icon: "🍀" },
  { key: "growth", label: "成长", description: "每级提高 3% 经验获取", effectLabel: "+3%", baseCost: 900, costStep: 300, maxLevel: 5, icon: "📈" }
];

function toSafeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

import {
  createVSBackground,
  createVSTopBar,
  createVSBackButton,
  createVSPanel,
  createVSCard,
  createVSLevelSquares
} from "../ui/vsUI.js";

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super("UpgradeScene");
    this.coins = 0;
    this.upgrades = { ...DEFAULT_UPGRADES };
    this.selectedIndex = 0;
    this.cardObjects = [];
    this.detailObjects = null;
    this.statusText = null;
  }

  create() {
    this.cardObjects = [];
    this.detailObjects = null;
    this.statusText = null;
    this.selectedIndex = 0;

    const cam = this.cameras.main;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;

    this.coins = this.loadCoins();
    this.upgrades = this.loadUpgrades();

    // ── Background ──
    createVSBackground(this);

    // ── Top bar (coins only, no right button) ──
    this.topBar = createVSTopBar(this, { coins: this.coins });

    // ── Back button (top-right) ──
    const doClose = () => {
      const mainMenu = this.scene.get("MainMenuScene");
      if (mainMenu && typeof mainMenu.closeSubMenu === "function") {
        mainMenu.closeSubMenu();
      } else {
        this.scene.stop("UpgradeScene");
      }
    };
    createVSBackButton(this, cam.width - 84, 36, doClose);

    // ── ESC key closes ──
    if (this.input?.keyboard) {
      this.input.keyboard.on("keydown-ESC", doClose);
    }

    //========== 增强选择面板尺寸 ==========
    const panelW = 780;
    const panelH = 560;
    const panelCenterY = cy + 15;
    const panelTop = panelCenterY - panelH / 2;
    const panelBottom = panelCenterY + panelH / 2;
    createVSPanel(this, cx, panelCenterY, panelW, panelH);

    //========== 标题 ==========
    // Y偏移60（面板顶部往下60px）| 字号30px
    this.add.text(cx, panelTop + 60, "增强选择", {
      fontFamily: "ZpixOne", fontSize: "30px", color: "#fef08a",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);

    //========== 卡片网格 ==========
    // 列数（默认4列）
    const cols = 4;
    // 卡片宽度（默认148）
    const cardW = 148;
    // 卡片高度（默认90）
    const cardH = 90;
    // 水平间距（默认10）
    const gapX = 10;
    // 垂直间距（默认7）
    const gapY = 7;
    // 网格总宽度
    const gridW = cols * cardW + (cols - 1) * gapX;
    // 网格起始X（居中）
    const startX = cx - gridW / 2 + cardW / 2;
    // 网格起始Y（默认panelTop + 160）
    const startY = panelTop + 160;

    UPGRADE_DEFINITIONS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardX = startX + col * (cardW + gapX);
      const cardY = startY + row * (cardH + gapY);
      this.createCard(def, i, cardX, cardY, cardW, cardH);
    });

    const gridBottom = startY + (3 - 1) * (cardH + gapY) + cardH / 2;

    //========== 状态文字 ==========
    // 位于卡片下方 | 字号14px
    this.statusText = this.add.text(cx, gridBottom + 14, "", {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#cde5ff",
      stroke: "#0e1a2a", strokeThickness: 3
    }).setOrigin(0.5);

    //========== 详情面板 ==========
    // Y位置（默认panelBottom - 50）
    const detailY = panelBottom - 50;
    this.createDetailPanel(cx, detailY, panelW - 30, 80);

    // Select first by default
    this.selectUpgrade(0);
    this.refreshCardLevels();
  }

  createCard(def, index, x, y, w, h) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x3a3a4a, 0.95)
      .setStrokeStyle(2, 0xc4a040, 0.9)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    container.add(bg);

    // Name
    const nameText = this.add.text(0, -h / 2 + 16, def.label, {
      fontFamily: "ZpixOne", fontSize: "13px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 3
    }).setOrigin(0.5);
    container.add(nameText);

    // Icon background
    const iconBg = this.add.rectangle(0, -2, 40, 40, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0xc4a040, 1);
    container.add(iconBg);

    // Icon
    const icon = this.add.text(0, -2, def.icon || "?", {
      fontFamily: "ZpixOne", fontSize: "22px"
    }).setOrigin(0.5);
    container.add(icon);

    // Level squares
    const squares = createVSLevelSquares(this, container, def.maxLevel, 0, h / 2 - 14);
    container.setData("squares", squares);

    // Click
    bg.on("pointerdown", () => {
      this.selectUpgrade(index);
      this.tweens.add({
        targets: container, scaleX: 0.96, scaleY: 0.96,
        duration: 60, yoyo: true
      });
    });

    bg.on("pointerover", () => {
      bg.setStrokeStyle(3, 0xfef08a, 1);
    });
    bg.on("pointerout", () => {
      const isSelected = this.selectedIndex === index;
      bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffffff : 0xc4a040, 1);
    });

    this.cardObjects.push({ container, bg, def, squares });
  }

  createDetailPanel(x, y, w, h) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x4a4a5a, 1)
      .setStrokeStyle(2, 0xc4a040, 1)
      .setOrigin(0.5);
    container.add(bg);

    // Icon (large)
    const iconBg = this.add.rectangle(-w / 2 + 46, 0, 52, 52, 0x1a1a2a, 1)
      .setStrokeStyle(2, 0xc4a040, 1);
    container.add(iconBg);

    const icon = this.add.text(-w / 2 + 46, 0, "", {
      fontFamily: "ZpixOne", fontSize: "28px"
    }).setOrigin(0.5);
    container.add(icon);

    // Name
    const nameText = this.add.text(-w / 2 + 100, -16, "", {
      fontFamily: "ZpixOne", fontSize: "18px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(-w / 2 + 100, 12, "", {
      fontFamily: "ZpixOne", fontSize: "13px", color: "#d4d4e0",
      stroke: "#1a1a2a", strokeThickness: 2
    }).setOrigin(0, 0.5);
    container.add(descText);

    // Cost
    const costText = this.add.text(w / 2 - 130, -12, "", {
      fontFamily: "ZpixOne", fontSize: "16px", color: "#ffe08a",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(1, 0.5);
    container.add(costText);

    // Buy button
    const btnW = 110;
    const btnH = 40;
    const btnX = w / 2 - 70;
    const btnY = 12;

    const btnShadow = this.add.rectangle(btnX, btnY + 3, btnW, btnH, 0x000000, 0.5).setOrigin(0.5);
    container.add(btnShadow);

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x2d8a3d, 1)
      .setStrokeStyle(3, 0xc4a040, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    container.add(btnBg);

    const btnText = this.add.text(btnX, btnY, "购买", {
      fontFamily: "ZpixOne", fontSize: "16px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(btnText);

    // Hover
    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0x3aaa3a, 1);
      btnBg.setStrokeStyle(3, 0xfef08a, 1);
      btnText.setColor("#fef08a");
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0x2d8a3d, 1);
      btnBg.setStrokeStyle(3, 0xc4a040, 1);
      btnText.setColor("#ffffff");
    });

    const trigger = () => {
      const def = this.detailDef;
      if (!def) return;
      this.purchaseUpgrade(def);
    };
    btnBg.on("pointerdown", trigger);
    btnText.on("pointerdown", trigger);

    this.detailObjects = { container, icon, nameText, descText, costText, btnBg, btnText };
  }

  selectUpgrade(index) {
    this.selectedIndex = index;
    const def = UPGRADE_DEFINITIONS[index];

    // Update card borders
    this.cardObjects.forEach((card, i) => {
      const isSelected = i === index;
      card.bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffffff : 0xc4a040, 1);
    });

    // Update detail panel
    const detail = this.detailObjects;
    const level = this.upgrades[def.key] ?? 0;
    const isMaxed = level >= def.maxLevel;
    const cost = isMaxed ? 0 : this.getUpgradeCost(def, level);

    detail.icon.setText(def.icon || "?");
    detail.nameText.setText(def.label);
    detail.descText.setText(isMaxed
      ? `${def.description}（已满级）`
      : `${def.description}（${def.effectLabel}）`
    );
    detail.costText.setText(isMaxed ? "已满级" : `💰 ${cost}`);
    detail.costText.setColor(isMaxed ? "#89f5a6" : "#ffe08a");

    if (isMaxed) {
      detail.btnBg.setFillStyle(0x4a4a4a, 1);
      detail.btnBg.disableInteractive();
      detail.btnText.disableInteractive();
    } else {
      detail.btnBg.setFillStyle(0x2d8a3d, 1);
      detail.btnBg.setInteractive({ useHandCursor: true });
      detail.btnText.setInteractive({ useHandCursor: true });
    }

    this.detailDef = def;
  }

  purchaseUpgrade(def) {
    const level = this.upgrades[def.key] ?? 0;
    if (level >= def.maxLevel) {
      this.setStatus("已达到最大等级", "#9ff0b6");
      return;
    }

    const cost = this.getUpgradeCost(def, level);
    if (this.coins < cost) {
      this.setStatus("金币不足", "#ffb4b4");
      return;
    }

    this.coins -= cost;
    this.upgrades[def.key] = level + 1;
    this.saveCoins(this.coins);
    this.saveUpgrades(this.upgrades);
    this.topBar.setCoins(this.coins);

    this.refreshCardLevels();
    this.selectUpgrade(this.selectedIndex);
    this.setStatus(`${def.label} 升级成功！`, "#9ff0b6");
  }

  refreshCardLevels() {
    this.cardObjects.forEach((card, i) => {
      const def = UPGRADE_DEFINITIONS[i];
      const level = this.upgrades[def.key] ?? 0;
      const squares = card.container.getData("squares");
      squares.forEach((sq, l) => {
        if (l < level) {
          sq.setFillStyle(0xc4a040, 1);
          sq.setStrokeStyle(1, 0xfef08a, 1);
        } else {
          sq.setFillStyle(0x1a1a2a, 1);
          sq.setStrokeStyle(1, 0x4a4a5a, 1);
        }
      });
    });
  }

  getUpgradeCost(definition, level) {
    return definition.baseCost + level * definition.costStep;
  }

  setStatus(message, color = "#cde5ff") {
    if (!this.statusText) return;
    this.statusText.setText(message);
    this.statusText.setColor(color);
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    return toSafeInt(window.localStorage.getItem(COIN_STORAGE_KEY));
  }

  saveCoins(coins) {
    if (typeof window === "undefined" || !window.localStorage) return;
    const safeCoins = toSafeInt(coins);
    try {
      window.localStorage.setItem(COIN_STORAGE_KEY, String(safeCoins));
      const metaRaw = window.localStorage.getItem(META_STORAGE_KEY);
      const metaParsed = metaRaw ? JSON.parse(metaRaw) : {};
      const mergedMeta = {
        currency: safeCoins,
        maxHPBonus: toSafeInt(metaParsed?.maxHPBonus),
        xpBonus: toSafeInt(metaParsed?.xpBonus),
        speedBonus: toSafeInt(metaParsed?.speedBonus),
        startingWeaponBonus: toSafeInt(metaParsed?.startingWeaponBonus)
      };
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(mergedMeta));
    } catch (_error) {}
  }

  loadUpgrades() {
    if (typeof window === "undefined" || !window.localStorage) return { ...DEFAULT_UPGRADES };
    try {
      const raw = window.localStorage.getItem(UPGRADE_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_UPGRADES };
      const parsed = JSON.parse(raw);
      const result = { ...DEFAULT_UPGRADES };
      Object.keys(result).forEach(k => {
        result[k] = toSafeInt(parsed?.[k]);
      });
      return result;
    } catch (_error) {
      return { ...DEFAULT_UPGRADES };
    }
  }

  saveUpgrades(upgrades) {
    if (typeof window === "undefined" || !window.localStorage) return;
    const sanitized = {};
    Object.keys(DEFAULT_UPGRADES).forEach(k => {
      sanitized[k] = toSafeInt(upgrades?.[k]);
    });
    try {
      window.localStorage.setItem(UPGRADE_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (_error) {}
  }

  shutdown() {
    this.children.removeAll(true);
  }
}
