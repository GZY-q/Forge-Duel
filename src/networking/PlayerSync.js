import { Player } from "../entities/Player.js";
import { FIGHTER_CONFIGS } from "../config/fighters.js";

const INTERPOLATION_DELAY_MS = 100;
const MAX_BUFFER_SIZE = 20;
const NAME_LABEL_DEPTH = 25;
const HP_BAR_DEPTH = 24;

export class RemotePlayer {
  constructor(scene, playerId, fighterType, username) {
    this.scene = scene;
    this.playerId = playerId;
    this.username = username;
    this.isDead = false;

    const config = FIGHTER_CONFIGS[fighterType] || FIGHTER_CONFIGS.scout;
    this.sprite = new Player(scene, 0, 0);
    this.sprite.setTint(config.tint || 0xffffff);
    this.sprite.setAlpha(0.9);
    this.sprite.body?.setAllowGravity(false);

    this.nameLabel = scene.add.text(0, 0, username || "Player", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(NAME_LABEL_DEPTH);

    this.hpBarBg = scene.add.rectangle(0, 0, 30, 4, 0x333333).setOrigin(0.5).setDepth(HP_BAR_DEPTH);
    this.hpBarFill = scene.add.rectangle(0, 0, 30, 4, 0x44ff44).setOrigin(0, 0.5).setDepth(HP_BAR_DEPTH);

    this.positionBuffer = [];
    this.lastX = 0;
    this.lastY = 0;
  }

  pushState(x, y, facing, hp, maxHp, isDead, timestamp) {
    this.positionBuffer.push({ x, y, facing, hp, maxHp, timestamp });
    if (this.positionBuffer.length > MAX_BUFFER_SIZE) {
      this.positionBuffer.shift();
    }
    this.isDead = isDead;
  }

  update(currentTime) {
    if (this.isDead) {
      this.sprite.setAlpha(0.3);
      this.hpBarFill.setVisible(false);
      return;
    }

    this.sprite.setAlpha(0.9);
    this.hpBarFill.setVisible(true);

    const renderTime = currentTime - INTERPOLATION_DELAY_MS;
    const buffer = this.positionBuffer;

    if (buffer.length === 0) return;

    if (buffer.length === 1) {
      this.lastX = buffer[0].x;
      this.lastY = buffer[0].y;
    } else {
      let i = buffer.length - 1;
      while (i > 0 && buffer[i - 1].timestamp > renderTime) {
        i--;
      }

      if (i === 0) {
        this.lastX = buffer[0].x;
        this.lastY = buffer[0].y;
      } else {
        const a = buffer[i - 1];
        const b = buffer[i];
        const t = (renderTime - a.timestamp) / (b.timestamp - a.timestamp || 1);
        this.lastX = a.x + (b.x - a.x) * t;
        this.lastY = a.y + (b.y - a.y) * t;
      }
    }

    this.sprite.setPosition(this.lastX, this.lastY);

    const latest = buffer[buffer.length - 1];
    if (latest.facing && this.sprite.updateFacingFromVelocity) {
      this.sprite.facingDirection = latest.facing;
    }

    this.nameLabel.setPosition(this.lastX, this.lastY - 22);

    const barX = this.lastX - 15;
    const barY = this.lastY + 18;
    this.hpBarBg.setPosition(this.lastX, barY);
    this.hpBarFill.setPosition(barX, barY);
    const hpRatio = latest.maxHp > 0 ? Math.max(0, Math.min(1, latest.hp / latest.maxHp)) : 1;
    this.hpBarFill.setSize(30 * hpRatio, 4);
  }

  destroy() {
    this.sprite?.destroy();
    this.nameLabel?.destroy();
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
  }
}

export class PlayerSync {
  constructor(scene) {
    this.scene = scene;
    this.remotePlayers = new Map();
  }

  addRemotePlayer(playerId, fighterType, username) {
    if (this.remotePlayers.has(playerId)) return;
    const rp = new RemotePlayer(this.scene, playerId, fighterType, username);
    this.remotePlayers.set(playerId, rp);
  }

  removeRemotePlayer(playerId) {
    const rp = this.remotePlayers.get(playerId);
    if (rp) {
      rp.destroy();
      this.remotePlayers.delete(playerId);
    }
  }

  updatePlayerState(playerId, data) {
    const rp = this.remotePlayers.get(playerId);
    if (!rp) return;
    rp.pushState(
      data.x, data.y, data.facing,
      data.hp, data.maxHp, data.isDead,
      this.scene.time.now
    );
  }

  update(currentTime) {
    for (const rp of this.remotePlayers.values()) {
      rp.update(currentTime);
    }
  }

  markPlayerDead(playerId) {
    const rp = this.remotePlayers.get(playerId);
    if (rp) rp.isDead = true;
  }

  getAllRemotePlayers() {
    return [...this.remotePlayers.values()];
  }

  isAllDead() {
    for (const rp of this.remotePlayers.values()) {
      if (!rp.isDead) return false;
    }
    return true;
  }

  destroy() {
    for (const rp of this.remotePlayers.values()) {
      rp.destroy();
    }
    this.remotePlayers.clear();
  }
}
