class WaveManager {
    constructor(canvasWidth, canvasHeight, game) {
        this.game = game;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.enemyPool = new Pool(() => new Enemy(), 300);
        this.activeEnemies = [];

        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // 기본: 1초에 1마리
        this.timeElapsed = 0;

        // 다음 스폰까지 남은 킬 수 추적
        this.killsToNextSpawns = {
            Small: 0,
            Medium: 0
        };

        // 총 처치 수
        this.totalKills = {
            Small: 0,
            Medium: 0,
            Large: 0
        };
    }

    update(dt, player) {
        this.timeElapsed += dt;
        this.spawnTimer += dt;

        // 소형 스폰 주기 가속: 20초마다 0.1초 감소, 최소 0.1초 (약 3분에 최고 난이도)
        const intervals20 = Math.floor(this.timeElapsed / 20);
        this.spawnInterval = Math.max(0.1, 1.0 - intervals20 * 0.1);

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.spawnSpecificEnemy(player.x, player.y, 'Small');
        }

        // 활성 적 업데이트 및 사망 처리
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

        // 소형 10킬 → 중형 1마리 스폰
        if (type === 'Small') {
            this.killsToNextSpawns.Small++;
            if (this.killsToNextSpawns.Small >= 10) {
                this.killsToNextSpawns.Small = 0;
                this.spawnSpecificEnemy(playerX, playerY, 'Medium');
            }
        // 중형 10킬 → 대형 1마리 스폰
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

    spawnSpecificEnemy(playerX, playerY, type, forceX = null, forceY = null) {
        const enemy = this.enemyPool.get();
        let x = forceX;
        let y = forceY;

        if (x === null || y === null) {
            if (Math.random() > 0.5) {
                x = Math.random() * this.canvasWidth;
                y = Math.random() > 0.5 ? -30 : this.canvasHeight + 30;
            } else {
                x = Math.random() > 0.5 ? -30 : this.canvasWidth + 30;
                y = Math.random() * this.canvasHeight;
            }
        }

        enemy.spawn(x, y, type, this.game);

        // 시간에 따른 HP 스케일링
        enemy.maxHp += Math.floor(this.timeElapsed / 30) * 10;
        enemy.hp = enemy.maxHp;

        // 시간에 따른 공격력 스케일링 (30초마다 공격력 1 증가)
        enemy.damage += Math.floor(this.timeElapsed / 30);

        this.activeEnemies.push(enemy);
    }

    reset() {
        this.enemyPool.releaseAll();
        this.activeEnemies = [];
        this.timeElapsed = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.killsToNextSpawns = { Small: 0, Medium: 0 };
        this.totalKills = { Small: 0, Medium: 0, Large: 0 };
    }
}
