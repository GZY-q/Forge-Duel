export class NetworkManager {
  constructor(socketClient) {
    this.socket = socketClient;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.players = [];

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
  }

  async createRoom(fighterType) {
    const result = await this.socket.emitWithAck("room:create", { fighterType });
    if (result.error) throw new Error(result.error);
    this.roomCode = result.roomCode;
    this.playerId = result.playerId;
    this.isHost = result.isHost;
    this.players = result.players || [];
    return result;
  }

  async joinRoom(roomCode, fighterType) {
    const result = await this.socket.emitWithAck("room:join", { roomCode, fighterType });
    if (result.error) throw new Error(result.error);
    this.roomCode = result.roomCode;
    this.playerId = result.playerId;
    this.isHost = result.isHost;
    this.players = result.players || [];
    return result;
  }

  leaveRoom() {
    this.socket.emit("room:leave");
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.players = [];
  }

  async setReady(ready) {
    return this.socket.emitWithAck("room:ready", { ready });
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
  }
}
