/**
 * Freezer enemy behavior — projectiles slow the player on hit.
 *
 * Injection point: CombatManager.handlePlayerEnemyCollision() or WeaponSystem projectile hit handler.
 */
export function applyFreezeToPlayer(player, scene, freezeDurationMs) {
  if (!player || !player.active) return;

  player.slowAmount = 0.4;
  player.slowUntilMs = (scene.time?.now ?? 0) + freezeDurationMs;
  player.setTint(0x88ccff);

  scene.time?.delayedCall(freezeDurationMs, () => {
    if (player.active) {
      player.clearTint();
    }
  });
}
