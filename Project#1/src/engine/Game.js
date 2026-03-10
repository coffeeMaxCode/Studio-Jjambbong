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
        this.activeExplosions = []; // 재생 중인 폭발 애니메이션 목록

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

        document.getElementById('btn-pause-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-pause-restart').addEventListener('click', () => this.returnToMenu());

        document.getElementById('btn-revive').addEventListener('click', () => {
            if (this.gameState === 'GAMEOVER' && this.player && this.player.revive()) {
                this.gameState = 'PLAYING';
                this.uiGameOver.classList.add('hidden');
                this.lastTime = performance.now();
                requestAnimationFrame((ts) => this.gameLoop(ts));
            }
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            if (this.gameState === 'GAMEOVER') {
                this.returnToMenu();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
    }

    initGame(weaponType) {
        this.currentWeaponType = weaponType;
        this.gameState = 'PLAYING';
        this.gameTime = 0;

        // UI 화면 전환
        this.uiMainMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');
        this.uiLevelUp.classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');

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
        this.activeExplosions = []; // 게임 재시작 시 이전 폭발 완전 초기화
        this.itemSpawnTimer = 0;

        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this);
        if (weaponType === 'Radiation') {
            this.player.zoneWeapons.push(new ZoneWeapon(weaponType));
            this.player.upgradeLevels.radiation = 1;
        } else if (weaponType === 'Grenade') {
            this.player.zoneWeapons.push(new ZoneWeapon(weaponType));
            this.player.upgradeLevels.grenade = 1;
        } else {
            this.player.weapons.push(new Weapon(weaponType));
            if (weaponType === 'Sniper') this.player.upgradeLevels.sniper = 1;
            else if (weaponType === 'Shotgun') this.player.upgradeLevels.balance = 1;
            else if (weaponType === 'Dagger') this.player.upgradeLevels.bruiser = 1;
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

        // 아이템 타이머 60초 주기 생성
        this.itemSpawnTimer += dt;
        if (this.itemSpawnTimer >= 60) {
            this.itemSpawnTimer -= 60;
            this.spawnRandomItem();
        }

        // 시계(Stopwatch) 효과 처리
        if (this.stopwatchTimer > 0) {
            this.stopwatchTimer -= dt;
            if (this.waveManager) this.waveManager.isPaused = true;
            if (this.stopwatchTimer <= 0) {
                if (this.waveManager) this.waveManager.isPaused = false;
            }
        }

        // 아이템 충돌 확인
        if (this.player) {
            for (let i = this.activeItems.length - 1; i >= 0; i--) {
                const item = this.activeItems[i];
                item.update(dt);

                const dx = item.x - this.player.x;
                const dy = item.y - this.player.y;
                const distSq = dx * dx + dy * dy;
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

        // 폭발 애니메이션 업데이트 및 완료된 항목 제거 (메모리 누수 방지)
        // 역순 순회: splice로 중간 항목을 제거해도 아직 처리 안 된 인덱스에 영향 없음
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const exp = this.activeExplosions[i];
            exp.update(dt);
            if (exp.isFinished) {
                this.activeExplosions.splice(i, 1); // 배열에서 제거 → GC가 수거
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        for (let x = 0; x < this.canvas.width; x += 100) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 100) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
        }
        // 플레이어와 적보다 아래에 구슬, 아이템 렌더링
        for (const gem of this.activeGems) gem.draw(this.ctx);
        for (const item of this.activeItems) item.draw(this.ctx);

        if (this.waveManager) this.waveManager.draw(this.ctx);
        if (this.player) this.player.draw(this.ctx);
        // 폭발 이펙트: 스프라이트/적 위, 데미지 텍스트 아래 레이어
        for (const exp of this.activeExplosions) exp.draw(this.ctx);
        if (this.effectPool) this.effectPool.draw(this.ctx);
    }

    spawnGem(x, y, amount = 1) {
        if (!this.gemPool) return;
        const gem = this.gemPool.get();
        gem.spawn(x, y, amount);
        this.activeGems.push(gem);
    }

    /**
     * 지정 위치에 1회성 폭발 애니메이션을 생성한다.
     * @param {number} x    - 폭발 중심 X
     * @param {number} y    - 폭발 중심 Y
     * @param {number} size - 렌더링 크기(px). 수류탄 반지름 × 2 권장.
     */
    spawnExplosion(x, y, size = 160) {
        this.activeExplosions.push(new Explosion(x, y, size));
    }

    spawnRandomItem() {
        // 아이템 타입 가중치 설정 (기본 힐/자석 비중 높게, 특수 아이템 낮게)
        const pool = [
            'heal_50', 'heal_50', 'heal_100', 'magnet',
            'bomb', 'stopwatch',
            'buff_both', 'buff_aspd', 'buff_mspd'
        ];
        const type = pool[Math.floor(Math.random() * pool.length)];

        const pad = 50;
        const x = pad + Math.random() * (this.canvas.width - pad * 2);
        const y = pad + Math.random() * (this.canvas.height - pad * 2);

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
        } else if (item.type === 'bomb') {
            // 전체 제거 (폭탄): 모든 활성화된 적 처치
            if (this.waveManager) {
                const enemies = [...this.waveManager.activeEnemies];
                enemies.forEach(e => e.die());
            }
        } else if (item.type === 'stopwatch') {
            // 타임 스탑 (시계): 10초간 정지
            this.stopwatchTimer = 10;
        } else if (item.type === 'buff_both') {
            this.player.applyTempBuff('aspd', 10, 2.0); // 10초간 공속 2배
            this.player.applyTempBuff('mspd', 10, 1.5); // 10초간 이속 1.5배
        } else if (item.type === 'buff_aspd') {
            this.player.applyTempBuff('aspd', 10, 2.0);
        } else if (item.type === 'buff_mspd') {
            this.player.applyTempBuff('mspd', 10, 1.5);
        }
    }

    triggerGameOver() {
        this.gameState = 'GAMEOVER';
        this.uiGameOver.classList.remove('hidden');
        document.getElementById('final-time').innerText = this.timeDisplay.innerText;

        if (this.player && !this.player.hasRevived) {
            document.getElementById('revive-prompt').style.display = 'block';
            document.getElementById('btn-revive').style.display = 'inline-block';
        } else {
            document.getElementById('revive-prompt').style.display = 'none';
            document.getElementById('btn-revive').style.display = 'none';
        }
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
            document.getElementById('pause-screen').classList.remove('hidden');
            this.updatePauseScreen();
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            document.getElementById('pause-screen').classList.add('hidden');
            this.lastTime = performance.now();
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    updatePauseScreen() {
        const u = this.player.upgradeLevels;

        // Stats
        const getStatTooltip = (type) => {
            let html = `<strong>[상세 정보]</strong><br>`;
            if (type === 'hp') html += `최대 체력과 현재 체력을 증가시킵니다.<br><br>현재 최대치: <span style="color:#f1c40f">${this.player.maxHp}</span>`;
            else if (type === 'atk') html += `모든 무기의 기본 공격력을 증가시킵니다.<br><br>현재 보너스: <span style="color:#f1c40f">+${this.player.attackPower}</span>`;
            else if (type === 'def') html += `적에게 받는 피해를 감소시킵니다.<br><br>현재 방어력: <span style="color:#f1c40f">${this.player.defense}</span>`;
            else if (type === 'spd') html += `이동 속도를 증가시킵니다.<br><br>현재 이속: <span style="color:#f1c40f">${this.player.moveSpeed}</span>`;
            else if (type === 'aspd') html += `무기 공격 속도 및 재장전을 향상시킵니다.<br><br>현재 증가량: <span style="color:#f1c40f">+${(this.player.aspdUpgradeAmount * 100).toFixed(0)}%</span>`;
            else if (type === 'magnet') html += `경험치 및 아이템을 획득하는 자석 범위가 증가합니다.<br><br>현재 범위: <span style="color:#f1c40f">${this.player.magnetRadius}</span>`;
            else if (type === 'hpregen') html += `1초마다 체력을 주기적으로 회복합니다.<br><br>현재 재생량: <span style="color:#f1c40f">${(this.player.hpRegenRate * 60).toFixed(1)}/s</span>`;
            return html;
        };

        let statsHtml = '';
        const addStat = (label, count, type) => {
            statsHtml += `<div class="pause-item tooltip">[${count}] ${label} <span class="tooltiptext">${getStatTooltip(type)}</span></div>`;
        };
        addStat('Max HP +10', u.hp, 'hp');
        addStat('Attack Power +2.5', u.atk, 'atk');
        addStat('Defense +1', u.def, 'def');
        addStat('Move Speed +25', u.spd, 'spd');
        addStat(`Attack Speed +${this.player.aspdUpgradeAmount.toFixed(2)}x`, u.aspd, 'aspd');
        addStat('Magnet Radius +30', u.magnet, 'magnet');
        addStat('HP Regen +0.1/s', u.hpregen, 'hpregen');
        document.getElementById('pause-stats-list').innerHTML = statsHtml;

        // Weapons
        let weaponsHtml = '';
        const getTooltip = (type) => {
            const w = this.player.weapons.find(w => w.type === type) || this.player.zoneWeapons.find(z => z.type === type);
            const base = Config.WEAPON_STATS[type] || {};

            let dmg = type === 'Grenade' ? 20 : (base.baseDamage || 5);
            let cooldown = base.cooldown || 0;
            let radius = base.projRadius || 0;
            let pierce = base.pierce || 0;
            let speed = base.projSpeed || 0;
            let maxShots = 0;
            let reloadTime = 0;

            if (type === 'Grenade') { radius = 100; cooldown = 1.0; }
            if (type === 'Radiation') { radius = 150; cooldown = 1.0; }

            if (w) {
                dmg = w.baseDamage + (w.bonusPower || 0);
                if (type === 'Radiation' && w.tickInterval) cooldown = w.tickInterval;
                else if (w.cooldown) cooldown = w.cooldown / w.speedMultiplier;
                else if (w.deployInterval) cooldown = w.deployInterval / w.speedMultiplier;

                if (w.projRadius) radius = w.projRadius + (w.bonusRadius || 0);
                if (w.zoneRadius) radius = w.zoneRadius;
                maxShots = w.maxShots || 0;
                reloadTime = w.baseReloadTime || 0;
            }

            let html = `<strong>[상세 정보]</strong><br>`;

            html += `데미지: <span style="color:#f1c40f">${dmg + this.player.attackPower}</span><br>`;
            if (cooldown > 0) html += `공격 간격: <span style="color:#f1c40f">${cooldown.toFixed(2)}초</span><br>`;
            if (radius > 0) html += `효과 범위: <span style="color:#f1c40f">${radius}</span><br>`;
            if (pierce > 0) html += `관통력: <span style="color:#f1c40f">${pierce}</span><br>`;
            if (speed > 0) html += `투사체 속도: <span style="color:#f1c40f">${speed}</span><br>`;
            if (maxShots > 0) html += `장탄수: <span style="color:#f1c40f">${maxShots}발</span> (장전 <span style="color:#f1c40f">${reloadTime.toFixed(1)}초</span>)<br>`;
            if (type === 'Dagger') {
                let kb = 400 + (w ? (w.bonusKnockback || 0) : 0);
                html += `넉백 수치: <span style="color:#f1c40f">${kb}</span><br>`;
            }

            return html;
        };

        const addWpn = (name, uLevel, type) => {
            if (uLevel > 0) {
                const sp = document.createElement('span');
                sp.className = 'pause-item tooltip';
                sp.innerHTML = `[${uLevel}] ${name} <span class="tooltiptext">${getTooltip(type)}</span>`;
                weaponsContainer.appendChild(sp);
            }
        };
        const weaponsContainer = document.getElementById('pause-weapons-list');
        weaponsContainer.innerHTML = ''; // Clear existing content

        addWpn('대검 (Greatsword)', u.bruiser, 'Dagger');
        addWpn('저격 (Sniper)', u.sniper, 'Sniper');
        addWpn('샷건 (Shotgun)', u.balance, 'Shotgun');
        addWpn('수류탄 (Grenade)', u.grenade, 'Grenade');
        addWpn('방사능 (Radiation)', u.radiation, 'Radiation');
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
        document.getElementById('pause-screen').classList.add('hidden');
        this.uiHud.classList.add('hidden');
        this.uiArea.style.display = 'none';
        this.uiMainMenu.classList.remove('hidden');
    }
}
