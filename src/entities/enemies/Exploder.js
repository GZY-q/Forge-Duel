/**
 * Exploder enemy behavior — on death, deals AOE damage to nearby enemies.
 *
 * Injection point: DropManager.handleEnemyDefeat() or GameScene.handleEnemyDefeat()
 */
export function triggerExploderDeath(scene, enemy) {
  if (!enemy.isExploder || !enemy.active) return;

  const explosionRadius = enemy.explosionRadius || 60;
  const explosionDamage = enemy.damage || 30;

  // AOE damage to nearby enemies
  scene.enemies.getChildren().forEach((other) => {
    if (other === enemy) return;
    if (!other.active || other.getData("isDying") || other.isDead?.()) return;
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y);
    if (dist <= explosionRadius) {
      const falloff = 1 - (dist / explosionRadius) * 0.5;
      other.takeDamage(Math.round(explosionDamage * falloff));
    }
  });

  // Visual: explosion flash circle
  const gfx = scene.add.graphics().setDepth(15);
  gfx.fillStyle(enemy.baseTint || 0xff5522, 0.5);
  gfx.fillCircle(enemy.x, enemy.y, explosionRadius);
  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    scale: 1.5,
    duration: 350,
    onComplete: () => gfx.destroy()
  });
}
