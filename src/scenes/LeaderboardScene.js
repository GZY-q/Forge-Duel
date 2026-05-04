import { createMainMenuBackground, createVSPanel, createVSBackButton, createVSTopBar } from "../ui/vsUI.js";

const API_BASE = window.location.origin;

const C = {
  panelBg: 0x3a3a5a,
  panelInner: 0x2a2a4a,
  panelBorder: 0xc4a040,
  rowEven: 0x1e1e3a,
  rowOdd: 0x262644,
  rowHover: 0x3a4a6a,
  rowHighlight: 0x2a4a6a,
  headerBg: 0x161630,
  gold: 0xfff08a,
  silver: 0xc0c0c0,
  bronze: 0xcd7f32,
  textWhite: "#ffffff",
  textMuted: "#6a7a9a",
  textBlue: "#8ab8e0",
  textGold: "#fef08a",
  textValue: "#cfe9ff",
  textSelf: "#44ff88",
  tabActiveBg: 0x4a6aaa,
  tabInactiveBg: 0x2a2a4a,
  tabActiveBorder: 0xc4a040,
  tabInactiveBorder: 0x4a4a5a,
  pageBtn: 0x3a5a8a,
  pageBtnHover: 0x5080b0,
  pageBtnDisabled: 0x2a2a3a,
  scrollTrack: 0x161630,
  scrollThumb: 0x5a7a9f,
  scrollThumbHover: 0x8aaccf,
  line: 0x3a3a5a,
  selfRow: 0x1a3a2a
};

const ROW_H = 28;
const ROW_GAP = 1;
const ROW_STEP = ROW_H + ROW_GAP;
const VISIBLE_ROWS = 12;
const ENTRY_LIMIT = 50;
const TITLE_TOP_OFFSET = 24;
const TAB_TOP_OFFSET = 60;
const HEADER_TOP_OFFSET = 92;
const LIST_TOP_PAD = 8;
const LIST_BOTTOM_PAD = 46;
const PAGE_CTRL_H = 34;
const SCROLLBAR_W = 8;
const SCROLLBAR_MIN_H = 30;
const PANEL_W = 700;
const PANEL_H = 500;
const COIN_STORAGE_KEY = "forgeduel_coins";

function formatTime(ms) {
  if (!ms || ms <= 0) return "--:--";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatNumber(n) {
  if (n == null) return "-";
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
  }

  init(data) {
    this._initialSort = data?.sort || "bestTime";
  }

  preload() {
    if (!this.textures.exists("main_menu_bg")) {
      this.load.image("main_menu_bg", "assets/sprites/ui/Home Page Background.png");
    }
  }

  loadCoins() {
    if (typeof window === "undefined" || !window.localStorage) return 0;
    const parsed = Number(window.localStorage.getItem(COIN_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  }

  create() {
    const cam = this.cameras.main;
    this.camW = cam.width;
    this.camH = cam.height;
    this.cx = cam.width * 0.5;
    this.cy = cam.height * 0.5;

    // ── Background ──
    createMainMenuBackground(this);

    // ── Top bar (coins only) ──
    const coins = this.loadCoins();
    this.topBar = createVSTopBar(this, { coins });

    const doClose = () => {
      const mainMenu = this.scene.get("MainMenuScene");
      if (mainMenu && typeof mainMenu.closeSubMenu === "function") {
        mainMenu.showBackButton(false);
        mainMenu.closeSubMenu();
      } else {
        this.scene.stop("LeaderboardScene");
      }
    };
    createVSBackButton(this, cam.width - 84, 36, doClose);

    if (this.input?.keyboard) {
      this.input.keyboard.on("keydown-ESC", doClose);
    }

    this.panelW = PANEL_W;
    this.panelH = PANEL_H;
    this.panelTop = this.cy + 20 - this.panelH / 2;
    this.panelBottom = this.cy + 20 + this.panelH / 2;
    this.panelLeft = this.cx - this.panelW / 2;
    this.panelRight = this.cx + this.panelW / 2;

    createVSPanel(this, this.cx, this.cy + 20, this.panelW, this.panelH);

    this.add.rectangle(this.cx, this.cy + 20, this.panelW, this.panelH, 0x000000, 0.15).setDepth(50);

    this.add.text(this.cx, this.panelTop + TITLE_TOP_OFFSET, "排 行 榜", {
      fontFamily: "ZpixOne", fontSize: "20px", color: C.textGold,
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(200);

    this.currentSort = this._initialSort || "bestTime";
    this.currentPage = 0;
    this.totalPages = 1;
    this.allEntries = [];
    this.tabButtons = [];

    this.listTop = this.panelTop + HEADER_TOP_OFFSET + LIST_TOP_PAD;
    this.listBottom = this.panelBottom - LIST_BOTTOM_PAD - PAGE_CTRL_H;
    this.listLeft = this.panelLeft + 18;
    this.listRight = this.panelRight - 18 - SCROLLBAR_W - 4;
    this.listWidth = this.listRight - this.listLeft;
    this.listHeight = this.listBottom - this.listTop;
    this.entriesContainer = this.add.container(0, 0);

    this._createScrollbar();
    this._createTabs();
    this._createPageControls();
    this._createHeader();

    this.statusText = this.add.text(this.cx, this.cy, "加载中...", {
      fontFamily: "ZpixOne", fontSize: "15px", color: C.textBlue
    }).setOrigin(0.5).setDepth(300);

    this._loadLeaderboard();

    this.input.keyboard.on("keydown-LEFT", () => this._prevPage());
    this.input.keyboard.on("keydown-RIGHT", () => this._nextPage());
    this.input.keyboard.on("keydown-UP", () => this._prevPage());
    this.input.keyboard.on("keydown-DOWN", () => this._nextPage());
    this.input.keyboard.on("keydown-ESC", () => doClose());
    this.input.on("wheel", (_pointer, _gameObjects, _dx, dy) => {
      this._scrollBy(dy > 0 ? ROW_STEP : -ROW_STEP);
    });
  }

  _createScrollbar() {
    this.scrollbarX = this.panelRight - 14;
    this.scrollbarTrack = this.add.rectangle(
      this.scrollbarX, this.listTop + this.listHeight / 2,
      SCROLLBAR_W, this.listHeight, C.scrollTrack, 0.6
    ).setDepth(150);
    this.scrollbarThumb = this.add.rectangle(
      this.scrollbarX, this.listTop + this.listHeight / 2,
      SCROLLBAR_W - 2, this.listHeight, C.scrollThumb, 0.8
    ).setDepth(151).setInteractive({ useHandCursor: true });
    this.scrollbarThumb.on("pointerover", () => this.scrollbarThumb.setFillStyle(C.scrollThumbHover, 0.9));
    this.scrollbarThumb.on("pointerout", () => this.scrollbarThumb.setFillStyle(C.scrollThumb, 0.8));
  }

  _updateScrollbar() {
    if (!this.scrollbarThumb) return;
    const total = this.allEntries.length;
    const visible = VISIBLE_ROWS;
    if (total <= visible) {
      this.scrollbarThumb.setSize(SCROLLBAR_W - 2, this.listHeight).setPosition(this.scrollbarX, this.listTop + this.listHeight / 2);
      this.scrollbarThumb.setAlpha(0.2);
      return;
    }
    this.scrollbarThumb.setAlpha(0.8);
    const thumbH = Math.max(SCROLLBAR_MIN_H, (visible / total) * this.listHeight);
    const scrollRange = this.listHeight - thumbH;
    const scrollRatio = total > visible ? this.currentPage / (this.totalPages - 1) : 0;
    const thumbY = this.listTop + thumbH / 2 + scrollRatio * scrollRange;
    this.scrollbarThumb.setSize(SCROLLBAR_W - 2, thumbH).setPosition(this.scrollbarX, thumbY);
  }

  _createTabs() {
    const tabs = [
      { key: "bestTime", label: "最佳时间" },
      { key: "totalKills", label: "最多击杀" },
      { key: "highestLevel", label: "最高等级" }
    ];
    const tabW = 180;
    const tabGap = 10;
    const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = this.cx - totalTabW / 2 + tabW / 2;
    const tabY = this.panelTop + TAB_TOP_OFFSET;

    tabs.forEach((tab, i) => {
      const tx = tabStartX + i * (tabW + tabGap);
      const isActive = tab.key === this.currentSort;

      const bg = this.add.rectangle(tx, tabY, tabW, 28, C.tabInactiveBg, 1)
        .setStrokeStyle(2, C.tabInactiveBorder, 1)
        .setInteractive({ useHandCursor: true })
        .setDepth(200);
      const text = this.add.text(tx, tabY, tab.label, {
        fontFamily: "ZpixOne", fontSize: "12px", color: C.textMuted
      }).setOrigin(0.5).setDepth(201);

      if (isActive) {
        bg.setFillStyle(C.tabActiveBg, 1).setStrokeStyle(2, C.tabActiveBorder, 1);
        text.setColor(C.textWhite);
      }

      bg.on("pointerdown", () => {
        if (this.currentSort === tab.key) return;
        this.currentSort = tab.key;
        this.currentPage = 0;
        this._updateTabStyles();
        this._buildHeader();
        this._loadLeaderboard();
      });

      this.tabButtons.push({ bg, text, key: tab.key });
    });
  }

  _updateTabStyles() {
    for (const tab of this.tabButtons) {
      const isActive = tab.key === this.currentSort;
      tab.bg.setFillStyle(isActive ? C.tabActiveBg : C.tabInactiveBg, 1);
      tab.bg.setStrokeStyle(2, isActive ? C.tabActiveBorder : C.tabInactiveBorder, 1);
      tab.text.setColor(isActive ? C.textWhite : C.textMuted);
    }
  }

  _createHeader() {
    if (this.headerObjects) {
      this.headerObjects.forEach(o => o.destroy?.());
    }
    this.headerObjects = [];
    const y = this.panelTop + HEADER_TOP_OFFSET - 2;
    const leftX = this.listLeft;
    const nameX = this.listLeft + 56;
    const valueRightX = this.listRight;

    const line = this.add.rectangle(this.cx, y, this.listWidth + SCROLLBAR_W + 8, 1, C.line, 0.8).setDepth(100);
    this.headerObjects.push(line);

    const headerBar = this.add.rectangle(this.cx, y, this.listWidth + SCROLLBAR_W + 8, 22, C.headerBg, 0.95).setDepth(99);
    this.headerObjects.push(headerBar);

    const rankH = this.add.text(leftX, y, "#", {
      fontFamily: "ZpixOne", fontSize: "11px", color: C.textGold
    }).setOrigin(0, 0.5).setDepth(101);
    this.headerObjects.push(rankH);

    const nameH = this.add.text(nameX, y, "玩家", {
      fontFamily: "ZpixOne", fontSize: "11px", color: C.textGold
    }).setOrigin(0, 0.5).setDepth(101);
    this.headerObjects.push(nameH);

    const valueLabel = this.currentSort === "bestTime" ? "时间" : this.currentSort === "totalKills" ? "击杀" : "等级";
    const valueH = this.add.text(valueRightX, y, valueLabel, {
      fontFamily: "ZpixOne", fontSize: "11px", color: C.textGold
    }).setOrigin(1, 0.5).setDepth(101);
    this.headerObjects.push(valueH);

    const line2 = this.add.rectangle(this.cx, y + 12, this.listWidth + SCROLLBAR_W + 8, 1, C.line, 0.6).setDepth(100);
    this.headerObjects.push(line2);
  }

  _createPageControls() {
    if (this.pageContainer) this.pageContainer.destroy(true);
    const btnY = this.panelBottom - 22;

    this.pageContainer = this.add.container(this.cx, btnY).setDepth(200);

    const prevBtn = this.add.rectangle(-140, 0, 88, 26, C.pageBtn, 1)
      .setStrokeStyle(1, 0xc4a040, 0.7)
      .setInteractive({ useHandCursor: true });
    const prevLabel = this.add.text(-140, 0, "◀ 上一页", {
      fontFamily: "ZpixOne", fontSize: "10px", color: "#ffffff"
    }).setOrigin(0.5);
    prevBtn.on("pointerdown", () => this._prevPage());
    prevBtn.on("pointerover", () => prevBtn.setFillStyle(C.pageBtnHover));
    prevBtn.on("pointerout", () => prevBtn.setFillStyle(C.pageBtn));
    this.pagePrevBtn = prevBtn;

    const nextBtn = this.add.rectangle(140, 0, 88, 26, C.pageBtn, 1)
      .setStrokeStyle(1, 0xc4a040, 0.7)
      .setInteractive({ useHandCursor: true });
    const nextLabel = this.add.text(140, 0, "下一页 ▶", {
      fontFamily: "ZpixOne", fontSize: "10px", color: "#ffffff"
    }).setOrigin(0.5);
    nextBtn.on("pointerdown", () => this._nextPage());
    nextBtn.on("pointerover", () => nextBtn.setFillStyle(C.pageBtnHover));
    nextBtn.on("pointerout", () => nextBtn.setFillStyle(C.pageBtn));
    this.pageNextBtn = nextBtn;

    this.pageInfoText = this.add.text(0, 0, "", {
      fontFamily: "ZpixOne", fontSize: "10px", color: C.textMuted
    }).setOrigin(0.5);

    this.pageContainer.add([prevBtn, prevLabel, nextBtn, nextLabel, this.pageInfoText]);

    this._updatePageControls();
  }

  _updatePageControls() {
    if (!this.pageInfoText) return;
    const total = this.allEntries.length;
    this.totalPages = Math.max(1, Math.ceil(total / VISIBLE_ROWS));
    const start = this.currentPage * VISIBLE_ROWS + 1;
    const end = Math.min(start + VISIBLE_ROWS - 1, total);
    this.pageInfoText.setText(total > 0 ? `${start}-${end} / ${total}` : "0");

    this.pagePrevBtn.setAlpha(this.currentPage > 0 ? 1 : 0.35);
    this.pageNextBtn.setAlpha(this.currentPage < this.totalPages - 1 ? 1 : 0.35);
    this._updateScrollbar();
  }

  _prevPage() {
    if (this.currentPage <= 0) return;
    this.currentPage -= 1;
    this._renderEntries();
    this._updatePageControls();
  }

  _nextPage() {
    if (this.currentPage >= this.totalPages - 1) return;
    this.currentPage += 1;
    this._renderEntries();
    this._updatePageControls();
  }

  _scrollBy(deltaY) {
    if (this.totalPages <= 1) return;
    const newPage = Phaser.Math.Clamp(this.currentPage + (deltaY > 0 ? 1 : -1), 0, this.totalPages - 1);
    if (newPage === this.currentPage) return;
    this.currentPage = newPage;
    this._renderEntries();
    this._updatePageControls();
  }

  async _loadLeaderboard() {
    this.statusText.setText("加载中...").setVisible(true).setDepth(300);
    this.entriesContainer.removeAll(true);
    this._clearRows();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/api/leaderboard?sort=${this.currentSort}&limit=${ENTRY_LIMIT}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      this.statusText.setVisible(false);

      if (!data.entries || data.entries.length === 0) {
        this.statusText.setText("暂无数据").setVisible(true).setDepth(300);
        this.allEntries = [];
        this._renderEntries();
        this._updatePageControls();
        return;
      }

      this.allEntries = data.entries;
      this._renderEntries();
      this._updatePageControls();
    } catch (err) {
      this._loadFromLocalStorage();
    }
  }

  _loadFromLocalStorage() {
    this.statusText.setVisible(false);
    const localData = this._readLocalLeaderboard(this.currentSort);

    if (localData.length === 0) {
      this.statusText.setText("暂无数据 (离线)").setVisible(true).setDepth(300);
      this.allEntries = [];
    } else {
      this.allEntries = localData;
    }

    this._renderEntries();
    this._updatePageControls();
  }

  _readLocalLeaderboard(sortKey) {
    const keys = {
      bestTime: "forgeduel_leaderboard_bestTime",
      totalKills: "forgeduel_leaderboard_totalKills",
      highestLevel: "forgeduel_leaderboard_highestLevel"
    };
    const storageKey = keys[sortKey];
    if (!storageKey) return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const entries = JSON.parse(raw);
        if (Array.isArray(entries) && entries.length > 0) return entries;
      }
    } catch (_) {}

    const fallbackKeys = {
      bestTime: "forgeduel_best_time_ms",
      totalKills: "forgeduel_best_time_ms",
      highestLevel: "forgeduel_best_time_ms"
    };
    try {
      const val = parseInt(window.localStorage.getItem(fallbackKeys[sortKey]) || "0", 10);
      if (val > 0) {
        return [{ rank: 1, username: "本地", value: val }];
      }
    } catch (_) {}
    return [];
  }

  _clearRows() {
    if (!this.rowObjects) return;
    for (const row of this.rowObjects) {
      row.objects.forEach(o => { try { o.destroy?.(); } catch (_) {} });
    }
    this.rowObjects = [];
  }

  _renderEntries() {
    this.entriesContainer.removeAll(true);
    this._clearRows();

    const startIdx = this.currentPage * VISIBLE_ROWS;
    const endIdx = Math.min(startIdx + VISIBLE_ROWS, this.allEntries.length);
    const pageEntries = this.allEntries.slice(startIdx, endIdx);
    if (pageEntries.length === 0) return;

    const rankX = this.listLeft + 10;
    const nameX = this.listLeft + 56;
    const valueX = this.listRight;

    const selfUsername = this._getSelfUsername();

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i];
      const globalRank = startIdx + i + 1;
      const y = this.listTop + i * ROW_STEP;
      const isSelf = selfUsername && entry.username === selfUsername;
      const isTop3 = globalRank <= 3;
      const isEven = i % 2 === 0;
      const bgColor = isSelf ? C.selfRow : isEven ? C.rowEven : C.rowOdd;

      const objects = [];

      const rowBg = this.add.rectangle(this.cx, y + ROW_H / 2, this.listWidth, ROW_H, bgColor, 0.82)
        .setDepth(100);
      objects.push(rowBg);

      if (isTop3) {
        const hlBar = this.add.rectangle(this.cx, y + ROW_H / 2, this.listWidth, ROW_H, 0x000000, 0)
          .setStrokeStyle(1, globalRank === 1 ? 0xffd700 : globalRank === 2 ? 0xc0c0c0 : 0xcd7f32, 0.35)
          .setDepth(100);
        objects.push(hlBar);
      }

      rowBg.setInteractive({ useHandCursor: true });
      rowBg.on("pointerover", () => rowBg.setFillStyle(C.rowHover, 0.9));
      rowBg.on("pointerout", () => rowBg.setFillStyle(bgColor, 0.82));

      const medalColors = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
      const rankColor = medalColors[globalRank] || C.textMuted;

      let rankStr = `#${globalRank}`;
      if (globalRank === 1) rankStr = "1st";
      else if (globalRank === 2) rankStr = "2nd";
      else if (globalRank === 3) rankStr = "3rd";

      const rankText = this.add.text(rankX, y + ROW_H / 2, rankStr, {
        fontFamily: "ZpixOne", fontSize: isTop3 ? "13px" : "12px",
        color: rankColor,
        fontStyle: isTop3 ? "bold" : "normal"
      }).setOrigin(0, 0.5).setDepth(101);
      objects.push(rankText);

      const nameStr = (entry.username || "???").substring(0, 16);
      const nameColor = isSelf ? C.textSelf : C.textWhite;
      const nameText = this.add.text(nameX, y + ROW_H / 2, nameStr, {
        fontFamily: "ZpixOne", fontSize: "12px", color: nameColor
      }).setOrigin(0, 0.5).setDepth(101);
      objects.push(nameText);

      let displayValue;
      if (this.currentSort === "bestTime") {
        displayValue = formatTime(entry.value);
      } else {
        displayValue = formatNumber(entry.value);
      }

      const valueText = this.add.text(valueX, y + ROW_H / 2, displayValue, {
        fontFamily: "ZpixOne", fontSize: "12px", color: isTop3 ? rankColor : C.textValue
      }).setOrigin(1, 0.5).setDepth(101);
      objects.push(valueText);

      this.rowObjects.push({ objects, y, bgColor });
    }

    this.entriesContainer.add(this.rowObjects.flatMap(r => r.objects));
  }

  _getSelfUsername() {
    try {
      const raw = window.localStorage.getItem("forgeduel_token_user");
      if (raw) return JSON.parse(raw).username;
    } catch (_) {}
    return null;
  }

  shutdown() {
    if (this.headerObjects) this.headerObjects.forEach(o => o.destroy?.());
    if (this.pageContainer) this.pageContainer.destroy(true);
    this._clearRows();
    this.children.removeAll(true);
  }
}