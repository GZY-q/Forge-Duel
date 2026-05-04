import { PlayerSync } from "../networking/PlayerSync.js";
import { EnemySync } from "../networking/EnemySync.js";

export class CoopSyncManager {
  constructor(scene) {
    this.scene = scene;
    this.playerSync = null;
    this.enemySync = null;
    this.syncAccumulator = 0;
  }

  /* ── Called once during GameScene create() ── */
  setup() {
    const s = this.scene;
    if (s.gameMode !== "coop" || !s.networkManager) return;

    this.playerSync = new PlayerSync(s);

    for (const p of s.coopPlayers) {
      if (p.playerId !== s.networkManager.playerId) {
        this.playerSync.addRemotePlayer(p.playerId, p.fighterType, p.username);
      }
    }

    if (!s.isHost) {
      this.enemySync = new EnemySync(s, s.enemyPool);
    }

    const nm = s.networkManager;

    nm.onRemotePlayerUpdate = (data) => {
      if (data.playerId === nm.playerId) return;
      this.playerSync?.updatePlayerState(data.playerId, data);
    };

    nm.onEnemyStateUpdate = (data) => {
      if (s.isHost) return;
      this.enemySync?.applyEnemyState(data);
    };

    nm.onEnemyDamage = (data) => {
      if (!s.isHost) return;
      const enemy = s.enemies.getChildren().find(
        (e) => e.active && e.serverId === data.enemyId && !e.getData("isDying")
      );
      if (enemy) {
        enemy.takeDamage(data.damage);
        if (s.spawnWeaponHitParticles) s.spawnWeaponHitParticles(enemy.x, enemy.y, 3);
        if (enemy.isDead()) s.handleEnemyDefeat(enemy);
      }
    };

    nm.onEnemyKilled = (data) => {
      if (s.isHost) return;
      const enemy = this.enemySync?.getEnemyByServerId(data.enemyId);
      if (enemy && enemy.active) s.handleEnemyDefeat(enemy);
    };

    nm.onXpDrop = (data) => {
      if (s.isHost) return;
      s.spawnXpOrb(data.x, data.y, data.value);
    };

    nm.onItemDrop = (data) => {
      if (s.isHost) return;
      if (s.itemPool && data.type) {
        const item = s.itemPool.acquire(data.x, data.y, data.type);
        if (item) s.activeItems.push(item);
      }
    };

    nm.onPlayerDied = (data) => {
      this.playerSync?.markPlayerDead(data.playerId);
      const player = s.coopPlayers.find((p) => p.playerId === data.playerId);
      s.showHudAlert(`${player?.username || "玩家"} 已阵亡`, 2000);
    };

    nm.onGameOver = () => s.triggerGameOver(true);

    nm.onHostMigrated = (data) => {
      if (data.newHostId === nm.playerId) {
        s.isHost = true;
        s.showHudAlert("你已成为房主", 2000);
      }
    };

    nm.onPlayerLeft = (data) => {
      this.playerSync?.removeRemotePlayer(data.playerId);
      s.showHudAlert("玩家已离开", 2000);
    };

    nm.onPlayerDisconnected = (data) => {
      const rp = this.playerSync?.remotePlayers?.get(data.playerId);
      if (rp) { rp.disconnected = true; s.showHudAlert("玩家断线，等待重连...", 2000); }
    };

    nm.onPlayerReconnected = (data) => {
      if (!this.playerSync?.remotePlayers) return;
      const rp = this.playerSync.remotePlayers.get(data.oldPlayerId);
      if (rp) {
        rp.disconnected = false;
        this.playerSync.remotePlayers.delete(data.oldPlayerId);
        this.playerSync.remotePlayers.set(data.playerId, rp);
        rp.playerId = data.playerId;
        s.showHudAlert("玩家已重连", 2000);
      }
    };

    nm.onConnectionRestored = (gameState) => {
      if (!gameState) return;
      s.isHost = gameState.hostId === nm.playerId;
      s.showHudAlert("已重新连接", 2000);
      if (gameState.playerStates) {
        for (const ps of gameState.playerStates) {
          if (ps.playerId === nm.playerId) {
            s.player.setPosition(ps.x, ps.y);
            s.player.hp = ps.hp;
            s.player.maxHp = ps.maxHp;
            s.player.facingDirection = ps.facing;
            s.level = ps.level || 1;
            if (ps.isDead) s.player.setHp(0);
          } else {
            if (!this.playerSync) continue;
            this.playerSync.addRemotePlayer(ps.playerId, ps.fighterType, ps.username);
            this.playerSync.updatePlayerState(ps.playerId, {
              x: ps.x, y: ps.y, facing: ps.facing, hp: ps.hp, maxHp: ps.maxHp, isDead: ps.isDead
            });
          }
        }
      }
    };
  }

  /* ── Called every frame from GameScene.update() ── */
  update(delta) {
    const s = this.scene;
    if (s.gameMode !== "coop" || !s.networkManager) return;

    this.syncAccumulator += delta;
    if (this.syncAccumulator >= 50) {
      this.syncAccumulator = 0;
      if (!s.player.isDead()) s.networkManager.sendPlayerState(s.player);

      if (s.isHost) {
        const activeEnemies = s.enemies.getChildren()
          .filter((e) => e.active)
          .map((e) => ({
            id: e.serverId || `${Math.round(e.x)}_${Math.round(e.y)}`,
            type: e.type, x: Math.round(e.x), y: Math.round(e.y),
            hp: e.hp, maxHp: e.maxHp, facing: e.facingDirection,
            isElite: e.isElite || false, eliteType: e.eliteType,
            damage: e.damage, xpValue: e.xpValue,
            archetype: e.getData("archetype"), bossVariant: e.getData("bossVariant")
          }));
        s.networkManager.sendEnemyState(activeEnemies);
      }
    }

    this.playerSync?.update(s.time.now);
  }
}
