class UpgradeSystem {
    constructor(game) {
        this.game = game;
        this.playerRef = null;

        // 스탯 버튼만 고정 바인딩 (무기 버튼은 trigger() 시 동적 생성)
        const statBindings = {
            'btn-stat-hp':      'hp',
            'btn-stat-atk':     'atk',
            'btn-stat-def':     'def',
            'btn-stat-spd':     'spd',
            'btn-stat-aspd':    'aspd',
            'btn-stat-magnet':  'magnet',
            'btn-stat-hpregen': 'hpregen',
        };
        for (const [id, key] of Object.entries(statBindings)) {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.selectUpgrade(key));
        }
    }

    trigger(player) {
        this.playerRef = player;

        const updateBtn = (id, label, count, tooltipHtml = '') => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (tooltipHtml) {
                btn.innerHTML = `[${count}] ${label} <span class="tooltiptext">${tooltipHtml}</span>`;
                btn.classList.add('tooltip');
            } else {
                btn.innerHTML = `[${count}] ${label}`;
                btn.classList.remove('tooltip');
            }
            btn.style.borderColor = count > 0 ? '#f1c40f' : '#7f8c8d';
        };

        const getStatTooltip = (type) => {
            let html = `<strong>[상세 정보]</strong><br>`;
            if (type === 'hp') html += `최대 체력과 현재 체력을 10 증가시킵니다.<br><br>현재 최대치: <span style="color:#f1c40f">${player.maxHp}</span> <span style="color:#2ecc71">-> ${player.maxHp + 10}</span>`;
            else if (type === 'atk') html += `모든 무기의 기본 공격력을 2.5 증가시킵니다.<br><br>현재 보너스: <span style="color:#f1c40f">+${player.attackPower}</span> <span style="color:#2ecc71">-> +${player.attackPower + 2.5}</span>`;
            else if (type === 'def') html += `적에게 받는 피해를 1 감소시킵니다.<br><br>현재 방어력: <span style="color:#f1c40f">${player.defense}</span> <span style="color:#2ecc71">-> ${player.defense + 1}</span>`;
            else if (type === 'spd') html += `이동 속도를 25 증가시킵니다.<br><br>현재 이속: <span style="color:#f1c40f">${player.moveSpeed}</span> <span style="color:#2ecc71">-> ${player.moveSpeed + 25}</span>`;
            else if (type === 'aspd') html += `무기 공격 속도 및 재장전이 5% 빨라집니다.<br><br>현재 증가량: <span style="color:#f1c40f">+${(player.aspdUpgradeAmount * 100).toFixed(0)}%</span> <span style="color:#2ecc71">-> +${((player.aspdUpgradeAmount + 0.05) * 100).toFixed(0)}%</span>`;
            else if (type === 'magnet') html += `경험치 및 아이템을 획득하는 자석 범위가 30 증가합니다.<br><br>현재 범위: <span style="color:#f1c40f">${player.magnetRadius}</span> <span style="color:#2ecc71">-> ${player.magnetRadius + 30}</span>`;
            else if (type === 'hpregen') html += `1초마다 체력을 0.1씩 자연 회복합니다.<br><br>현재 재생량: <span style="color:#f1c40f">${(player.hpRegenRate * 60).toFixed(1)}/s</span> <span style="color:#2ecc71">-> ${((player.hpRegenRate * 60) + 0.1).toFixed(1)}/s</span>`;
            return html;
        };

        const u = player.upgradeLevels;
        updateBtn('btn-stat-hp',      'Max HP +10',           u.hp,      getStatTooltip('hp'));
        updateBtn('btn-stat-atk',     'Attack Power +2.5',    u.atk,     getStatTooltip('atk'));
        updateBtn('btn-stat-def',     'Defense +1',           u.def,     getStatTooltip('def'));
        updateBtn('btn-stat-spd',     'Move Speed +25',       u.spd,     getStatTooltip('spd'));
        updateBtn('btn-stat-aspd',    'Attack Speed +5%',     u.aspd,    getStatTooltip('aspd'));
        updateBtn('btn-stat-magnet',  'Magnet Radius +30',    u.magnet,  getStatTooltip('magnet'));
        updateBtn('btn-stat-hpregen', 'HP Regen +0.1/s',      u.hpregen, getStatTooltip('hpregen'));

        // 직업에 맞는 무기 버튼 동적 생성
        const container = document.getElementById('weapon-upgrade-buttons');
        container.innerHTML = '';

        const classKey = this.game.selectedClass;
        const classDef = classKey ? Config.CLASSES[classKey] : null;
        if (!classDef) return;

        for (const wpnKey of classDef.availableWeapons) {
            const meta = Config.WEAPON_META[wpnKey];
            if (!meta) continue;
            const uLevel = u[meta.upgradeKey] || 0;

            const btn = document.createElement('button');
            btn.className = 'tooltip';
            btn.style.width = '100%';
            btn.style.maxWidth = '400px';
            btn.style.margin = '8px 0';
            btn.style.padding = '12px 20px';
            btn.style.fontSize = '18px';
            btn.style.borderColor = uLevel > 0 ? '#f1c40f' : '#7f8c8d';

            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'tooltiptext';
            tooltipSpan.innerHTML = this._getWeaponTooltip(wpnKey, player);

            btn.innerHTML = `[${uLevel}] ${meta.label} `;
            btn.appendChild(tooltipSpan);

            btn.addEventListener('click', () => this.selectUpgrade(meta.upgradeKey));
            container.appendChild(btn);
        }
    }

    _getWeaponTooltip(type, player) {
        const w = player.weapons.find(w => w.type === type) || player.zoneWeapons.find(z => z.type === type);
        const base = Config.WEAPON_STATS[type] || {};

        let dmg = base.baseDamage || 5;
        let cooldown = base.cooldown || 0;
        let radius = base.projRadius || 0;
        let pierce = base.pierce || 0;
        let speed = base.projSpeed || 0;
        let maxShots = 0;
        let reloadTime = 0;

        if (type === 'Grenade')   { dmg = 20; radius = 70; cooldown = 3.0; }
        if (type === 'Radiation') { radius = 150; cooldown = 1.0; }
        if (type === 'Greatsword') { radius = base.attackRadius || 180; }

        if (w) {
            dmg = w.baseDamage + (w.bonusPower || 0);
            if (type === 'Radiation' && w.tickInterval) cooldown = w.tickInterval;
            else if (w.cooldown) cooldown = w.cooldown / (w.speedMultiplier || 1);
            else if (w.deployInterval) cooldown = w.deployInterval / (w.speedMultiplier || 1);
            if (w.attackRadius) radius = w.attackRadius;
            else if (w.projRadius) radius = w.projRadius + (w.bonusRadius || 0);
            if (w.zoneRadius) radius = w.zoneRadius;
            maxShots = w.maxShots || 0;
            reloadTime = w.baseReloadTime || 0;
        }

        // 레벨업 시 예상 수치
        let dmgNext = '', cooldownNext = '', radiusNext = '', maxShotsNext = '', reloadNext = '';
        if (w) {
            if (type === 'Greatsword') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 8}</span>`;
                radiusNext = ` <span style="color:#2ecc71">-> ${radius + 20}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 2.5) * 0.91).toFixed(2)}초</span>`;
            } else if (type === 'Sniper') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 5}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 1.33) * 0.9).toFixed(2)}초</span>`;
            } else if (type === 'Shotgun') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 1.5}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 0.83) * 0.9).toFixed(2)}초</span>`;
                if (maxShots > 0) maxShotsNext = ` <span style="color:#2ecc71">-> ${maxShots + 1}발</span>`;
            } else if (type === 'Grenade') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 10}</span>`;
                radiusNext = ` <span style="color:#2ecc71">-> ${radius + 20}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 3.0) * 0.9).toFixed(2)}초</span>`;
            } else if (type === 'Radiation') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 2.5}</span>`;
                radiusNext = ` <span style="color:#2ecc71">-> ${radius + 25}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 1.0) * 0.9).toFixed(2)}초</span>`;
            } else if (type === 'EnergyBolt') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 4}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 0.8) * 0.93).toFixed(2)}초</span>`;
            } else if (type === 'Fireball') {
                dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 5}</span>`;
                const curExpR = (w.explosionRadius || 80) + (w.bonusExplosionRadius || 0);
                radiusNext = ` <span style="color:#2ecc71">-> ${curExpR + 10}</span>`;
                cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 1.5) * 0.91).toFixed(2)}초</span>`;
            }
            if (type !== 'Grenade' && type !== 'Radiation' && reloadTime > 0.5) {
                reloadNext = ` <span style="color:#2ecc71">-> ${(reloadTime - 0.5).toFixed(1)}초</span>`;
            }
        }

        let html = `<strong>[상세 정보]</strong><br>`;
        html += `데미지: <span style="color:#f1c40f">${dmg + player.attackPower}</span>${dmgNext}<br>`;
        if (cooldown > 0) html += `공격 간격: <span style="color:#f1c40f">${cooldown.toFixed(2)}초</span>${cooldownNext}<br>`;
        if (radius > 0) html += `효과 범위: <span style="color:#f1c40f">${radius}</span>${radiusNext}<br>`;
        if (pierce > 0) html += `관통력: <span style="color:#f1c40f">${pierce}</span><br>`;
        if (speed > 0) html += `투사체 속도: <span style="color:#f1c40f">${speed}</span><br>`;
        if (maxShots > 0 || maxShotsNext) html += `장탄수: <span style="color:#f1c40f">${maxShots}발</span>${maxShotsNext} (장전 <span style="color:#f1c40f">${reloadTime.toFixed(1)}초</span>${reloadNext})<br>`;
        if (type === 'Fireball' && w) {
            const curExpR = (w.explosionRadius || 80) + (w.bonusExplosionRadius || 0);
            html += `폭발 범위: <span style="color:#f1c40f">${curExpR}</span>${radiusNext}<br>`;
        }
        return html;
    }

    selectUpgrade(id) {
        if (!this.playerRef) return;

        const u = this.playerRef.upgradeLevels;

        switch (id) {
            case 'hp': {
                u.hp++;
                this.playerRef.maxHp += 10;
                const healAmount = this.playerRef.maxHp * 0.1;
                this.playerRef.hp = Math.min(this.playerRef.maxHp, this.playerRef.hp + healAmount);
                this.playerRef.updateHpUI();
                break;
            }
            case 'atk':
                u.atk++;
                this.playerRef.attackPower += 2.5;
                break;
            case 'def':
                u.def++;
                this.playerRef.defense += 1;
                break;
            case 'spd':
                u.spd++;
                this.playerRef.moveSpeed += 25;
                break;
            case 'magnet':
                u.magnet++;
                this.playerRef.magnetRadius += 30;
                break;
            case 'hpregen':
                u.hpregen++;
                this.playerRef.hpRegen += 0.1;
                break;
            case 'aspd':
                u.aspd++;
                this.playerRef.attackSpeed += this.playerRef.aspdUpgradeAmount;
                this.playerRef.aspdUpgradeAmount = Math.round((this.playerRef.aspdUpgradeAmount + 0.05) * 100) / 100;
                break;
            case 'grenade': {
                u.grenade++;
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Grenade');
                if (existing) existing.upgrade();
                else this.playerRef.zoneWeapons.push(new ZoneWeapon('Grenade'));
                break;
            }
            case 'radiation': {
                u.radiation++;
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Radiation');
                if (existing) existing.upgrade();
                else this.playerRef.zoneWeapons.push(new ZoneWeapon('Radiation'));
                break;
            }
            case 'sniper': {
                u.sniper++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Sniper');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Sniper'));
                break;
            }
            case 'balance': {
                u.balance++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Shotgun');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Shotgun'));
                break;
            }
            case 'bruiser': {
                u.bruiser++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Greatsword');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new GreatswordWeapon());
                break;
            }
            case 'energybolt': {
                u.energybolt++;
                const existing = this.playerRef.weapons.find(w => w.type === 'EnergyBolt');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new EnergyBoltWeapon());
                break;
            }
            case 'fireball': {
                u.fireball++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Fireball');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new FireballWeapon());
                break;
            }
        }

        this.playerRef.updateHpUI();
        document.getElementById('levelup-screen').classList.add('hidden');
        if (this.game) this.game.resumeGameAfterLevelUp();
    }
}
