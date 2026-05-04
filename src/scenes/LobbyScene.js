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
    this._transitioningToGame = false;
  }

  create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    createVSBackground(this);

    // Register shutdown cleanup via Phaser's event system.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._onShutdown());

    // ESC key returns
    if (this.input?.keyboard) {
      this.input.keyboard.on("keydown-ESC", () => this._leaveAndReturn());
    }

    if (this.mode === "select") {
      this._showRoomSelection(cx, cy);
    } else {
      this._setupLobbyUI(cx, cy);
      this._connectAndJoin();
    }
  }

  // ═══════════════════════════════════════════════
  // Room Selection Screen
  // ═══════════════════════════════════════════════

  _showRoomSelection(cx, cy) {
    this.selectionObjects = [];

    createVSPanel(this, cx, cy, 500, 340);

    const title = this.add.text(cx, cy - 120, "联机模式", {
      fontFamily: "ZpixOne", fontSize: "32px", color: "#ffffff",
      stroke: "#2a2a3a", strokeThickness: 5
    }).setOrigin(0.5);
    this.selectionObjects.push(title);

    const subtitle = this.add.text(cx, cy - 70, "选择房间模式", {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#8ab8e0"
    }).setOrigin(0.5);
    this.selectionObjects.push(subtitle);

    // Create room button
    const createBtn = createVSButton(this, cx, cy + 10, "创建房间", {
      width: 240, height: 60, fontSize: "22px",
      onClick: () => this._onSelectCreate()
    });
    this.selectionObjects.push(createBtn.plate, createBtn.text);

    // Join room button
    const joinBtn = createVSButton(this, cx, cy + 90, "加入房间", {
      width: 240, height: 60, fontSize: "22px",
      onClick: () => this._onSelectJoin()
    });
    this.selectionObjects.push(joinBtn.plate, joinBtn.text);

    this._selectionBackBtn = createBackButton(this, () => {
      this.scene.start("ShipSelectionScene", { mode: "coop" });
    });
  }

  _destroySelectionUI() {
    if (this.selectionObjects) {
      this.selectionObjects.forEach(obj => obj?.destroy?.());
      this.selectionObjects = null;
    }
    if (this._selectionBackBtn) {
      this._selectionBackBtn.container?.destroy();
      this._selectionBackBtn = null;
    }
  }

  _onSelectCreate() {
    this._destroySelectionUI();
    this.mode = "create";
    const cx = this.cameras.main.width * 0.5;
    const cy = this.cameras.main.height * 0.5;
    this._setupLobbyUI(cx, cy);
    this._connectAndJoin();
  }

  _onSelectJoin() {
    this._destroySelectionUI();
    const cx = this.cameras.main.width * 0.5;
    const cy = this.cameras.main.height * 0.5;
    this._showRoomCodeInput(cx, cy);
  }

  // ═══════════════════════════════════════════════
  // Room Code Input — visible DOM input over the Phaser panel.
  // A single-line input avoids all hidden-input cursor issues on mobile.
  // ═══════════════════════════════════════════════

  _showRoomCodeInput(cx, cy) {
    this.codeInputObjects = [];

    createVSPanel(this, cx, cy, 420, 280);

    const title = this.add.text(cx, cy - 95, "输入房间码", {
      fontFamily: "ZpixOne", fontSize: "24px", color: "#ffffff",
      stroke: "#2a2a3a", strokeThickness: 4
    }).setOrigin(0.5);
    this.codeInputObjects.push(title);

    const hint = this.add.text(cx, cy - 60, "输入房主分享的4位数字", {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#8ab8e0"
    }).setOrigin(0.5);
    this.codeInputObjects.push(hint);

    this.codeStatusText = this.add.text(cx, cy + 50, "", {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#ff6666"
    }).setOrigin(0.5);
    this.codeInputObjects.push(this.codeStatusText);

    // Confirm button
    const confirmBtn = createVSButton(this, cx + 80, cy + 92, "确认", {
      width: 100, height: 36, fontSize: "14px",
      onClick: () => this._submitJoinCode()
    });
    this.codeInputObjects.push(confirmBtn.plate, confirmBtn.text);

    // Back button
    const backBtn = createVSButton(this, cx - 80, cy + 92, "返回", {
      width: 100, height: 36, fontSize: "14px",
      onClick: () => this._cancelCodeInput()
    });
    this.codeInputObjects.push(backBtn.plate, backBtn.text);

    // Visible single-line DOM input — native keyboard on mobile, no cursor tricks.
    this._codeDomInput = document.createElement("input");
    this._codeDomInput.type = "tel";
    this._codeDomInput.inputMode = "numeric";
    this._codeDomInput.maxLength = 4;
    this._codeDomInput.placeholder = "0000";
    this._codeDomInput.autocomplete = "off";
    this._codeDomInput.autocorrect = "off";
    this._codeDomInput.spellcheck = false;
    this._codeDomInput.pattern = "[0-9]*";
    Object.assign(this._codeDomInput.style, {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "220px",
      height: "52px",
      padding: "0 16px",
      fontSize: "28px",
      fontFamily: "'ZpixOne', 'Courier New', monospace",
      color: "#ffd866",
      background: "#1a1a2a",
      border: "2px solid #c4a040",
      borderRadius: "6px",
      outline: "none",
      textAlign: "center",
      letterSpacing: "18px",
      zIndex: "9999",
      caretColor: "#ffd866",
      boxSizing: "border-box"
    });
    document.body.appendChild(this._codeDomInput);

    // Focus after DOM settles
    this.time.delayedCall(100, () => this._codeDomInput?.focus());

    // Block non-digit keystrokes early
    this._beforeInputHandler = (event) => {
      if (event.data && !/^[0-9]+$/.test(event.data)) {
        event.preventDefault();
      }
    };
    this._codeDomInput.addEventListener("beforeinput", this._beforeInputHandler);

    // Read current value and update status / auto-submit
    this._domInputHandler = () => {
      const digits = this._codeDomInput.value.replace(/[^0-9]/g, "");
      if (this.codeStatusText) {
        this.codeStatusText.setText("");
      }
      if (digits.length >= 4) {
        this.time.delayedCall(200, () => this._submitJoinCode());
      }
    };
    this._codeDomInput.addEventListener("input", this._domInputHandler);

    // Enter key on desktop
    this._domKeyHandler = (event) => {
      if (event.key === "Enter") {
        this._submitJoinCode();
      }
    };
    this._codeDomInput.addEventListener("keydown", this._domKeyHandler);
  }

  _submitJoinCode() {
    const code = this._codeDomInput?.value.replace(/[^0-9]/g, "") || "";
    if (code.length < 4) {
      if (this.codeStatusText) {
        this.codeStatusText.setText("请输入完整的4位数字");
        this.codeStatusText.setColor("#ff6666");
      }
      return;
    }
    this._destroyCodeInput();
    this.joinCode = code;
    this.mode = "join";
    const cx = this.cameras.main.width * 0.5;
    const cy = this.cameras.main.height * 0.5;
    this._setupLobbyUI(cx, cy);
    this._connectAndJoin();
  }

  _cancelCodeInput() {
    this._destroyCodeInput();
    const cx = this.cameras.main.width * 0.5;
    const cy = this.cameras.main.height * 0.5;
    this._showRoomSelection(cx, cy);
  }

  _destroyCodeInput() {
    if (this._codeDomInput) {
      this._codeDomInput.removeEventListener("beforeinput", this._beforeInputHandler);
      this._codeDomInput.removeEventListener("input", this._domInputHandler);
      this._codeDomInput.removeEventListener("keydown", this._domKeyHandler);
      this._codeDomInput.remove();
      this._codeDomInput = null;
      this._beforeInputHandler = null;
      this._domInputHandler = null;
      this._domKeyHandler = null;
    }
    if (this.codeInputObjects) {
      this.codeInputObjects.forEach(obj => obj?.destroy?.());
      this.codeInputObjects = null;
    }
  }

  // ═══════════════════════════════════════════════
  // Lobby UI
  // ═══════════════════════════════════════════════

  _setupLobbyUI(cx, cy) {
    createVSPanel(this, cx, cy, 700, 520);

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
    this.readyStates = new Map();
    this.kickButtons = [];
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

    this.isReady = false;
    this.voiceManager = null;
    this.speakingStates = new Map();
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

  // ═══════════════════════════════════════════════
  // Connection
  // ═══════════════════════════════════════════════

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
      this.networkManager.onReadyChanged = (data) => {
        this._updatePlayerReadyState(data.playerId, data.ready);
      };
      this.networkManager.onAllReady = () => {
        this.statusText.setText("所有玩家已准备，开始游戏!");
      };
      this.networkManager.onKicked = (data) => {
        this.statusText.setText(`被踢出: ${data.reason || "未知原因"}`);
        this.time.delayedCall(2000, () => this._leaveAndReturn());
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
        const code = this.joinCode;
        if (!code || code.length < 4) {
          this.statusText.setText("请输入有效的房间码");
          return;
        }
        const result = await this.networkManager.joinRoom(code, this.selectedFighter);
        this.roomCodeText.setText(`房间码: ${result.roomCode}`);
        this.statusText.setText("已加入房间，等待开始...");
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

  // ═══════════════════════════════════════════════
  // Player list & state
  // ═══════════════════════════════════════════════

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
        this.readyStates.set(p.playerId, p.ready);
      } else {
        slot.nameText.setText("等待玩家...");
        slot.nameText.setColor("#5a5a6a");
        slot.readyText.setText("");
        slot.hostText.setText("");
        slot.bg.setStrokeStyle(1, 0x4a4a5a, 0.8);
      }
    }
    this._updateStartButton();
    this._updateKickButtons();
  }

  _updatePlayerReadyState(playerId, ready) {
    this.readyStates.set(playerId, ready);
    const players = this.networkManager?.players || [];
    const index = players.findIndex((p) => p.playerId === playerId);
    if (index >= 0 && this.playerSlots[index]) {
      const slot = this.playerSlots[index];
      slot.readyText.setText(ready ? "✓ 准备" : "等待中");
      slot.readyText.setColor(ready ? "#44ff44" : "#888888");
    }
    this._updateStartButton();
  }

  _updateKickButtons() {
    for (const btn of this.kickButtons) {
      btn?.destroy();
    }
    this.kickButtons = [];

    if (!this.networkManager?.isHost) return;

    const players = this.networkManager.players || [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.isHost || p.playerId === this.networkManager.playerId) continue;

      const slot = this.playerSlots[i];
      const kickBtn = this.add.text(slot.nameText.x + 280, slot.nameText.y, "[踢]", {
        fontFamily: "ZpixOne", fontSize: "12px", color: "#ff4444"
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      kickBtn.on("pointerdown", async () => {
        await this.networkManager.kickPlayer(p.playerId);
      });

      this.kickButtons.push(kickBtn);
    }
  }

  _updateStartButton() {
    const isHost = this.networkManager?.isHost;
    const players = this.networkManager?.players || [];
    const allReady = players.length >= 2 && players.every((p) => p.ready);

    if (isHost && allReady && players.length >= 2) {
      this.startBtn.plate.setAlpha(1);
      this.startBtn.plate.setInteractive({ useHandCursor: true });
      this.statusText.setText("所有玩家已准备，点击开始游戏");
    } else if (isHost && players.length < 2) {
      this.startBtn.plate.setAlpha(0.4);
      this.startBtn.plate.disableInteractive();
      this.statusText.setText("等待更多玩家加入...");
    } else if (isHost && !allReady) {
      this.startBtn.plate.setAlpha(0.4);
      this.startBtn.plate.disableInteractive();
      this.statusText.setText("等待所有玩家准备...");
    } else {
      this.startBtn.plate.setAlpha(0.4);
      this.startBtn.plate.disableInteractive();
      this.statusText.setText("等待房主开始...");
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

  // ═══════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════

  async _toggleReady() {
    this.isReady = !this.isReady;
    await this.networkManager?.setReady(this.isReady);
    this.readyBtn.text.setText(this.isReady ? "取消准备" : "准备");
    this.readyBtn.plate.setStrokeStyle(3, this.isReady ? 0xffd866 : 0xc4a040, 1);
    this._updateStartButton();
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
    this._transitioningToGame = true;
    this._destroyCodeInput();
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
    this._destroyCodeInput();
    this.scene.start("MainMenuScene");
  }

  _onShutdown() {
    this._destroyCodeInput();
    if (this._transitioningToGame) return;

    if (this.voiceManager) {
      this.voiceManager.hangup();
      this.voiceManager = null;
    }
    if (this.networkManager) {
      this.networkManager.leaveRoom();
      this.networkManager.destroy();
      this.networkManager = null;
    }
    if (this.socketClient) {
      this.socketClient.disconnect();
      this.socketClient = null;
    }
  }
}
