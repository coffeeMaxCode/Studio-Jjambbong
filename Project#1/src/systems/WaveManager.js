class WaveManager {
    constructor(canvasWidth, canvasHeight, game) {
        this.game = game;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.enemyPool = new Pool(() => new Enemy(), 1000); // 100마리 습격 대응을 위해 풀 크기 확장
        this.activeEnemies = [];

        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // 기본: 1초에 1마리
        this.timeElapsed = 0;

        // 다음 스폰까지 남은 킬 수 추적
        this.killsToNextSpawns = {
            Small: 0,
            Medium: 0
        };

        this.totalKills = {
            Small: 0,
            Medium: 0,
            Large: 0
        };

        this.mediumSpawnTimer = 0;
        this.largeSpawnTimer = 0;
        this.eventTimer = 0;
        this.eventInterval = 240; // 4분
        this.isPaused = false;
    }

    update(dt, player) {
        this.timeElapsed += dt;

        if (this.isPaused) {
            // 정지 상태일 때는 스폰 및 적 이동/업데이트를 건너뜀
            return;
        }

        this.spawnTimer += dt;

        // 소형 스폰 주기 가속: 20초마다 0.1초 감소, 최소 0.1초 (약 3분에 최고 난이도)
        const intervals20 = Math.floor(this.timeElapsed / 20);
        this.spawnInterval = Math.max(0.1, 1.0 - intervals20 * 0.1);

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.spawnSpecificEnemy(player.x, player.y, 'Small');
        }

        // 중형 스폰 로직 : 1분마다 3초에 1마리 추가
        const extraMediumsPer3Sec = Math.floor(this.timeElapsed / 60);
        if (extraMediumsPer3Sec > 0) {
            this.mediumSpawnTimer += dt;
            if (this.mediumSpawnTimer >= 3.0) {
                this.mediumSpawnTimer -= 3.0;
                for (let i = 0; i < extraMediumsPer3Sec; i++) {
                    this.spawnSpecificEnemy(player.x, player.y, 'Medium');
                }
            }
        }

        // 대형 스폰 로직 (1분마다 10초에 1마리씩 추가)
        const extraLargesPer10Sec = Math.floor(this.timeElapsed / 60);
        if (extraLargesPer10Sec > 0) {
            this.largeSpawnTimer += dt;
            if (this.largeSpawnTimer >= 10.0) {
                this.largeSpawnTimer -= 10.0;
                for (let i = 0; i < extraLargesPer10Sec; i++) {
                    this.spawnSpecificEnemy(player.x, player.y, 'Large');
                }
            }
        }

        // 군단 습격 이벤트 (4분마다)
        this.eventTimer += dt;
        if (this.eventTimer >= this.eventInterval) {
            this.eventTimer -= this.eventInterval;
            this._triggerSwarmEvent(player);
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

        // 소형 8킬 → 중형 1마리 스폰
        if (type === 'Small') {
            this.killsToNextSpawns.Small++;
            if (this.killsToNextSpawns.Small >= 8) {
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

        // 시간에 따른 HP 스케일링 (30초마다 5 증가, 기존 10에서 절반)
        enemy.maxHp += Math.floor(this.timeElapsed / 30) * 5;
        enemy.hp = enemy.maxHp;

        // 시간에 따른 공격력 스케일링 (30초마다 공격력 1 증가)
        enemy.damage += Math.floor(this.timeElapsed / 30);

        // 시간에 따른 방어력 스케일링 (5분 후부터 증가폭이 1분마다 1씩 더 늘어남)ㅁㅁ
        if (this.timeElapsed >= 300) {
            const n = Math.floor((this.timeElapsed - 300) / 60) + 1;
            enemy.defense = (n * (n + 1)) / 2; // 가속형 방어력 성장 (1, 3, 6, 10...)
        }

        this.activeEnemies.push(enemy);
    }

    _triggerSwarmEvent(player) {
        const count = 100;
        const side = Math.floor(Math.random() * 4); // 0:북, 1:남, 2:동, 3:서

        for (let i = 0; i < count; i++) {
            let x, y;
            const offset = (Math.random() - 0.5) * 200; // 약간의 흩뿌림

            if (side === 0) { // 북
                x = Math.random() * this.canvasWidth;
                y = -50 + offset;
            } else if (side === 1) { // 남
                x = Math.random() * this.canvasWidth;
                y = this.canvasHeight + 50 + offset;
            } else if (side === 2) { // 동
                x = this.canvasWidth + 50 + offset;
                y = Math.random() * this.canvasHeight;
            } else { // 서
                x = -50 + offset;
                y = Math.random() * this.canvasHeight;
            }

            this.spawnSpecificEnemy(player.x, player.y, 'Small', x, y);
        }
    }

    reset() {
        this.enemyPool.releaseAll();
        this.activeEnemies = [];
        this.timeElapsed = 0;
        this.spawnTimer = 0;
        this.mediumSpawnTimer = 0;
        this.largeSpawnTimer = 0;
        this.eventTimer = 0;
        this.spawnInterval = 1.0;
        this.killsToNextSpawns = { Small: 0, Medium: 0 };
        this.totalKills = { Small: 0, Medium: 0, Large: 0 };
    }
}
