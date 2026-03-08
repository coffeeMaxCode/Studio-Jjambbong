class CollisionSystem {
    constructor() {}

    update(player, waveManager) {
        if (!player || player.isDead || !waveManager) return;

        // Player vs Enemies
        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;

            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distSq = dx * dx + dy * dy;
            
            const rSum = player.radius + enemy.radius;
            if (distSq < rSum * rSum) {
                // Collision!
                // Only take damage and apply knockback if player is not invincible
                if (player.invincibleTimer <= 0) {
                    player.takeDamage(enemy.damage);
                    // Knockback the enemy backwards (direction from player to enemy)
                    const dist = Math.sqrt(distSq);
                    if (dist > 0) {
                        const nx = -dx / dist;
                        const ny = -dy / dist;
                        // Apply strong knockback (simulate taking 0 damage but getting pushed)
                        enemy.takeDamage(0, nx, ny, 300); // 300 is the new strong knockback speed
                    }
                }
            }
        }
    }
}
