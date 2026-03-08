class UpgradeSystem {
    constructor() {
        this.playerRef = null;

        const btnHp    = document.getElementById('btn-stat-hp');
        const btnAtk   = document.getElementById('btn-stat-atk');
        const btnDef   = document.getElementById('btn-stat-def');
        const btnSpd   = document.getElementById('btn-stat-spd');
        const btnAspd  = document.getElementById('btn-stat-aspd');
        const btnZoneT = document.getElementById('btn-stat-zone-targeted');
        const btnZoneA = document.getElementById('btn-stat-zone-aura');

        if (btnHp)    btnHp.addEventListener('click',    () => this.selectUpgrade('hp'));
        if (btnAtk)   btnAtk.addEventListener('click',   () => this.selectUpgrade('atk'));
        if (btnDef)   btnDef.addEventListener('click',   () => this.selectUpgrade('def'));
        if (btnSpd)   btnSpd.addEventListener('click',   () => this.selectUpgrade('spd'));
        if (btnAspd)  btnAspd.addEventListener('click',  () => this.selectUpgrade('aspd'));
        if (btnZoneT) btnZoneT.addEventListener('click', () => this.selectUpgrade('zone-targeted'));
        if (btnZoneA) btnZoneA.addEventListener('click', () => this.selectUpgrade('zone-aura'));
    }

    trigger(player) {
        this.playerRef = player;
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
                this.playerRef.attackSpeed += this.playerRef.baseAttackSpeed * 0.1;
                break;
            case 'zone-targeted': {
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'targeted');
                if (existing) {
                    existing.upgrade();
                } else {
                    this.playerRef.zoneWeapons.push(new ZoneWeapon('targeted'));
                }
                break;
            }
            case 'zone-aura': {
                const existing = this.playerRef.zoneWeapons.find(z => z.type === 'aura');
                if (existing) {
                    existing.upgrade();
                } else {
                    this.playerRef.zoneWeapons.push(new ZoneWeapon('aura'));
                }
                break;
            }
        }

        this.playerRef.updateHpUI();

        document.getElementById('levelup-screen').classList.add('hidden');

        if (window.resumeGameAfterLevelUp) {
            window.resumeGameAfterLevelUp();
        }
    }
}
