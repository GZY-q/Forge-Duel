import { FIGHTER_CONFIGS, FIGHTER_KEYS } from "../config/fighters.js";
import { SocketClient } from "../networking/SocketClient.js";
import { NetworkManager } from "../networking/NetworkManager.js";
import { VoiceManager } from "../networking/VoiceManager.js";

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
    this.selectedFighter = data?.fighterType || localStorage.getItem("forgeduel_selected_fighter") || "scout";
  }

  async create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    this.add.rectangle(cx, cy, camera.width, camera.height, 0x071120, 1);
    for (let y = 0; y < camera.height; y += 32) {
      const color = Math.floor(y / 32) % 2 === 0 ? 0x0d1a31 : 0x11213d;
      this.add.rectangle(cx, y + 16, camera.width, 30, color, 1).setOrigin(0.5);
    }

    this.add.rectangle(cx, cy, 700, 520, 0x10203a, 0.96).setStrokeStyle(3, 0x5ca7ff, 0.96);
    this.add.rectangle(cx, cy, 680, 500, 0x0b1830, 0.94).setStrokeStyle(1, 0x3a7abf, 0.88);

    this.add.text(cx, cy - 225, "联机大厅", {
      fontFamily: "Arial", fontSize: "32px", color: "#f8fbff",
      stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, cy - 190, "正在连接...", {
      fontFamily: "Arial", fontSize: "14px", color: "#8ab8e0"
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(cx, cy - 155, "", {
      fontFamily: "Arial", fontSize: "28px", color: "#ffd866",
      stroke: "#1a1a00", strokeThickness: 4
    }).setOrigin(0.5);

    this.playerSlots = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slotY = cy - 100 + i * 55;
      const bg = this.add.rectangle(cx, slotY, 500, 44, 0x1a324f, 0.9)
        .setStrokeStyle(1, 0x3a5a7f, 0.8);
      const nameText = this.add.text(cx - 220, slotY, "等待玩家...", {
        fontFamily: "Arial", fontSize: "16px", color: "#5a7a9f"
      }).setOrigin(0, 0.5);
      const readyText = this.add.text(cx + 200, slotY, "", {
        fontFamily: "Arial", fontSize: "14px", color: "#44ff44"
      }).setOrigin(1, 0.5);
      const hostText = this.add.text(cx + 230, slotY, "", {
        fontFamily: "Arial", fontSize: "12px", color: "#ffd866"
      }).setOrigin(0, 0.5);
      const speakingDot = this.add.circle(cx - 235, slotY, 5, 0x333333);
      this.playerSlots.push({ bg, nameText, readyText, hostText, speakingDot });
    }

    this.voiceControls = this._createVoiceControls(cx, cy + 155);
    this.readyBtn = this._createButton(cx - 80, cy + 210, "准备", () => this._toggleReady());
    this.startBtn = this._createButton(cx + 80, cy + 210, "开始游戏", () => this._startGame());
    this.startBtn.bg.setAlpha(0.4);
    this.startBtn.bg.disableInteractive();

    this._createLink(cx, cy + 248, "返回主菜单", () => this._leaveAndReturn());

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
      background: "#0b1830", color: "#ffd866", border: "2px solid #ffd866",
      borderRadius: "6px", outline: "none", textAlign: "center",
      letterSpacing: "8px", zIndex: "200", textTransform: "uppercase"
    });
    document.body.appendChild(this.codeInput);
  }

  _createVoiceControls(x, y) {
    const micBg = this.add.rectangle(x - 60, y, 44, 44, 0x1a324f, 1)
      .setStrokeStyle(2, 0x44ff44, 1).setInteractive({ useHandCursor: true });
    const micIcon = this.add.text(x - 60, y, "MIC", {
      fontFamily: "Arial", fontSize: "12px", color: "#44ff44"
    }).setOrigin(0.5);

    const spkBg = this.add.rectangle(x + 60, y, 44, 44, 0x1a324f, 1)
      .setStrokeStyle(2, 0x44ff44, 1).setInteractive({ useHandCursor: true });
    const spkIcon = this.add.text(x + 60, y, "SPK", {
      fontFamily: "Arial", fontSize: "12px", color: "#44ff44"
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

  _createButton(x, y, label, onClick) {
    const bg = this.add.rectangle(x, y, 140, 40, 0x1a324f, 1)
      .setStrokeStyle(2, 0x6ab8ff, 1).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "18px", color: "#ffffff",
      stroke: "#0f1c2f", strokeThickness: 3
    }).setOrigin(0.5);
    bg.on("pointerdown", onClick);
    text.on("pointerdown", onClick);
    bg.on("pointerover", () => bg.setStrokeStyle(3, 0x9bd3ff, 1));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x6ab8ff, 1));
    return { bg, text };
  }

  _createLink(x, y, label, onClick) {
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "14px", color: "#7ab8e0"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on("pointerdown", onClick);
    text.on("pointerover", () => text.setColor("#ffffff"));
    text.on("pointerout", () => text.setColor("#7ab8e0"));
    return text;
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
        const config = FIGHTER_CONFIGS[p.fighterType] || FIGHTER_CONFIGS.scout;
        slot.nameText.setText(`${p.username || "Player"} (${config.label})`);
        slot.nameText.setColor("#ffffff");
        slot.readyText.setText(p.ready ? "✓ 准备" : "等待中");
        slot.readyText.setColor(p.ready ? "#44ff44" : "#888888");
        slot.hostText.setText(p.isHost ? "HOST" : "");
        slot.bg.setStrokeStyle(1, p.isHost ? 0xffd866 : 0x3a5a7f, 0.8);
      } else {
        slot.nameText.setText("等待玩家...");
        slot.nameText.setColor("#5a7a9f");
        slot.readyText.setText("");
        slot.hostText.setText("");
        slot.bg.setStrokeStyle(1, 0x3a5a7f, 0.8);
      }
    }
    this._updateStartButton();
  }

  _updateStartButton() {
    const isHost = this.networkManager?.isHost;
    const players = this.networkManager?.players || [];
    const allReady = players.length >= 1 && players.every((p) => p.ready || p.isHost);

    if (isHost && allReady) {
      this.startBtn.bg.setAlpha(1);
      this.startBtn.bg.setInteractive({ useHandCursor: true });
    } else {
      this.startBtn.bg.setAlpha(0.4);
      this.startBtn.bg.disableInteractive();
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
    this.readyBtn.bg.setStrokeStyle(2, this.isReady ? 0xffd866 : 0x6ab8ff, 1);
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
