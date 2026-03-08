class UpgradeSystem {
    constructor(game) {
        this.game = game;
        this.playerRef = null;

        const btnHp    = document.getElementById('btn-stat-hp');
        const btnAtk   = document.getElementById('btn-stat-atk');
        const btnDef   = document.getElementById('btn-stat-def');
        const btnSpd   = document.getElementById('btn-stat-spd');
        const btnAspd  = document.getElementById('btn-stat-aspd');
        const btnZoneT = document.getElementById('btn-stat-zone-targeted');
        const btnZoneA = document.getElementById('btn-stat-zone-aura');

        const btnWpnSniper  = document.getElementById('btn-stat-wpn-sniper');
        const btnWpnBalance = document.getElementById('btn-stat-wpn-balance');
        const btnWpnBruiser = document.getElementById('btn-stat-wpn-bruiser');

        if (btnHp)    btnHp.addEventListener('click',    () => this.selectUpgrade('hp'));
        if (btnAtk)   btnAtk.addEventListener('click',   () => this.selectUpgrade('atk'));
        if (btnDef)   btnDef.addEventListener('click',   () => this.selectUpgrade('def'));
        if (btnSpd)   btnSpd.addEventListener('click',   () => this.selectUpgrade('spd'));
        if (btnAspd)  btnAspd.addEventListener('click',  () => this.selectUpgrade('aspd'));
        if (btnZoneT) btnZoneT.addEventListener('click', () => this.selectUpgrade('zone-targeted'));
        if (btnZoneA) btnZoneA.addEventListener('click', () => this.selectUpgrade('zone-aura'));

        if (btnWpnSniper)  btnWpnSniper.addEventListener('click',  () => this.selectUpgrade('wpn-sniper'));
        if (btnWpnBalance) btnWpnBalance.addEventListener('click', () => this.selectUpgrade('wpn-balance'));
        if (btnWpnBruiser) btnWpnBruiser.addEventListener('click', () => this.selectUpgrade('wpn-bruiser'));
    }

    trigger(player) {
        this.playerRef = player;
        
        // 레벨업 창이 뜰 때 버튼 텍스트를 현재 설정된 증가량에 맞게 업데이트
        const btnAspd = document.getElementById('btn-stat-aspd');
        if (btnAspd && player) {
            btnAspd.innerText = `Attack Speed +${player.aspdUpgradeAmount.toFixed(2)}x`;
        }
    }

    selectUpgrade(id) {
        if (!this.playerRef) return;

        switch (id) {
            case 'hp': {
                const hpBonus = this.playerRef.baseMaxHp * 0.1;
                this.playerRef.maxHp += hpBonus;
                this.playerRef.hp += hpBonus;
                this.playerRef.updateHpUI();
                break;
            }
            case 'atk':
                this.playerRef.attackPower += 5;
                break;
            case 'def':
                // 방어력: 정확히 +1 고정
                this.playerRef.defense += 1;
                break;
            case 'spd':
                this.playerRef.moveSpeed += this.playerRef.baseMoveSpeed * 0.1;
                this.playerRef.magnetRadius += 20;
                break;
            case 'aspd':
                this.playerRef.attackSpeed += this.playerRef.aspdUpgradeAmount;
                // 다음 업그레이드 수치를 0.05 증가시킴 (부동소수점 오차 방지)
                this.playerRef.aspdUpgradeAmount = Math.round((this.playerRef.aspdUpgradeAmount + 0.05) * 100) / 100;
                break;
            case 'zone-targeted': {
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Grenade');
                if (existing) {
                    existing.upgrade();
                } else {
                    this.playerRef.zoneWeapons.push(new ZoneWeapon('Grenade'));
                }
                break;
            }
            case 'zone-aura': {
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'Radiation');
                if (existing) {
                    existing.upgrade();
                } else {
                    this.playerRef.zoneWeapons.push(new ZoneWeapon('Radiation'));
                }
                break;
            }
            case 'wpn-sniper': {
                const existing = this.playerRef.weapons.find(w => w.type === 'Sniper');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Sniper'));
                break;
            }
            case 'wpn-balance': {
                const existing = this.playerRef.weapons.find(w => w.type === 'Shotgun');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Shotgun'));
                break;
            }
            case 'wpn-bruiser': {
                const existing = this.playerRef.weapons.find(w => w.type === 'Dagger');
                if (existing) existing.upgrade();
                else this.playerRef.weapons.push(new Weapon('Dagger'));
                break;
            }
        }

        this.playerRef.updateHpUI();

        document.getElementById('levelup-screen').classList.add('hidden');

        if (this.game) {
            this.game.resumeGameAfterLevelUp();
        }
    }
}
