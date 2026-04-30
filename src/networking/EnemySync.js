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
        enemy = this.enemyPool?.acquire(state.x, state.y, {
          type: state.type,
          hp: state.hp,
          damage: state.damage
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

        if (state.isElite && !enemy.isElite) {
          enemy.setElite(state.eliteType);
        }

        if (state.hp <= 0 && enemy.active) {
          this._releaseEnemy(state.id, enemy);
        }
      }
    }

    for (const [id, enemy] of this.syncedEnemies) {
      if (!seenIds.has(id) && enemy.active) {
        this._releaseEnemy(id, enemy);
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
}
