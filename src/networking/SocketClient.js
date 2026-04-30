export class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.token = null;
  }

  async connect(serverUrl, token) {
    this.token = token;

    const { io } = await import("socket.io-client");

    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        auth: { token: token || "" },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.socket.on("connect", () => {
        this.connected = true;
        resolve(this.socket);
      });

      this.socket.on("disconnect", () => {
        this.connected = false;
      });

      this.socket.on("connect_error", (err) => {
        console.warn("[Socket] Connection error:", err.message);
        if (!this.connected) {
          reject(err);
        }
      });
    });
  }

  on(event, handler) {
    this.socket?.on(event, handler);
  }

  off(event, handler) {
    this.socket?.off(event, handler);
  }

  emit(event, data, ack) {
    if (!this.socket?.connected) return;
    if (ack) {
      this.socket.emit(event, data, ack);
    } else {
      this.socket.emit(event, data);
    }
  }

  emitWithAck(event, data) {
    return new Promise((resolve) => {
      this.emit(event, data, (response) => {
        resolve(response);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
