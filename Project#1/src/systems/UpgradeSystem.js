class UpgradeSystem {
    constructor(game) {
        this.game = game;
        this.playerRef = null;

        const btnHp = document.getElementById('btn-stat-hp');
        const btnAtk = document.getElementById('btn-stat-atk');
        const btnDef = document.getElementById('btn-stat-def');
        const btnSpd = document.getElementById('btn-stat-spd');
        const btnAspd = document.getElementById('btn-stat-aspd');
        const btnMagnet = document.getElementById('btn-stat-magnet');
        const btnRegen = document.getElementById('btn-stat-hpregen');
        const btnZoneT = document.getElementById('btn-stat-zone-targeted');
        const btnZoneA = document.getElementById('btn-stat-zone-aura');

        const btnWpnSniper = document.getElementById('btn-stat-wpn-sniper');
        const btnWpnBalance = document.getElementById('btn-stat-wpn-balance');
        const btnWpnBruiser = document.getElementById('btn-stat-wpn-bruiser');

        if (btnHp) btnHp.addEventListener('click', () => this.selectUpgrade('hp'));
        if (btnAtk) btnAtk.addEventListener('click', () => this.selectUpgrade('atk'));
        if (btnDef) btnDef.addEventListener('click', () => this.selectUpgrade('def'));
        if (btnSpd) btnSpd.addEventListener('click', () => this.selectUpgrade('spd'));
        if (btnAspd) btnAspd.addEventListener('click', () => this.selectUpgrade('aspd'));
        if (btnMagnet) btnMagnet.addEventListener('click', () => this.selectUpgrade('magnet'));
        if (btnRegen) btnRegen.addEventListener('click', () => this.selectUpgrade('hpregen'));
        if (btnZoneT) btnZoneT.addEventListener('click', () => this.selectUpgrade('zone-targeted'));
        if (btnZoneA) btnZoneA.addEventListener('click', () => this.selectUpgrade('zone-aura'));

        if (btnWpnSniper) btnWpnSniper.addEventListener('click', () => this.selectUpgrade('wpn-sniper'));
        if (btnWpnBalance) btnWpnBalance.addEventListener('click', () => this.selectUpgrade('wpn-balance'));
        if (btnWpnBruiser) btnWpnBruiser.addEventListener('click', () => this.selectUpgrade('wpn-bruiser'));
    }

    trigger(player) {
        this.playerRef = player;

        // 버튼 텍스트 업데이트 (선택 횟수 표시 + 접두사 제거)
        const updateBtn = (id, label, count, tooltipHtml = '') => {
            const btn = document.getElementById(id);
            if (btn) {
                if (tooltipHtml) {
                    btn.innerHTML = `[${count}] ${label} <span class="tooltiptext">${tooltipHtml}</span>`;
                    btn.classList.add('tooltip');
                } else {
                    btn.innerHTML = `[${count}] ${label}`;
                    btn.classList.remove('tooltip');
                }

                if (count > 0) {
                    btn.style.borderColor = '#f1c40f'; // 보유/업그레이드된 상태면 강조
                } else {
                    btn.style.borderColor = '#7f8c8d';
                }
            }
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
        updateBtn('btn-stat-hp', 'Max HP +10', u.hp, getStatTooltip('hp'));
        updateBtn('btn-stat-atk', 'Attack Power +2.5', u.atk, getStatTooltip('atk'));
        updateBtn('btn-stat-def', 'Defense +1', u.def, getStatTooltip('def'));
        updateBtn('btn-stat-spd', 'Move Speed +25', u.spd, getStatTooltip('spd'));
        updateBtn('btn-stat-aspd', 'Attack Speed +5%', u.aspd, getStatTooltip('aspd'));
        updateBtn('btn-stat-magnet', 'Magnet Radius +30', u.magnet, getStatTooltip('magnet'));
        updateBtn('btn-stat-hpregen', 'HP Regen +0.1/s', u.hpregen, getStatTooltip('hpregen'));

        // 무기 최종 툴팁 계산 도우미 함수

        const getTooltip = (type) => {
            const w = player.weapons.find(w => w.type === type) || player.zoneWeapons.find(z => z.type === type);
            const base = Config.WEAPON_STATS[type] || {};

            let dmg = type === 'Grenade' ? 20 : (base.baseDamage || 5);
            let cooldown = base.cooldown || 0;
            let radius = base.projRadius || 0;
            let pierce = base.pierce || 0;
            let speed = base.projSpeed || 0;
            let maxShots = 0;
            let reloadTime = 0;

            if (type === 'Grenade') { radius = 70; cooldown = 3.0; }
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

            // 보유 중이면 레벨업(업그레이드) 시 얻는 혜택 표시
            let dmgNext = '';
            let cooldownNext = '';
            let radiusNext = '';
            let pierceNext = '';
            let speedNext = '';
            let maxShotsNext = '';
            let reloadNext = '';

            if (w) {
                if (type === 'Dagger') {
                    dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 1.5}</span>`;
                    radiusNext = ` <span style="color:#2ecc71">-> ${radius + 5}</span>`;
                    cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 0.4) * 0.945).toFixed(2)}초</span>`; // roughly 5.5% faster
                } else if (type === 'Sniper') {
                    dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 5}</span>`;
                    cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 1.33) * 0.9).toFixed(2)}초</span>`; // 10% faster
                } else if (type === 'Shotgun') {
                    dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 1.5}</span>`;
                    cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 0.83) * 0.9).toFixed(2)}초</span>`; // 10% faster
                    if (maxShots > 0) maxShotsNext = ` <span style="color:#2ecc71">-> ${maxShots + 1}발</span>`;
                } else if (type === 'Grenade') {
                    dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 10}</span>`;
                    radiusNext = ` <span style="color:#2ecc71">-> ${radius + 20}</span>`;
                    cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 3.0) * 0.9).toFixed(2)}초</span>`;
                } else if (type === 'Radiation') {
                    dmgNext = ` <span style="color:#2ecc71">-> ${dmg + player.attackPower + 2.5}</span>`;
                    radiusNext = ` <span style="color:#2ecc71">-> ${radius + 25}</span>`;
                    cooldownNext = ` <span style="color:#2ecc71">-> ${((cooldown || 1.0) * 0.9).toFixed(2)}초</span>`;
                }
                if (type !== 'Grenade' && type !== 'Radiation' && reloadTime > 0.5) {
                    reloadNext = ` <span style="color:#2ecc71">-> ${(reloadTime - 0.5).toFixed(1)}초</span>`;
                }
            }

            html += `데미지: <span style="color:#f1c40f">${dmg + player.attackPower}</span>${dmgNext}<br>`;
            if (cooldown > 0) html += `공격 간격: <span style="color:#f1c40f">${cooldown.toFixed(2)}초</span>${cooldownNext}<br>`;
            if (radius > 0) html += `효과 범위: <span style="color:#f1c40f">${radius}</span>${radiusNext}<br>`;
            if (pierce > 0) html += `관통력: <span style="color:#f1c40f">${pierce}</span>${pierceNext}<br>`;
            if (speed > 0) html += `투사체 속도: <span style="color:#f1c40f">${speed}</span>${speedNext}<br>`;
            if (maxShots > 0 || maxShotsNext !== '') html += `장탄수: <span style="color:#f1c40f">${maxShots}발</span>${maxShotsNext} (장전 <span style="color:#f1c40f">${reloadTime.toFixed(1)}초</span>${reloadNext})<br>`;

            return html;
        };

        updateBtn('btn-stat-wpn-bruiser', `대검 (Greatsword)`, u.bruiser, getTooltip('Dagger'));
        updateBtn('btn-stat-wpn-sniper', `저격 (Sniper)`, u.sniper, getTooltip('Sniper'));
        updateBtn('btn-stat-wpn-balance', `샷건 (Shotgun)`, u.balance, getTooltip('Shotgun'));
        updateBtn('btn-stat-zone-targeted', `수류탄 (Grenade)`, u.grenade, getTooltip('Grenade'));
        updateBtn('btn-stat-zone-aura', `방사능 (Radiation)`, u.radiation, getTooltip('Radiation'));
    }

    selectUpgrade(id) {
        if (!this.playerRef) return;

        const u = this.playerRef.upgradeLevels;

        switch (id) {
            case 'hp': {
                u.hp++;
                this.playerRef.maxHp += 10;
                // 증가된 최대 체력의 10%만큼 즉시 회복
                const healAmount = this.playerRef.maxHp * 0.1;
                this.playerRef.hp = Math.min(this.playerRef.maxHp, this.playerRef.hp + healAmount);
                this.playerRef.updateHpUI();
                break;
            }
            case 'atk':
                u.atk++;
                this.playerRef.attackPower += 2.5; // Halved from 5
                break;
            case 'def':
                u.def++;
                this.playerRef.defense += 1;
                break;
            case 'spd':
                u.spd++;
                this.playerRef.moveSpeed += 25;
                // magnetRadius 분리됨
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
            case 'zone-targeted': {
                u.grenade++;
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Grenade');
                if (existing) existing.upgrade();
                else this.playerRef.zoneWeapons.push(new ZoneWeapon('Grenade'));
                break;
            }
            case 'zone-aura': {
                u.radiation++;
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Radiation');
                if (existing) existing.upgrade();
                else this.playerRef.zoneWeapons.push(new ZoneWeapon('Radiation'));
                break;
            }
            case 'wpn-sniper': {
                u.sniper++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Sniper');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Sniper'));
                break;
            }
            case 'wpn-balance': {
                u.balance++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Shotgun');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Shotgun'));
                break;
            }
            case 'wpn-bruiser': {
                u.bruiser++;
                const existing = this.playerRef.weapons.find(w => w.type === 'Dagger');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Dagger'));
                break;
            }
        }

        this.playerRef.updateHpUI();
        document.getElementById('levelup-screen').classList.add('hidden');
        if (this.game) this.game.resumeGameAfterLevelUp();
    }
}
