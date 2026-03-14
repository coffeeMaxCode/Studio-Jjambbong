class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.lastTime = 0;
        this.gameState = 'MENU';
        this.currentWeaponType = null;
        this.selectedClass = null;
        this.gameTime = 0;
        this.autoAimEnabled = true;
        this.mouseX = 640;
        this.mouseY = 360;

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
        this.activeExplosions  = [];
        this.activeSwordAuras  = [];

        this.itemSpawnTimer = 0;
        this.stopwatchTimer = 0;

        // UI 요소 바인딩
        this.uiMainMenu = document.getElementById('main-menu');
        this.uiArea = document.getElementById('ui-area');
        this.uiHud = document.getElementById('hud');
        this.uiLevelUp = document.getElementById('levelup-screen');
        this.uiGameOver = document.getElementById('gameover-screen');
        this.timeDisplay = document.getElementById('time-display');

        this._buildClassButtons();
        this.bindEvents();
    }

    // ── 직업 선택 버튼을 Config.CLASSES에서 동적 생성 ──────────────────
    _buildClassButtons() {
        const container = document.getElementById('class-choices-container');
        if (!container) return;
        container.innerHTML = '';

        for (const [classKey, classDef] of Object.entries(Config.CLASSES)) {
            const btn = document.createElement('button');
            btn.className = 'class-btn';
            btn.style.borderColor = classDef.color;
            btn.innerHTML = `${classDef.label}<span class="class-btn-desc">${classDef.description}</span>`;
            btn.addEventListener('click', () => this.selectClass(classKey));
            container.appendChild(btn);
        }
    }

    bindEvents() {
        document.getElementById('btn-back-to-class').addEventListener('click', () => this.showClassSelect());

        // 마우스 위치 추적 (마법사 빔 방향 제어)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

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

        // auto-aim 인디케이터 클릭으로 토글
        document.getElementById('autoaim-indicator').addEventListener('click', () => {
            if (this.gameState === 'PLAYING') this.toggleAutoAim();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePause();
            }
            // Q 키: auto-aim 토글 (인게임 중에만)
            if (e.code === 'KeyQ' && this.gameState === 'PLAYING') {
                this.toggleAutoAim();
            }
        });
    }

    // ── 직업 선택 (1단계) ───────────────────────────────────────────────
    selectClass(classKey) {
        const classDef = Config.CLASSES[classKey];
        if (!classDef) return;
        this.selectedClass = classKey;

        // 단일 무기면 바로 게임 시작
        if (classDef.startWeapon) {
            this.initGame(classDef.startWeapon);
            return;
        }

        // 무기 선택 단계로 이동
        const title = document.getElementById('weapon-select-title');
        title.textContent = `${classDef.label} — 무기를 선택하세요`;
        title.style.color = classDef.color;

        const container = document.getElementById('weapon-choices-dynamic');
        container.innerHTML = '';
        for (const wpnKey of classDef.availableWeapons) {
            const meta = Config.WEAPON_META[wpnKey];
            const btn = document.createElement('button');
            btn.textContent = meta ? meta.label : wpnKey;
            btn.style.borderColor = classDef.color;
            btn.addEventListener('click', () => this.initGame(wpnKey));
            container.appendChild(btn);
        }

        document.getElementById('class-select-step').classList.add('hidden');
        document.getElementById('weapon-select-step').classList.remove('hidden');
    }

    showClassSelect() {
        document.getElementById('class-select-step').classList.remove('hidden');
        document.getElementById('weapon-select-step').classList.add('hidden');
    }

    // ── Auto-aim 토글 ────────────────────────────────────────────────────
    toggleAutoAim() {
        this.autoAimEnabled = !this.autoAimEnabled;
        this._updateAutoAimUI();
    }

    _updateAutoAimUI() {
        const statusEl = document.getElementById('autoaim-status');
        if (!statusEl) return;
        statusEl.textContent = this.autoAimEnabled ? 'ON' : 'OFF';
        statusEl.className = this.autoAimEnabled ? 'on' : 'off';
    }

    // ── 게임 초기화 ──────────────────────────────────────────────────────
    initGame(weaponType) {
        this.currentWeaponType = weaponType;
        this.gameState = 'PLAYING';
        this.gameTime = 0;
        this.autoAimEnabled = true;

        // UI 화면 전환
        this.uiMainMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');
        this.uiLevelUp.classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');

        // auto-aim 인디케이터 표시
        const aaIndicator = document.getElementById('autoaim-indicator');
        aaIndicator.classList.remove('hidden');
        this._updateAutoAimUI();

        // 하단 UI 패널 표시
        this.uiArea.style.display = 'block';
        this.uiHud.classList.remove('hidden');

        // 시스템 초기화
        this.waveManager = new WaveManager(this.canvas.width, this.canvas.height, this);
        this.upgradeSystem = new UpgradeSystem(this);
        this.effectPool = new EffectPool();
        this.gemPool.releaseAll();
        this.itemPool.releaseAll();
        this.activeGems = [];
        this.activeItems = [];
        this.activeExplosions = [];
        this.activeSwordAuras = [];
        this.itemSpawnTimer = 0;

        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this);

        // 무기 초기화 (기존 + 신규 마법사 무기)
        if (weaponType === 'Radiation') {
            this.player.zoneWeapons.push(new ZoneWeapon(weaponType));
            this.player.upgradeLevels.radiation = 1;
        } else if (weaponType === 'Grenade') {
            this.player.zoneWeapons.push(new ZoneWeapon(weaponType));
            this.player.upgradeLevels.grenade = 1;
        } else if (weaponType === 'Greatsword') {
            this.player.weapons.push(new GreatswordWeapon());
            this.player.upgradeLevels.bruiser = 1;
        } else if (weaponType === 'EnergyBolt') {
            this.player.weapons.push(new EnergyBoltWeapon());
            this.player.upgradeLevels.energybolt = 1;
        } else if (weaponType === 'Fireball') {
            this.player.weapons.push(new FireballWeapon());
            this.player.upgradeLevels.fireball = 1;
        } else {
            // Sniper, Shotgun, Dagger 등 기본 투사체 무기
            this.player.weapons.push(new Weapon(weaponType));
            if (weaponType === 'Sniper') this.player.upgradeLevels.sniper = 1;
            else if (weaponType === 'Shotgun') this.player.upgradeLevels.balance = 1;
        }

        this.player.updateHpUI();
        this.player.updateExpUI();
        document.getElementById('level-display').innerText = `Lv: ${this.player.level}`;

        this.lastTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        if (this.gameState === 'PLAYING') {
            let dt = (timestamp - this.lastTime) / 1000;
            if (dt > 0.1) dt = 0.1;
            this.update(dt);
        }

        this.lastTime = timestamp;
        this.draw();

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

        for (let i = this.activeGems.length - 1; i >= 0; i--) {
            const gem = this.activeGems[i];
            gem.update(dt, this.player);
            if (!gem.active) {
                this.gemPool.release(gem);
                this.activeGems.splice(i, 1);
            }
        }

        this.itemSpawnTimer += dt;
        if (this.itemSpawnTimer >= 60) {
            this.itemSpawnTimer -= 60;
            this.spawnRandomItem();
        }

        if (this.stopwatchTimer > 0) {
            this.stopwatchTimer -= dt;
            if (this.waveManager) this.waveManager.isPaused = true;
            if (this.stopwatchTimer <= 0) {
                if (this.waveManager) this.waveManager.isPaused = false;
            }
        }

        if (this.player) {
            for (let i = this.activeItems.length - 1; i >= 0; i--) {
                const item = this.activeItems[i];
                item.update(dt);

                const dx = item.x - this.player.x;
                const dy = item.y - this.player.y;
                const distSq = dx * dx + dy * dy;
                const rSum = item.radius + this.player.radius;

                if (distSq < rSum * rSum) {
                    this.applyItemEffect(item);
                    item.active = false;
                    this.itemPool.release(item);
                    this.activeItems.splice(i, 1);
                }
            }
        }

        if (this.effectPool) this.effectPool.update(dt);

        for (let i = this.activeSwordAuras.length - 1; i >= 0; i--) {
            const aura = this.activeSwordAuras[i];
            aura.update(dt, this.waveManager);
            if (!aura.active) {
                this.activeSwordAuras.splice(i, 1);
            }
        }

        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const exp = this.activeExplosions[i];
            exp.update(dt);
            if (exp.isFinished) {
                this.activeExplosions.splice(i, 1);
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
        for (const gem of this.activeGems) gem.draw(this.ctx);
        for (const item of this.activeItems) item.draw(this.ctx);

        if (this.waveManager) this.waveManager.draw(this.ctx);
        if (this.player) this.player.draw(this.ctx);
        for (const aura of this.activeSwordAuras) aura.draw(this.ctx);
        for (const exp of this.activeExplosions) exp.draw(this.ctx);
        if (this.effectPool) this.effectPool.draw(this.ctx);
    }

    spawnSwordAura(x, y, dirX, dirY, damage, cfg = {}) {
        const aura = new SwordAura();
        aura.canvasWidth  = this.canvas.width;
        aura.canvasHeight = this.canvas.height;
        aura.spawn(x, y, dirX, dirY, 560, 0.55, damage, cfg);
        this.activeSwordAuras.push(aura);
    }

    spawnGem(x, y, amount = 1) {
        if (!this.gemPool) return;
        const gem = this.gemPool.get();
        gem.spawn(x, y, amount);
        this.activeGems.push(gem);
    }

    spawnExplosion(x, y, size = 160) {
        this.activeExplosions.push(new Explosion(x, y, size));
    }

    spawnRandomItem() {
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
            for (const gem of this.activeGems) {
                gem.isBeingMagnetized = true;
            }
        } else if (item.type === 'bomb') {
            if (this.waveManager) {
                const enemies = [...this.waveManager.activeEnemies];
                enemies.forEach(e => e.die());
            }
        } else if (item.type === 'stopwatch') {
            this.stopwatchTimer = 10;
        } else if (item.type === 'buff_both') {
            this.player.applyTempBuff('aspd', 10, 2.0);
            this.player.applyTempBuff('mspd', 10, 1.5);
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

        // 직업에 맞는 무기만 표시
        const weaponsContainer = document.getElementById('pause-weapons-list');
        weaponsContainer.innerHTML = '';

        const classDef = this.selectedClass ? Config.CLASSES[this.selectedClass] : null;
        const wpnList = classDef ? classDef.availableWeapons : Object.keys(Config.WEAPON_META);

        const getWpnTooltip = (type) => {
            const w = this.player.weapons.find(w => w.type === type) || this.player.zoneWeapons.find(z => z.type === type);
            const base = Config.WEAPON_STATS[type] || {};
            let dmg = base.baseDamage || 5;
            let cooldown = base.cooldown || 0;
            let radius = base.projRadius || 0;
            if (type === 'Grenade') { dmg = 20; radius = 70; cooldown = 3.0; }
            if (type === 'Radiation') { radius = 150; cooldown = 1.0; }
            if (w) {
                dmg = w.baseDamage + (w.bonusPower || 0);
                if (w.cooldown) cooldown = w.cooldown / (w.speedMultiplier || 1);
                else if (w.deployInterval) cooldown = w.deployInterval / (w.speedMultiplier || 1);
                if (w.projRadius) radius = w.projRadius + (w.bonusRadius || 0);
                if (w.zoneRadius) radius = w.zoneRadius;
            }
            let html = `<strong>[상세 정보]</strong><br>`;
            html += `데미지: <span style="color:#f1c40f">${dmg + this.player.attackPower}</span><br>`;
            if (cooldown > 0) html += `공격 간격: <span style="color:#f1c40f">${cooldown.toFixed(2)}초</span><br>`;
            if (radius > 0) html += `효과 범위: <span style="color:#f1c40f">${radius}</span><br>`;
            if (type === 'Fireball' && w) {
                const er = (w.explosionRadius || 80) + (w.bonusExplosionRadius || 0);
                html += `폭발 범위: <span style="color:#f1c40f">${er}</span><br>`;
            }
            return html;
        };

        for (const wpnKey of wpnList) {
            const meta = Config.WEAPON_META[wpnKey];
            if (!meta) continue;
            const uLevel = u[meta.upgradeKey] || 0;
            if (uLevel > 0) {
                const sp = document.createElement('span');
                sp.className = 'pause-item tooltip';
                sp.innerHTML = `[${uLevel}] ${meta.label} <span class="tooltiptext">${getWpnTooltip(wpnKey)}</span>`;
                weaponsContainer.appendChild(sp);
            }
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
        this.selectedClass = null;
        this.uiGameOver.classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('autoaim-indicator').classList.add('hidden');
        this.uiHud.classList.add('hidden');
        this.uiArea.style.display = 'none';
        this.uiMainMenu.classList.remove('hidden');
        this.showClassSelect();
    }
}
