class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.lastTime = 0;
        this.gameState = 'MENU'; 
        this.currentWeaponType = null;
        this.gameTime = 0;

        // 핵심 엔진 시스템
        this.input = new InputManager();
        this.collisionSystem = new CollisionSystem();
        this.effectPool = new EffectPool();
        this.gemPool = new Pool(() => new Gem(), 300);
        this.itemPool = new Pool(() => new Item(), 10);
        
        this.upgradeSystem = null;
        this.waveManager = null;
        this.player = null;
        this.activeGems = [];
        this.activeItems = [];

        this.itemSpawnTimer = 0;

        // UI 요소 바인딩
        this.uiMainMenu = document.getElementById('main-menu');
        this.uiArea = document.getElementById('ui-area');
        this.uiHud = document.getElementById('hud');
        this.uiLevelUp = document.getElementById('levelup-screen');
        this.uiGameOver = document.getElementById('gameover-screen');
        this.timeDisplay = document.getElementById('time-display');

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-sniper').addEventListener('click', () => this.initGame('Sniper'));
        document.getElementById('btn-balance').addEventListener('click', () => this.initGame('Shotgun'));
        document.getElementById('btn-bruiser').addEventListener('click', () => this.initGame('Dagger'));
        document.getElementById('btn-start-aura').addEventListener('click', () => this.initGame('Radiation'));
        document.getElementById('btn-start-targeted').addEventListener('click', () => this.initGame('Grenade'));

        document.getElementById('btn-revive').addEventListener('click', () => this.revivePlayer());
        document.getElementById('btn-restart').addEventListener('click', () => this.returnToMenu());
    }

    initGame(weaponType) {
        this.currentWeaponType = weaponType;
        this.gameState = 'PLAYING';
        this.gameTime = 0;
        
        // UI 화면 전환
        this.uiMainMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');
        this.uiLevelUp.classList.add('hidden');
        
        // 20% 공간의 하단 UI 패널 표시
        this.uiArea.style.display = 'block';
        this.uiHud.classList.remove('hidden');

        // 시스템 초기화 및 재설정
        this.waveManager = new WaveManager(this.canvas.width, this.canvas.height, this);
        this.upgradeSystem = new UpgradeSystem(this);
        this.effectPool = new EffectPool();
        this.gemPool.releaseAll();
        this.itemPool.releaseAll();
        this.activeGems = [];
        this.activeItems = [];
        this.itemSpawnTimer = 0;

        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this);
        if (weaponType === 'Radiation' || weaponType === 'Grenade') {
            this.player.zoneWeapons.push(new ZoneWeapon(weaponType));
        } else {
            this.player.weapons.push(new Weapon(weaponType));
        }

        this.player.updateHpUI();
        this.player.updateExpUI();
        document.getElementById('level-display').innerText = `Lv: ${this.player.level}`;

        this.lastTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        // 게임 루프가 계속 돌게 하되, PLAYING 상태일 때만 업데이트 수행
        if (this.gameState === 'PLAYING') {
            // 초 단위 델타 타임 변환. 프레임이 튈 때 값이 너무 커지지 않도록 최대치 제한
            let dt = (timestamp - this.lastTime) / 1000; 
            if (dt > 0.1) dt = 0.1; 
            
            this.update(dt);
        }
        
        // 시간 갱신 및 화면 그리기는 상태에 관계없이 지속 (UI 등이 있다면 렌더링 유지 가능)
        // 단, 일시정지 상태에서는 화면이 그대로 멈춰 있어야 하므로, update만 건너뛰고 draw는 계속 호출하여 현재 상태를 유지합니다.
        this.lastTime = timestamp;
        this.draw();

        // 게임 오버 혹은 메뉴 상태가 아니면 루프 유지
        if (this.gameState !== 'MENU' && this.gameState !== 'GAMEOVER') {
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    update(dt) {
        this.gameTime += dt;
        const mins = Math.floor(this.gameTime / 60).toString().padStart(2, '0');
        const secs = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
        this.timeDisplay.innerText = `${mins}:${secs}`;

        if (this.player) this.player.update(dt, this.input, this.waveManager);
        if (this.waveManager) this.waveManager.update(dt, this.player);
        if (this.collisionSystem) this.collisionSystem.update(this.player, this.waveManager, this.effectPool);

        // 보석 업데이트
        for (let i = this.activeGems.length - 1; i >= 0; i--) {
            const gem = this.activeGems[i];
            gem.update(dt, this.player);
            if (!gem.active) {
                this.gemPool.release(gem);
                this.activeGems.splice(i, 1);
            }
        }

        // 아이템 타이머 180초 (3분) 주기 생성
        this.itemSpawnTimer += dt;
        if (this.itemSpawnTimer >= 180) {
            this.itemSpawnTimer -= 180;
            this.spawnRandomItem();
        }

        // 아이템 충돌 확인
        if (this.player) {
            for (let i = this.activeItems.length - 1; i >= 0; i--) {
                const item = this.activeItems[i];
                item.update(dt);
                
                const dx = item.x - this.player.x;
                const dy = item.y - this.player.y;
                const distSq = dx*dx + dy*dy;
                const rSum = item.radius + this.player.radius;

                if (distSq < rSum * rSum) { // 플레이어와 충돌 (획득)
                    this.applyItemEffect(item);
                    item.active = false;
                    this.itemPool.release(item);
                    this.activeItems.splice(i, 1);
                }
            }
        }
        
        if (this.effectPool) this.effectPool.update(dt);
    }

    draw() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        for(let x = 0; x < this.canvas.width; x += 100) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
        }
        for(let y = 0; y < this.canvas.height; y += 100) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
        }
        // 플레이어와 적보다 아래에 구슬, 아이템 렌더링
        for (const gem of this.activeGems) gem.draw(this.ctx);
        for (const item of this.activeItems) item.draw(this.ctx);

        if (this.waveManager) this.waveManager.draw(this.ctx);
        if (this.player) this.player.draw(this.ctx);
        if (this.effectPool) this.effectPool.draw(this.ctx);
    }

    spawnGem(x, y, amount = 1) {
        if (!this.gemPool) return;
        const gem = this.gemPool.get();
        gem.spawn(x, y, amount);
        this.activeGems.push(gem);
    }

    spawnRandomItem() {
        const types = ['heal_50', 'heal_100', 'magnet'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const pad = 50;
        const x = pad + Math.random() * (this.canvas.width - pad*2);
        const y = pad + Math.random() * (this.canvas.height - pad*2);

        const item = this.itemPool.get();
        item.spawn(x, y, type);
        this.activeItems.push(item);
    }

    applyItemEffect(item) {
        if (!this.player) return;

        if (item.type === 'heal_50') {
            this.player.heal(this.player.maxHp * 0.5);
        } else if (item.type === 'heal_100') {
            this.player.heal(this.player.maxHp);
        } else if (item.type === 'magnet') {
            // 자석 효과: 화면상의 모든 활성화된 보석을 즉시 플레이어에게 끌려오도록 강제
            for (const gem of this.activeGems) {
                gem.isBeingMagnetized = true;
            }
        }
    }

    triggerGameOver() {
        this.gameState = 'GAMEOVER';
        this.uiGameOver.classList.remove('hidden');
        document.getElementById('final-time').innerText = this.timeDisplay.innerText;
        
        if (this.player && !this.player.hasRevived) {
            document.getElementById('revive-prompt').classList.remove('hidden');
        } else {
            document.getElementById('revive-prompt').classList.add('hidden');
        }
    }

    triggerLevelUp() {
        this.gameState = 'LEVELUP';
        this.uiLevelUp.classList.remove('hidden');
        this.upgradeSystem.trigger(this.player);
    }

    resumeGameAfterLevelUp() {
        this.gameState = 'PLAYING';
        this.lastTime = performance.now();
        
        // 대량의 경험치를 한 번에 얻어 경험치 초과분이 많을 경우 대기 중인 여러 번의 레벨업을 순차적으로 처리
        if (this.player && this.player.exp >= this.player.expToNext) {
            this.player.levelUp();
        }
    }

    revivePlayer() {
        if (this.player && this.player.revive()) {
            this.gameState = 'PLAYING';
            this.uiGameOver.classList.add('hidden');
            this.lastTime = performance.now();
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    returnToMenu() {
        this.gameState = 'MENU';
        this.uiGameOver.classList.add('hidden');
        this.uiHud.classList.add('hidden');
        this.uiArea.style.display = 'none';
        this.uiMainMenu.classList.remove('hidden');
    }
}
