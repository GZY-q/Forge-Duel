import { FIGHTER_CONFIGS, FIGHTER_KEYS } from "../config/fighters.js";
import { SHIP_CONFIGS, SHIP_STORAGE_KEY } from "../config/ships.js";
import { SocketClient } from "../networking/SocketClient.js";
import { NetworkManager } from "../networking/NetworkManager.js";
import { VoiceManager } from "../networking/VoiceManager.js";
import { createVSBackground, createVSPanel, createVSButton } from "../ui/vsUI.js";
import { createBackButton } from "../ui/createBackButton.js";

const API_BASE = window.location.origin;
const MAX_PLAYERS = 4;

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  init(data) {
    this.mode = data?.mode || "create";
    this.authToken = data?.authToken || localStorage.getItem("forgeduel_token") || "";
    this.authUser = data?.authUser || JSON.parse(localStorage.getItem("forgeduel_user") || "null");
    this.selectedShip = data?.selectedShip || localStorage.getItem(SHIP_STORAGE_KEY) || null;
    this.selectedFighter = data?.fighterType || this.selectedShip || localStorage.getItem("forgeduel_selected_fighter") || "scout";
  }

  async create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    // ── VS Background ──
    createVSBackground(this);

    // ── Panel ──
    createVSPanel(this, cx, cy, 700, 520);

    // ── Title ──
    this.add.text(cx, cy - 225, "联机大厅", {
      fontFamily: "ZpixOne", fontSize: "32px", color: "#ffffff",
      stroke: "#2a2a3a", strokeThickness: 5
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, cy - 190, "正在连接...", {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#8ab8e0"
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(cx, cy - 155, "", {
      fontFamily: "ZpixOne", fontSize: "28px", color: "#ffd866",
      stroke: "#1a1a00", strokeThickness: 4
    }).setOrigin(0.5);

    this.playerSlots = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slotY = cy - 100 + i * 55;
      const bg = this.add.rectangle(cx, slotY, 500, 44, 0x2a2a4a, 0.9)
        .setStrokeStyle(1, 0x4a4a5a, 0.8);
      const nameText = this.add.text(cx - 220, slotY, "等待玩家...", {
        fontFamily: "ZpixOne", fontSize: "16px", color: "#5a5a6a"
      }).setOrigin(0, 0.5);
      const readyText = this.add.text(cx + 200, slotY, "", {
        fontFamily: "ZpixOne", fontSize: "14px", color: "#44ff44"
      }).setOrigin(1, 0.5);
      const hostText = this.add.text(cx + 230, slotY, "", {
        fontFamily: "ZpixOne", fontSize: "12px", color: "#ffd866"
      }).setOrigin(0, 0.5);
      const speakingDot = this.add.circle(cx - 235, slotY, 5, 0x333333);
      this.playerSlots.push({ bg, nameText, readyText, hostText, speakingDot });
    }

    this.voiceControls = this._createVoiceControls(cx, cy + 155);
    this.readyBtn = createVSButton(this, cx - 80, cy + 210, "准备", {
      width: 140, height: 42, fontSize: "18px",
      onClick: () => this._toggleReady()
    });
    this.startBtn = createVSButton(this, cx + 80, cy + 210, "开始游戏", {
      width: 140, height: 42, fontSize: "18px",
      onClick: () => this._startGame()
    });
    this.startBtn.plate.setAlpha(0.4);
    this.startBtn.plate.disableInteractive();

    createBackButton(this, () => this._leaveAndReturn());

    if (this.mode === "join") {
      this._showJoinInput(cx, cy);
    }

    this.isReady = false;
    this.voiceManager = null;
    this.speakingStates = new Map();

    await this._connectAndJoin();
  }

  _showJoinInput(cx, cy) {
    if (typeof document === "undefined") return;

    this.codeInput = document.createElement("input");
    this.codeInput.type = "text";
    this.codeInput.placeholder = "输入房间码";
    this.codeInput.maxLength = 4;
    Object.assign(this.codeInput.style, {
      position: "absolute", left: "50%", top: "30%",
      transform: "translate(-50%, -50%)", width: "180px",
      padding: "10px", fontSize: "20px", fontFamily: "monospace",
      background: "#1a1a2a", color: "#ffd866", border: "2px solid #c4a040",
      borderRadius: "4px", outline: "none", textAlign: "center",
      letterSpacing: "8px", zIndex: "200", textTransform: "uppercase"
    });
    document.body.appendChild(this.codeInput);
  }

  _createVoiceControls(x, y) {
    const micBg = this.add.rectangle(x - 60, y, 44, 44, 0x2a2a4a, 1)
      .setStrokeStyle(2, 0x44ff44, 1).setInteractive({ useHandCursor: true });
    const micIcon = this.add.text(x - 60, y, "MIC", {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#44ff44"
    }).setOrigin(0.5);

    const spkBg = this.add.rectangle(x + 60, y, 44, 44, 0x2a2a4a, 1)
      .setStrokeStyle(2, 0x44ff44, 1).setInteractive({ useHandCursor: true });
    const spkIcon = this.add.text(x + 60, y, "SPK", {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#44ff44"
    }).setOrigin(0.5);

    this.micEnabled = true;
    this.spkEnabled = true;

    micBg.on("pointerdown", () => {
      this.micEnabled = !this.micEnabled;
      if (this.voiceManager) this.voiceManager.toggleMic();
      micBg.setStrokeStyle(2, this.micEnabled ? 0x44ff44 : 0xff4444, 1);
      micIcon.setColor(this.micEnabled ? "#44ff44" : "#ff4444");
    });

    spkBg.on("pointerdown", () => {
      this.spkEnabled = !this.spkEnabled;
      if (this.voiceManager) this.voiceManager.toggleSpeaker();
      spkBg.setStrokeStyle(2, this.spkEnabled ? 0x44ff44 : 0xff4444, 1);
      spkIcon.setColor(this.spkEnabled ? "#44ff44" : "#ff4444");
    });

    return { micBg, micIcon, spkBg, spkIcon };
  }

  async _connectAndJoin() {
    try {
      this.socketClient = new SocketClient();
      const serverUrl = API_BASE;
      await this.socketClient.connect(serverUrl, this.authToken);

      this.networkManager = new NetworkManager(this.socketClient);

      this.networkManager.onPlayerJoined = (data) => this._refreshPlayerList();
      this.networkManager.onPlayerLeft = (data) => this._refreshPlayerList();
      this.networkManager.onGameStarted = (data) => this._onGameStarted(data);
      this.networkManager.onHostMigrated = (data) => {
        this._refreshPlayerList();
        this._updateStartButton();
      };

      this.voiceManager = new VoiceManager(this.networkManager);
      this.voiceManager.onSpeakingChange = (id, speaking) => {
        this.speakingStates.set(id, speaking);
        this._updateSpeakingIndicators();
      };

      if (this.mode === "create") {
        const result = await this.networkManager.createRoom(this.selectedFighter);
        this.roomCodeText.setText(`房间码: ${result.roomCode}`);
        this.statusText.setText("等待其他玩家加入...");
        this._updateStartButton();
        this._refreshPlayerList();
      } else {
        const code = this.codeInput?.value?.trim()?.toUpperCase();
        if (!code || code.length < 4) {
          this.statusText.setText("请输入有效的房间码");
          return;
        }
        const result = await this.networkManager.joinRoom(code, this.selectedFighter);
        this.roomCodeText.setText(`房间码: ${result.roomCode}`);
        this.statusText.setText("已加入房间，等待开始...");
        this.codeInput?.remove();
        this._refreshPlayerList();
      }

      await this.voiceManager.startLocalStream();

      const peerIds = this.networkManager.players
        .filter((p) => p.playerId !== this.networkManager.playerId)
        .map((p) => p.playerId);
      for (const peerId of peerIds) {
        await this.voiceManager.callPeer(peerId);
      }
    } catch (err) {
      this.statusText.setText(`连接失败: ${err.message}`);
    }
  }

  _refreshPlayerList() {
    const players = this.networkManager?.players || [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slot = this.playerSlots[i];
      if (i < players.length) {
        const p = players[i];
        const shipCfg = SHIP_CONFIGS[p.fighterType];
        const fighterCfg = FIGHTER_CONFIGS[p.fighterType];
        const label = shipCfg?.name || fighterCfg?.label || p.fighterType;
        slot.nameText.setText(`${p.username || "Player"} (${label})`);
        slot.nameText.setColor("#ffffff");
        slot.readyText.setText(p.ready ? "✓ 准备" : "等待中");
        slot.readyText.setColor(p.ready ? "#44ff44" : "#888888");
        slot.hostText.setText(p.isHost ? "HOST" : "");
        slot.bg.setStrokeStyle(1, p.isHost ? 0xffd866 : 0x4a4a5a, 0.8);
      } else {
        slot.nameText.setText("等待玩家...");
        slot.nameText.setColor("#5a5a6a");
        slot.readyText.setText("");
        slot.hostText.setText("");
        slot.bg.setStrokeStyle(1, 0x4a4a5a, 0.8);
      }
    }
    this._updateStartButton();
  }

  _updateStartButton() {
    const isHost = this.networkManager?.isHost;
    const players = this.networkManager?.players || [];
    const allReady = players.length >= 1 && players.every((p) => p.ready || p.isHost);

    if (isHost && allReady) {
      this.startBtn.plate.setAlpha(1);
      this.startBtn.plate.setInteractive({ useHandCursor: true });
    } else {
      this.startBtn.plate.setAlpha(0.4);
      this.startBtn.plate.disableInteractive();
    }
  }

  _updateSpeakingIndicators() {
    const players = this.networkManager?.players || [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slot = this.playerSlots[i];
      if (i < players.length) {
        const p = players[i];
        const speaking = this.speakingStates.get(p.playerId) || false;
        slot.speakingDot.setFillStyle(speaking ? 0x44ff44 : 0x333333);
      } else {
        slot.speakingDot.setFillStyle(0x333333);
      }
    }
    const localSpeaking = this.speakingStates.get("local") || false;
    const localSlot = this.playerSlots.find((s, i) =>
      i < players.length && players[i].playerId === this.networkManager?.playerId
    );
    if (localSlot) {
      localSlot.speakingDot.setFillStyle(localSpeaking ? 0x44ff44 : 0x333333);
    }
  }

  async _toggleReady() {
    this.isReady = !this.isReady;
    await this.networkManager?.setReady(this.isReady);
    this.readyBtn.text.setText(this.isReady ? "取消准备" : "准备");
    this.readyBtn.plate.setStrokeStyle(3, this.isReady ? 0xffd866 : 0xc4a040, 1);
  }

  async _startGame() {
    if (!this.networkManager?.isHost) return;
    try {
      await this.networkManager.startGame();
    } catch (err) {
      this.statusText.setText(`启动失败: ${err.message}`);
    }
  }

  _onGameStarted(data) {
    this._cleanup();
    this.scene.start("GameScene", {
      gameMode: "coop",
      networkManager: this.networkManager,
      socketClient: this.socketClient,
      voiceManager: this.voiceManager,
      isHost: this.networkManager.isHost,
      hostId: data.hostId,
      players: data.players,
      seed: data.seed,
      selectedShip: this.selectedShip,
      selectedFighter: this.selectedFighter
    });
  }

  _leaveAndReturn() {
    this._cleanup();
    this.scene.start("MainMenuScene");
  }

  _cleanup() {
    this.codeInput?.remove();
    this.codeInput = null;
  }

  shutdown() {
    this._cleanup();
    if (this.voiceManager && !this.scene.isActive("GameScene")) {
      this.voiceManager.hangup();
      this.voiceManager = null;
    }
    if (this.networkManager && !this.scene.isActive("GameScene")) {
      this.networkManager.leaveRoom();
      this.networkManager.destroy();
      this.networkManager = null;
    }
    if (this.socketClient && !this.scene.isActive("GameScene")) {
      this.socketClient.disconnect();
      this.socketClient = null;
    }
  }
}
