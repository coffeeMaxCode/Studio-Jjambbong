class WaveManager {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.enemyPool = new Pool(() => new Enemy(), 300); // Pool of 300 enemies
        this.activeEnemies = [];

        this.spawnTimer = 0;
        this.spawnInterval = 2.0; // Strictly 2 seconds
        this.timeElapsed = 0;
        
        // Kill Tracking (Counts towards next spawn, then resets)
        this.killsToNextSpawns = {
            Small: 0,
            Medium: 0
        };
        
        // Total Kills (for stats if needed)
        this.totalKills = {
            Small: 0,
            Medium: 0,
            Large: 0
        };
    }

    update(dt, player) {
        this.timeElapsed += dt;
        this.spawnTimer += dt;

        // Strictly every 2.0 seconds
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.spawnSpecificEnemy(player.x, player.y, 'Small');
            
            // As time goes on, maybe spawn more small ones simultaneously to keep pacing up
            if (this.timeElapsed > 60) this.spawnSpecificEnemy(player.x, player.y, 'Small');
            if (this.timeElapsed > 120) this.spawnSpecificEnemy(player.x, player.y, 'Small');
            if (this.timeElapsed > 180) this.spawnSpecificEnemy(player.x, player.y, 'Small');
        }

        // Update active enemies and remove dead ones
        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
            const enemy = this.activeEnemies[i];
            enemy.update(dt, player.x, player.y);
            
            if (!enemy.active) {
                this.recordKill(enemy.type, player.x, player.y);
                this.enemyPool.release(enemy);
                this.activeEnemies.splice(i, 1);
            }
        }
    }

    recordKill(type, playerX, playerY) {
        if (!this.totalKills[type]) this.totalKills[type] = 0;
        this.totalKills[type]++;
        
        if (type === 'Small') {
            this.killsToNextSpawns.Small++;
            if (this.killsToNextSpawns.Small >= 10) {
                this.killsToNextSpawns.Small = 0;
                this.spawnSpecificEnemy(playerX, playerY, 'Medium');
            }
        } else if (type === 'Medium') {
            this.killsToNextSpawns.Medium++;
            if (this.killsToNextSpawns.Medium >= 10) {
                this.killsToNextSpawns.Medium = 0;
                this.spawnSpecificEnemy(playerX, playerY, 'Large');
            }
        }
    }

    draw(ctx) {
        for (const enemy of this.activeEnemies) {
            enemy.draw(ctx);
        }
    }

    // spawnEnemy is deprecated, directly use spawnSpecificEnemy for rule-based spawning

    spawnSpecificEnemy(playerX, playerY, type, forceX = null, forceY = null) {
        const enemy = this.enemyPool.get();
        let x = forceX;
        let y = forceY;
        
        if (x === null || y === null) {
            // Spawn around edges if not forced
            if (Math.random() > 0.5) {
                x = Math.random() * this.canvasWidth;
                y = Math.random() > 0.5 ? -30 : this.canvasHeight + 30;
            } else {
                x = Math.random() > 0.5 ? -30 : this.canvasWidth + 30;
                y = Math.random() * this.canvasHeight;
            }
        }

        enemy.spawn(x, y, type);

        // Scale max HP based on time
        enemy.maxHp += Math.floor(this.timeElapsed / 30) * 10;
        enemy.hp = enemy.maxHp;

        this.activeEnemies.push(enemy);
    }

    reset() {
        this.enemyPool.releaseAll();
        this.activeEnemies = [];
        this.timeElapsed = 0;
        this.spawnTimer = 0;
    }
}
