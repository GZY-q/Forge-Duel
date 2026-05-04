import { Enemy } from "../entities/Enemy.js";

const ENEMY_SYNC_INTERPOLATION_MS = 80;

export class EnemySync {
  constructor(scene, enemyPool) {
    this.scene = scene;
    this.enemyPool = enemyPool;
    this.syncedEnemies = new Map();
  }

  applyEnemyState(enemyStates) {
    if (!enemyStates || !Array.isArray(enemyStates)) return;

    const seenIds = new Set();

    for (const state of enemyStates) {
      seenIds.add(state.id);
      let enemy = this.syncedEnemies.get(state.id);

      if (!enemy) {
        if (!this.enemyPool) continue;
        enemy = this.enemyPool.acquire(state.type, {
          x: state.x,
          y: state.y,
          hp: state.hp,
          maxHp: state.maxHp,
          damage: state.damage,
          xpValue: state.xpValue
        });
        if (!enemy) continue;
        enemy.serverId = state.id;
        this.syncedEnemies.set(state.id, enemy);
      }

      if (enemy.active) {
        const lerpFactor = 0.2;
        enemy.x += (state.x - enemy.x) * lerpFactor;
        enemy.y += (state.y - enemy.y) * lerpFactor;

        enemy.hp = state.hp;
        enemy.maxHp = state.maxHp;
        enemy.facingDirection = state.facing || enemy.facingDirection;
        enemy.xpValue = state.xpValue ?? enemy.xpValue;

        if (state.isElite && !enemy.isElite) {
          enemy.setElite(state.eliteType);
        }

        // Sync data needed for proper drop generation on non-host.
        if (state.archetype !== undefined) {
          enemy.setData("archetype", state.archetype);
        }
        if (state.bossVariant !== undefined) {
          enemy.setData("bossVariant", state.bossVariant);
        }

        // Don't auto-release on HP <= 0 — the onEnemyKilled event is the
        // authoritative death trigger (generates drops and death animation).
        // The cleanup loop below releases enemies no longer in the sync batch.
      }
    }

    for (const [id, enemy] of this.syncedEnemies) {
      if (!seenIds.has(id)) {
        if (enemy.getData("isDying")) {
          // Enemy is dying — the death tween will release it. Don't double-release.
          this.syncedEnemies.delete(id);
        } else if (enemy.active) {
          this._releaseEnemy(id, enemy);
        } else {
          this.syncedEnemies.delete(id);
        }
      }
    }
  }

  _releaseEnemy(id, enemy) {
    this.syncedEnemies.delete(id);
    if (this.enemyPool) {
      this.enemyPool.release(enemy);
    } else if (enemy.active) {
      enemy.setActive(false);
      enemy.setVisible(false);
      enemy.body?.enable && (enemy.body.enable = false);
    }
  }

  getEnemyByServerId(serverId) {
    return this.syncedEnemies.get(serverId);
  }

  clear() {
    for (const [id, enemy] of this.syncedEnemies) {
      this._releaseEnemy(id, enemy);
    }
    this.syncedEnemies.clear();
  }

  destroy() {
    this.clear();
    this.scene = null;
    this.enemyPool = null;
  }
}
