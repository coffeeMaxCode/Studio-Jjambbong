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
                if (player.invincibleTimer <= 0) {
                    player.takeDamage(enemy.damage);
                    // 넉백: 기존 300 * 2.5 = 750 (튕겨 나가는 거리 2.5배 증가)
                    const dist = Math.sqrt(distSq);
                    if (dist > 0) {
                        const nx = -dx / dist;
                        const ny = -dy / dist;
                        enemy.takeDamage(0, nx, ny, 750);
                    }
                }
            }
        }
    }
}
