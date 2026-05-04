export class NetworkManager {
  constructor(socketClient) {
    this.socket = socketClient;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.players = [];
    this.reconnectToken = null;
    this.isReconnecting = false;
    this.isConnected = true;

    this.onRemotePlayerUpdate = null;
    this.onEnemyStateUpdate = null;
    this.onEnemyKilled = null;
    this.onXpDrop = null;
    this.onItemDrop = null;
    this.onPlayerDied = null;
    this.onGameOver = null;
    this.onHostMigrated = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStarted = null;
    this.onVoiceOffer = null;
    this.onVoiceAnswer = null;
    this.onVoiceIceCandidate = null;
    this.onVoiceSpeaking = null;
    this.onConnectionLost = null;
    this.onConnectionRestored = null;
    this.onPlayerDisconnected = null;
    this.onPlayerReconnected = null;
    this.onReadyChanged = null;
    this.onAllReady = null;
    this.onKicked = null;
    this.onEnemyDamage = null;

    this._setupListeners();
  }

  _setupListeners() {
    this.socket.on("game:remote-player-update", (data) => {
      this.onRemotePlayerUpdate?.(data);
    });

    this.socket.on("game:enemy-state", (data) => {
      this.onEnemyStateUpdate?.(data);
    });

    this.socket.on("game:enemy-killed", (data) => {
      this.onEnemyKilled?.(data);
    });

    this.socket.on("game:xp-drop", (data) => {
      this.onXpDrop?.(data);
    });

    this.socket.on("game:item-drop", (data) => {
      this.onItemDrop?.(data);
    });

    this.socket.on("game:player-died", (data) => {
      this.onPlayerDied?.(data);
    });

    this.socket.on("game:over", (data) => {
      this.onGameOver?.(data);
    });

    this.socket.on("game:host-migrated", (data) => {
      if (data.newHostId === this.playerId) {
        this.isHost = true;
      }
      this.onHostMigrated?.(data);
    });

    this.socket.on("room:player-joined", (data) => {
      this.players.push(data);
      this.onPlayerJoined?.(data);
    });

    this.socket.on("room:player-left", (data) => {
      this.players = this.players.filter((p) => p.playerId !== data.playerId);
      this.onPlayerLeft?.(data);
    });

    this.socket.on("game:started", (data) => {
      this.onGameStarted?.(data);
    });

    this.socket.on("voice:offer", (data) => {
      this.onVoiceOffer?.(data);
    });

    this.socket.on("voice:answer", (data) => {
      this.onVoiceAnswer?.(data);
    });

    this.socket.on("voice:ice-candidate", (data) => {
      this.onVoiceIceCandidate?.(data);
    });

    this.socket.on("voice:speaking", (data) => {
      this.onVoiceSpeaking?.(data);
    });

    this.socket.on("room:player-disconnected", (data) => {
      this.onPlayerDisconnected?.(data);
    });

    this.socket.on("room:player-reconnected", (data) => {
      if (data.oldPlayerId === this.playerId) {
        this.playerId = data.playerId;
      }
      this.players = this.players.map((p) =>
        p.playerId === data.oldPlayerId ? { ...p, playerId: data.playerId } : p
      );
      this.onPlayerReconnected?.(data);
    });

    this.socket.on("room:ready-changed", (data) => {
      this.players = this.players.map((p) =>
        p.playerId === data.playerId ? { ...p, ready: data.ready } : p
      );
      this.onReadyChanged?.(data);
    });

    this.socket.on("room:all-ready", () => {
      this.onAllReady?.();
    });

    this.socket.on("room:kicked", (data) => {
      this.onKicked?.(data);
    });

    this.socket.on("game:enemy-damage", (data) => {
      this.onEnemyDamage?.(data);
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      this.onConnectionLost?.();
    });

    this.socket.on("connect", () => {
      const wasDisconnected = !this.isConnected;
      this.isConnected = true;
      if (wasDisconnected && this.reconnectToken) {
        this._attemptReconnect();
      } else if (wasDisconnected) {
        this.onConnectionRestored?.();
      }
    });
  }

  async _attemptReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    try {
      const result = await this.socket.emitWithAck("room:reconnect", {
        reconnectToken: this.reconnectToken
      });

      if (result.error) {
        console.warn("[Network] Reconnect failed:", result.error);
        this.reconnectToken = null;
        this.onConnectionLost?.();
        return;
      }

      this.roomCode = result.roomCode;
      this.playerId = result.playerId;
      this.isHost = result.isHost;
      this.players = result.players || [];

      if (result.gameState && result.gameState.state === "playing") {
        this.isHost = result.gameState.hostId === result.playerId;
        this.onConnectionRestored?.(result.gameState);
      } else {
        this.onConnectionRestored?.();
      }
    } catch (err) {
      console.warn("[Network] Reconnect error:", err);
      this.onConnectionLost?.();
    } finally {
      this.isReconnecting = false;
    }
  }

  async createRoom(fighterType) {
    const result = await this.socket.emitWithAck("room:create", { fighterType });
    if (result.error) throw new Error(result.error);
    this.roomCode = result.roomCode;
    this.playerId = result.playerId;
    this.isHost = result.isHost;
    this.players = result.players || [];
    this.reconnectToken = result.reconnectToken;
    return result;
  }

  async joinRoom(roomCode, fighterType) {
    const result = await this.socket.emitWithAck("room:join", { roomCode, fighterType });
    if (result.error) throw new Error(result.error);
    this.roomCode = result.roomCode;
    this.playerId = result.playerId;
    this.isHost = result.isHost;
    this.players = result.players || [];
    this.reconnectToken = result.reconnectToken;
    return result;
  }

  leaveRoom() {
    this.socket.emit("room:leave");
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.players = [];
    this.reconnectToken = null;
  }

  async setReady(ready) {
    return this.socket.emitWithAck("room:ready", { ready });
  }

  async kickPlayer(targetId) {
    return this.socket.emitWithAck("room:kick", { targetId });
  }

  async startGame() {
    return this.socket.emitWithAck("room:start");
  }

  sendPlayerState(player) {
    this.socket.emit("game:player-update", {
      x: Math.round(player.x),
      y: Math.round(player.y),
      facing: player.facingDirection || "south",
      hp: player.hp,
      maxHp: player.maxHp,
      isDead: player.hp <= 0,
      level: player.level || 1
    });
  }

  sendEnemyState(enemies) {
    this.socket.emit("game:enemy-sync", enemies);
  }

  sendEnemyKilled(enemyId, data) {
    this.socket.emit("game:enemy-killed", { enemyId, ...data });
  }

  sendItemDrop(data) {
    this.socket.emit("game:item-drop", data);
  }

  sendXpDrop(data) {
    this.socket.emit("game:xp-drop", data);
  }

  sendEnemyDamage(enemyId, damage, sourceWeaponType) {
    this.socket.emit("game:enemy-damage", { enemyId, damage, sourceWeaponType });
  }

  sendPlayerDied() {
    this.socket.emit("game:player-died");
  }

  sendGameOver(stats) {
    this.socket.emit("game:game-over", stats);
  }

  sendVoiceOffer(targetId, sdp) {
    this.socket.emit("voice:offer", { targetId, sdp });
  }

  sendVoiceAnswer(targetId, sdp) {
    this.socket.emit("voice:answer", { targetId, sdp });
  }

  sendVoiceIceCandidate(targetId, candidate) {
    this.socket.emit("voice:ice-candidate", { targetId, candidate });
  }

  sendVoiceSpeaking(isSpeaking) {
    this.socket.emit("voice:speaking", { isSpeaking });
  }

  destroy() {
    this.socket.off("game:remote-player-update");
    this.socket.off("game:enemy-state");
    this.socket.off("game:enemy-killed");
    this.socket.off("game:xp-drop");
    this.socket.off("game:item-drop");
    this.socket.off("game:player-died");
    this.socket.off("game:over");
    this.socket.off("game:host-migrated");
    this.socket.off("room:player-joined");
    this.socket.off("room:player-left");
    this.socket.off("game:started");
    this.socket.off("voice:offer");
    this.socket.off("voice:answer");
    this.socket.off("voice:ice-candidate");
    this.socket.off("voice:speaking");
    this.socket.off("room:player-disconnected");
    this.socket.off("room:player-reconnected");
    this.socket.off("room:ready-changed");
    this.socket.off("room:all-ready");
    this.socket.off("room:kicked");
    this.socket.off("game:enemy-damage");
    this.socket.off("disconnect");
    this.socket.off("connect");
  }
}