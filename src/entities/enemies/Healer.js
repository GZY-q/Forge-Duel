/**
 * Healer enemy behavior — periodically heals nearby damaged enemies.
 *
 * Injection point: SpawnManager.updateEnemyAI()
 */
export function processHealerHeal(scene, enemy, nowMs) {
  if (!enemy.isHealer || !enemy.active) return;

  const nextHeal = enemy.nextHealAtMs || 0;
  if (nowMs < nextHeal) return;

  enemy.nextHealAtMs = nowMs + (enemy.healIntervalMs || 3000);

  const healAmount = enemy.healAmount || 8;
  const healRadius = enemy.healRadius || 80;
  let healedCount = 0;

  scene.enemies.getChildren().forEach((other) => {
    if (other === enemy) return;
    if (!other.active || other.getData("isDying") || other.isDead?.()) return;
    if (other.hp >= (other.maxHp || 1)) return;
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y);
    if (dist <= healRadius) {
      other.hp = Math.min(other.maxHp || other.hp, other.hp + healAmount);
      healedCount += 1;
    }
  });

  // Visual heal pulse
  if (healedCount > 0) {
    const gfx = scene.add.graphics().setDepth(12);
    gfx.fillStyle(enemy.baseTint || 0x66ff88, 0.25);
    gfx.fillCircle(enemy.x, enemy.y, healRadius);
    scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 500,
      onComplete: () => gfx.destroy()
    });
  }
}
