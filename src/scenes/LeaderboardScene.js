import { createBackButton } from "../ui/createBackButton.js";

const API_BASE = window.location.origin;

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
  }

  create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    this.add.rectangle(cx, cy, camera.width, camera.height, 0x071120, 1);
    for (let y = 0; y < camera.height; y += 32) {
      const color = Math.floor(y / 32) % 2 === 0 ? 0x0d1a31 : 0x11213d;
      this.add.rectangle(cx, y + 16, camera.width, 30, color, 1).setOrigin(0.5);
    }

    this.add.rectangle(cx, cy, 600, 500, 0x10203a, 0.96).setStrokeStyle(3, 0x5ca7ff, 0.96);
    this.add.rectangle(cx, cy, 580, 480, 0x0b1830, 0.94).setStrokeStyle(1, 0x3a7abf, 0.88);

    this.add.text(cx, cy - 215, "排行榜", {
      fontFamily: "Zpix", fontSize: "32px", color: "#f8fbff",
      stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5);

    this.currentSort = "bestTime";
    this.tabButtons = [];
    const tabs = [
      { key: "bestTime", label: "最佳时间" },
      { key: "totalKills", label: "最多击杀" },
      { key: "highestLevel", label: "最高等级" }
    ];

    tabs.forEach((tab, i) => {
      const tx = cx - 120 + i * 120;
      const ty = cy - 170;
      const bg = this.add.rectangle(tx, ty, 110, 32, 0x1a324f, 1)
        .setStrokeStyle(1, i === 0 ? 0x6ab8ff : 0x3a5a7f, 1)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(tx, ty, tab.label, {
        fontFamily: "Zpix", fontSize: "14px", color: i === 0 ? "#ffffff" : "#7a9abf"
      }).setOrigin(0.5);

      bg.on("pointerdown", () => {
        this.currentSort = tab.key;
        this._updateTabStyles();
        this._loadLeaderboard();
      });

      this.tabButtons.push({ bg, text, key: tab.key });
    });

    this.entriesContainer = this.add.container(cx, cy);

    this.statusText = this.add.text(cx, cy, "加载中...", {
      fontFamily: "Zpix", fontSize: "16px", color: "#8ab8e0"
    }).setOrigin(0.5);

    createBackButton(this, () => this.scene.start("MainMenuScene"));

    this._loadLeaderboard();
  }

  _updateTabStyles() {
    for (const tab of this.tabButtons) {
      const active = tab.key === this.currentSort;
      tab.bg.setStrokeStyle(1, active ? 0x6ab8ff : 0x3a5a7f, 1);
      tab.text.setColor(active ? "#ffffff" : "#7a9abf");
    }
  }

  async _loadLeaderboard() {
    this.statusText.setText("加载中...");
    this.statusText.setVisible(true);
    this.entriesContainer.removeAll(true);

    try {
      const res = await fetch(`${API_BASE}/api/leaderboard?sort=${this.currentSort}&limit=10`);
      const data = await res.json();

      this.statusText.setVisible(false);

      if (!data.entries || data.entries.length === 0) {
        this.statusText.setText("暂无数据").setVisible(true);
        return;
      }

      const startY = -120;
      const rowHeight = 32;

      const headerBg = this.add.rectangle(0, startY - 10, 480, 28, 0x1a324f, 0.9);
      this.entriesContainer.add(headerBg);

      const rankHeader = this.add.text(-200, startY - 10, "排名", {
        fontFamily: "Zpix", fontSize: "13px", color: "#ffd866"
      }).setOrigin(0, 0.5);
      const nameHeader = this.add.text(-80, startY - 10, "玩家", {
        fontFamily: "Zpix", fontSize: "13px", color: "#ffd866"
      }).setOrigin(0, 0.5);
      const valueHeader = this.add.text(160, startY - 10, "数据", {
        fontFamily: "Zpix", fontSize: "13px", color: "#ffd866"
      }).setOrigin(1, 0.5);
      this.entriesContainer.add([rankHeader, nameHeader, valueHeader]);

      data.entries.forEach((entry, i) => {
        const y = startY + 20 + i * rowHeight;
        const bgColor = i % 2 === 0 ? 0x0f1e35 : 0x0b1830;
        const bg = this.add.rectangle(0, y, 480, rowHeight, bgColor, 0.7);
        this.entriesContainer.add(bg);

        const medalColors = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
        const rankColor = medalColors[entry.rank] || "#ffffff";
        const rankText = this.add.text(-200, y, `#${entry.rank}`, {
          fontFamily: "Zpix", fontSize: "15px", color: rankColor
        }).setOrigin(0, 0.5);
        this.entriesContainer.add(rankText);

        const nameText = this.add.text(-80, y, entry.username, {
          fontFamily: "Zpix", fontSize: "15px", color: "#ffffff"
        }).setOrigin(0, 0.5);
        this.entriesContainer.add(nameText);

        let displayValue;
        if (this.currentSort === "bestTime") {
          const sec = Math.floor(entry.value / 1000);
          displayValue = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
        } else {
          displayValue = String(entry.value);
        }

        const valueText = this.add.text(160, y, displayValue, {
          fontFamily: "Zpix", fontSize: "15px", color: "#cfe9ff"
        }).setOrigin(1, 0.5);
        this.entriesContainer.add(valueText);
      });
    } catch (err) {
      this.statusText.setText("加载失败，请检查服务器").setVisible(true);
    }
  }

  _createLink(x, y, label, onClick) {
    const text = this.add.text(x, y, label, {
      fontFamily: "Zpix", fontSize: "14px", color: "#7ab8e0"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on("pointerdown", onClick);
    text.on("pointerover", () => text.setColor("#ffffff"));
    text.on("pointerout", () => text.setColor("#7ab8e0"));
    return text;
  }
}
