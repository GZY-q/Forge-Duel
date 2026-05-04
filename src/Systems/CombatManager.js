export class CombatManager {
  constructor(scene) {
    this.scene = scene;
  }

  performAutoAttack(now) {
    const s = this.scene;
    if (now - s.lastAttackAt < s.attackIntervalMs) return;

    let nearestEnemy = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    s.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      if (enemy.getData("isDying") || enemy.isDead?.()) return;

      const distance = Phaser.Math.Distance.Between(s.player.x, s.player.y, enemy.x, enemy.y);
      if (distance > s.attackRange || distance >= nearestDistance) return;

      nearestDistance = distance;
      nearestEnemy = enemy;
    });

    if (!nearestEnemy) return;

    s.lastAttackAt = now;

    // Visual flash
    const flash = s.add.graphics();
    flash.lineStyle(2, 0x89e8ff, 1);
    flash.lineBetween(s.player.x, s.player.y, nearestEnemy.x, nearestEnemy.y);
    s.tweens.add({
      targets: flash, alpha: 0, duration: 90, onComplete: () => flash.destroy()
    });

    // Damage host-authoritative in coop
    if (s.gameMode === "coop" && !s.isHost) {
      const enemyId = nearestEnemy.serverId;
      if (enemyId && nearestEnemy.active && !nearestEnemy.getData("isDying")) {
        s.networkManager?.sendEnemyDamage(enemyId, s.attackDamage, "autoAttack");
      }
      return;
    }

    if (typeof nearestEnemy.takeDamage !== "function" || typeof nearestEnemy.applyKnockbackFrom !== "function") return;
    nearestEnemy.takeDamage(s.attackDamage);
    nearestEnemy.applyKnockbackFrom(s.player.x, s.player.y, 140);

    if (nearestEnemy.isDead()) s.handleEnemyDefeat(nearestEnemy);
  }

  handlePlayerEnemyCollision(player, enemy) {
    const s = this.scene;
    if (!enemy || typeof enemy.takeDamage !== "function" || typeof enemy.applyKnockbackFrom !== "function") return;

    if (player.isDashing()) {
      const lastDashHitId = enemy.getData("lastDashHitId") ?? -1;
      if (lastDashHitId !== player.currentDashId) {
        enemy.setData("lastDashHitId", player.currentDashId);

        if (s.gameMode === "coop" && !s.isHost) {
          const enemyId = enemy.serverId;
          if (enemyId && enemy.active && !enemy.getData("isDying")) {
            s.networkManager?.sendEnemyDamage(enemyId, player.dashDamage, "dash");
          }
        } else {
          enemy.takeDamage(player.dashDamage);
          enemy.applyKnockbackFrom(player.x, player.y, 360);
          s.shakeScreen(80, 0.003);
          if (enemy.isDead()) s.handleEnemyDefeat(enemy);
        }
      }

      if (player.isDashInvulnerable()) return;
    }

    const damaged = player.takeDamage(enemy.damage, s.time.now);
    if (!damaged) return;
    s.triggerPlayerHurtFeedback(player);

    if (player.isDead()) s.triggerGameOver();
  }

  handleBossProjectileHit(player, projectile) {
    const s = this.scene;
    if (!projectile?.active || !player?.active) return;

    const damage = Math.max(1, Math.round(projectile.getData("damage") ?? 12));
    s.releaseBossProjectile(projectile);

    if (player.isDashInvulnerable()) return;

    const damaged = player.takeDamage(damage, s.time.now);
    if (!damaged) return;
    s.triggerPlayerHurtFeedback(player);

    if (player.isDead()) s.triggerGameOver();
  }
}
