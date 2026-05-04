import crypto from "crypto";

const MAX_PLAYERS = 4;
const MAX_ROOMS = 50;
const ROOM_CODE_LENGTH = 4;
const ROOM_CLEANUP_INTERVAL_MS = 60_000;
const ROOM_IDLE_TIMEOUT_MS = 10 * 60_000;
const RECONNECT_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_ACTIONS = 10;

function generateRoomCode() {
  let code = "";
  const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += String(bytes[i] % 10);
  }
  return code;
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.pendingReconnects = new Map();
    this.rateLimits = new Map();

    this._cleanupInterval = setInterval(() => this._cleanupStaleRooms(), ROOM_CLEANUP_INTERVAL_MS);

    io.on("connection", (socket) => {
      this._setupSocketHandlers(socket);
    });
  }

  _checkRateLimit(socketId) {
    const now = Date.now();
    const entry = this.rateLimits.get(socketId);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(socketId, { windowStart: now, count: 1 });
      return true;
    }
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX_ACTIONS) {
      return false;
    }
    return true;
  }

  _setupSocketHandlers(socket) {
    socket.on("room:create", (data, ack) => {
      try {
        if (!this._checkRateLimit(socket.id)) {
          return ack?.({ error: "Rate limited, try again later" });
        }
        const { fighterType } = data || {};
        if (this.playerRooms.has(socket.id)) {
          return ack?.({ error: "Already in a room" });
        }
        if (this.rooms.size >= MAX_ROOMS) {
          return ack?.({ error: "Server is full, try again later" });
        }

        let code;
        do { code = generateRoomCode(); } while (this.rooms.has(code));

        const reconnectToken = generateToken();

        const room = {
          code,
          hostId: socket.id,
          players: new Map(),
          state: "lobby",
          createdAt: Date.now()
        };

        room.players.set(socket.id, {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username,
          fighterType: fighterType || "scout",
          ready: false,
          x: 0, y: 0, facing: "south", hp: 100, maxHp: 100,
          isDead: false, level: 1,
          reconnectToken
        });

        this.rooms.set(code, room);
        this.playerRooms.set(socket.id, code);
        socket.join(code);

        this.io.to(code).emit("room:ready-changed", {
          playerId: socket.id,
          ready: false
        });

        ack?.({
          roomCode: code,
          playerId: socket.id,
          isHost: true,
          players: this._serializePlayers(room),
          reconnectToken
        });
      } catch (err) {
        console.error("[Room] create error:", err);
        ack?.({ error: "Failed to create room" });
      }
    });

    socket.on("room:join", (data, ack) => {
      try {
        if (!this._checkRateLimit(socket.id)) {
          return ack?.({ error: "Rate limited, try again later" });
        }
        const { roomCode, fighterType } = data || {};
        if (this.playerRooms.has(socket.id)) {
          return ack?.({ error: "Already in a room" });
        }

        const code = String(roomCode || "").trim();
        const room = this.rooms.get(code);
        if (!room) {
          return ack?.({ error: "Room not found" });
        }
        if (room.state !== "lobby") {
          return ack?.({ error: "Game already in progress" });
        }
        if (room.players.size >= MAX_PLAYERS) {
          return ack?.({ error: "Room is full" });
        }

        const reconnectToken = generateToken();

        room.players.set(socket.id, {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username,
          fighterType: fighterType || "scout",
          ready: false,
          x: 0, y: 0, facing: "south", hp: 100, maxHp: 100,
          isDead: false, level: 1,
          reconnectToken
        });

        this.playerRooms.set(socket.id, code);
        socket.join(code);

        socket.to(code).emit("room:player-joined", {
          playerId: socket.id,
          username: socket.username,
          fighterType: fighterType || "scout"
        });

        ack?.({
          roomCode: code,
          playerId: socket.id,
          isHost: false,
          players: this._serializePlayers(room),
          reconnectToken
        });
      } catch (err) {
        console.error("[Room] join error:", err);
        ack?.({ error: "Failed to join room" });
      }
    });

    socket.on("room:leave", () => {
      this._leaveRoom(socket, true);
    });

    socket.on("room:kick", (data, ack) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return ack?.({ error: "Not in a room" });
      const room = this.rooms.get(code);
      if (!room) return ack?.({ error: "Room not found" });
      if (room.hostId !== socket.id) return ack?.({ error: "Only host can kick" });

      const { targetId } = data || {};
      if (!targetId || targetId === socket.id) return ack?.({ error: "Invalid target" });
      const targetPlayer = room.players.get(targetId);
      if (!targetPlayer) return ack?.({ error: "Player not found" });

      const targetSocket = this.io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit("room:kicked", { reason: "Kicked by host" });
      }

      this._forceRemovePlayer(targetId, code);
      ack?.({ ok: true });
    });

    socket.on("room:ready", (data, ack) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return ack?.({ error: "Not in a room" });
      const room = this.rooms.get(code);
      if (!room) return ack?.({ error: "Room not found" });

      const player = room.players.get(socket.id);
      if (!player) return ack?.({ error: "Player not in room" });

      player.ready = !!data?.ready;
      this.io.to(code).emit("room:ready-changed", {
        playerId: socket.id,
        ready: player.ready
      });

      const allReady = [...room.players.values()].every((p) => p.ready);
      if (allReady && room.players.size >= 2) {
        this.io.to(code).emit("room:all-ready");
      }

      ack?.({ ok: true });
    });

    socket.on("room:start", (ack) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return ack?.({ error: "Not in a room" });
      const room = this.rooms.get(code);
      if (!room) return ack?.({ error: "Room not found" });
      if (room.hostId !== socket.id) return ack?.({ error: "Only host can start" });

      const allReady = [...room.players.values()].every((p) => p.ready);
      if (!allReady) return ack?.({ error: "Not all players ready" });
      if (room.players.size < 2) return ack?.({ error: "Need at least 2 players" });

      room.state = "playing";
      const seed = Date.now();

      this.io.to(code).emit("game:started", {
        seed,
        hostId: room.hostId,
        players: this._serializePlayers(room)
      });

      ack?.({ ok: true });
    });

    socket.on("room:reconnect", (data, ack) => {
      try {
        const { reconnectToken } = data || {};
        if (!reconnectToken) {
          return ack?.({ error: "Missing reconnect token" });
        }

        let foundRoom = null;
        let foundOldSocketId = null;

        for (const [code, room] of this.rooms) {
          for (const [playerId, player] of room.players) {
            if (player.reconnectToken === reconnectToken) {
              foundRoom = room;
              foundOldSocketId = playerId;
              break;
            }
          }
          if (foundRoom) break;
        }

        const pending = this.pendingReconnects.get(reconnectToken);
        if (!foundRoom && !pending) {
          return ack?.({ error: "Invalid or expired reconnect token" });
        }

        if (pending && !foundRoom) {
          foundRoom = this.rooms.get(pending.roomCode);
          if (!foundRoom) {
            clearTimeout(pending.timeoutId);
            this.pendingReconnects.delete(reconnectToken);
            return ack?.({ error: "Room no longer exists" });
          }
          foundOldSocketId = pending.oldSocketId;
          clearTimeout(pending.timeoutId);
          this.pendingReconnects.delete(reconnectToken);
        }

        const oldPlayer = foundRoom.players.get(foundOldSocketId);

        if (!oldPlayer) {
          return ack?.({ error: "Player not found in room" });
        }

        if (foundOldSocketId === socket.id) {
          return ack?.({ error: "Already connected" });
        }

        foundRoom.players.delete(foundOldSocketId);

        oldPlayer.socketId = socket.id;

        foundRoom.players.set(socket.id, oldPlayer);

        if (foundRoom.hostId === foundOldSocketId) {
          foundRoom.hostId = socket.id;
        }

        this.playerRooms.delete(foundOldSocketId);
        this.playerRooms.set(socket.id, foundRoom.code);
        socket.join(foundRoom.code);

        this.io.to(foundRoom.code).emit("room:player-reconnected", {
          playerId: socket.id,
          oldPlayerId: foundOldSocketId,
          username: oldPlayer.username
        });

        const playersSnapshot = foundRoom.players.get(socket.id);
        ack?.({
          roomCode: foundRoom.code,
          playerId: socket.id,
          isHost: foundRoom.hostId === socket.id,
          players: this._serializePlayers(foundRoom),
          gameState: foundRoom.state === "playing" ? {
            state: foundRoom.state,
            hostId: foundRoom.hostId,
            playerStates: [...foundRoom.players.values()].map((p) => ({
              playerId: p.socketId,
              x: p.x, y: p.y, facing: p.facing,
              hp: p.hp, maxHp: p.maxHp, isDead: p.isDead,
              level: p.level, fighterType: p.fighterType, username: p.username
            }))
          } : null
        });
      } catch (err) {
        console.error("[Room] reconnect error:", err);
        ack?.({ error: "Failed to reconnect" });
      }
    });

    socket.on("game:player-update", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;

      const player = room.players.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.facing = data.facing;
        player.hp = data.hp;
        player.maxHp = data.maxHp;
        player.isDead = data.isDead;
        player.level = data.level;
      }

      socket.to(code).emit("game:remote-player-update", {
        playerId: socket.id,
        ...data
      });
    });

    socket.on("game:enemy-sync", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;
      if (room.hostId !== socket.id) return;

      socket.to(code).emit("game:enemy-state", data);
    });

    socket.on("game:enemy-killed", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room) return;
      if (room.state !== "playing") return;
      this.io.to(code).emit("game:enemy-killed", { killerId: socket.id, ...data });
    });

    socket.on("game:item-drop", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;
      this.io.to(code).emit("game:item-drop", data);
    });

    socket.on("game:xp-drop", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;
      socket.to(code).emit("game:xp-drop", data);
    });

    socket.on("game:enemy-damage", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;
      // Relay damage to the host — host is the authority on enemy HP.
      const hostSocket = this.io.sockets.sockets.get(room.hostId);
      if (hostSocket && hostSocket.id !== socket.id) {
        hostSocket.emit("game:enemy-damage", {
          senderId: socket.id,
          ...data
        });
      }
    });

    socket.on("game:player-died", () => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;

      const player = room.players.get(socket.id);
      if (player) player.isDead = true;

      this.io.to(code).emit("game:player-died", { playerId: socket.id });

      const allDead = [...room.players.values()].every((p) => p.isDead);
      if (allDead) {
        room.state = "finished";
        this.io.to(code).emit("game:over", {
          players: this._serializePlayers(room)
        });
      }
    });

    socket.on("game:game-over", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room) return;
      if (room.state !== "playing") return;
      if (room.hostId !== socket.id) return;

      room.state = "finished";
      this.io.to(code).emit("game:over", data);
    });

    socket.on("disconnect", () => {
      this._leaveRoom(socket, false);
      this.rateLimits.delete(socket.id);
    });
  }

  _leaveRoom(socket, explicit) {
    const code = this.playerRooms.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) {
      this.playerRooms.delete(socket.id);
      return;
    }

    const player = room.players.get(socket.id);
    if (!player || !player.reconnectToken) {
      this._forceRemovePlayer(socket.id, code);
      return;
    }

    if (!explicit) {
      this.pendingReconnects.set(player.reconnectToken, {
        roomCode: code,
        oldSocketId: socket.id,
        timeoutId: setTimeout(() => {
          this.pendingReconnects.delete(player.reconnectToken);
          this._forceRemovePlayer(socket.id, code);
        }, RECONNECT_TIMEOUT_MS)
      });

      this.io.to(code).emit("room:player-disconnected", {
        playerId: socket.id,
        reconnectTimeout: RECONNECT_TIMEOUT_MS
      });

      this.playerRooms.delete(socket.id);
      socket.leave(code);
      return;
    }

    this._forceRemovePlayer(socket.id, code);
  }

  _forceRemovePlayer(socketId, code) {
    const room = this.rooms.get(code);
    if (!room) return;

    room.players.delete(socketId);
    this.playerRooms.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return;
    }

    this.io.to(code).emit("room:player-left", { playerId: socketId });

    if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
      this.io.to(code).emit("game:host-migrated", { newHostId: room.hostId });
    }

    if (room.state === "playing") {
      const allDead = [...room.players.values()].every((p) => p.isDead);
      if (allDead) {
        room.state = "finished";
        this.io.to(code).emit("game:over", {
          players: this._serializePlayers(room)
        });
      }
    }
  }

  _serializePlayers(room) {
    return [...room.players.values()].map((p) => ({
      playerId: p.socketId,
      username: p.username,
      fighterType: p.fighterType,
      ready: p.ready,
      isHost: p.socketId === room.hostId
    }));
  }

  _cleanupStaleRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.state === "finished" || (room.state === "lobby" && now - room.createdAt > ROOM_IDLE_TIMEOUT_MS)) {
        for (const [, player] of room.players) {
          this.playerRooms.delete(player.socketId);
        }
        this.rooms.delete(code);
      }
    }

    for (const [token, pending] of this.pendingReconnects) {
      if (pending.roomCode && !this.rooms.has(pending.roomCode)) {
        clearTimeout(pending.timeoutId);
        this.pendingReconnects.delete(token);
      }
    }

    for (const [socketId, entry] of this.rateLimits) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        this.rateLimits.delete(socketId);
      }
    }
  }
}