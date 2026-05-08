/**
 * Splitter enemy behavior — on death, spawns child enemies.
 *
 * Injection point: DropManager.handleEnemyDefeat() or GameScene.handleEnemyDefeat()
 */
export function triggerSplitterSpawn(scene, enemy) {
  if (!enemy.isSplitter || !enemy.active) return;

  const count = enemy.splitCount || 3;
  const childHp = enemy.splitChildHp || 10;
  const childDamage = enemy.splitChildDamage || 5;
  const childXp = enemy.splitChildXp || 3;

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
    const dist = Phaser.Math.Between(18, 36);
    const sx = enemy.x + Math.cos(angle) * dist;
    const sy = enemy.y + Math.sin(angle) * dist;

    if (!scene.isValidSpawnPoint?.(sx, sy)) continue;

    const child = scene.enemyPool?.acquire("chaser", {
      x: sx,
      y: sy,
      hp: childHp
    });
    if (!child) continue;

    child.speed = 90;
    child.baseSpeed = 90;
    child.damage = childDamage;
    child.baseDamage = childDamage;
    child.xpValue = childXp;
    child.setScale(0.75);
    child.setTint(enemy.baseTint || 0x44cc66);
    child.setAlpha(0.85);
    child.setData("isSplitChild", true);
  }
}
