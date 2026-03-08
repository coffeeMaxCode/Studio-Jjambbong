class UpgradeSystem {
    constructor() {
        this.playerRef = null;
        
        const btnHp = document.getElementById('btn-stat-hp');
        const btnAtk = document.getElementById('btn-stat-atk');
        const btnDef = document.getElementById('btn-stat-def');
        const btnSpd = document.getElementById('btn-stat-spd');
        const btnAspd = document.getElementById('btn-stat-aspd');

        // Ensure buttons exist before attaching (they are in HTML)
        if (btnHp) btnHp.addEventListener('click', () => this.selectUpgrade('hp'));
        if (btnAtk) btnAtk.addEventListener('click', () => this.selectUpgrade('atk'));
        if (btnDef) btnDef.addEventListener('click', () => this.selectUpgrade('def'));
        if (btnSpd) btnSpd.addEventListener('click', () => this.selectUpgrade('spd'));
        if (btnAspd) btnAspd.addEventListener('click', () => this.selectUpgrade('aspd'));
    }

    trigger(player) {
        this.playerRef = player;
        // In a full game, we would randomly pick 3-4 options from a larger pool.
        // For this prototype, the requirements specify 4 fixed stat choices.
    }

    selectUpgrade(id) {
        if (!this.playerRef) return;
        
        switch (id) {
            case 'hp':
                const hpBonus = this.playerRef.baseMaxHp * 0.1;
                this.playerRef.maxHp += hpBonus;
                this.playerRef.hp += hpBonus; // Heal by the increased amount
                this.playerRef.updateHpUI();
                break;
            case 'atk':
                this.playerRef.attackPower += this.playerRef.baseAttackPower * 0.1;
                break;
            case 'def':
                // Defense might be 0 base, so +1 minimum if 10% is 0
                const defBonus = Math.max(1, this.playerRef.baseDefense * 0.1);
                this.playerRef.defense += 1; // Flat +1 for simplicity since base is 0
                break;
            case 'spd':
                this.playerRef.moveSpeed += this.playerRef.baseMoveSpeed * 0.1;
                this.playerRef.magnetRadius += 20; // Bonus
                break;
            case 'aspd':
                this.playerRef.attackSpeed += this.playerRef.baseAttackSpeed * 0.1;
                break;
        }
        
        // Refresh UI
        this.playerRef.updateHpUI();

        // Hide UI
        document.getElementById('levelup-screen').classList.add('hidden');
        
        // Invoke global resume
        if (window.resumeGameAfterLevelUp) {
            window.resumeGameAfterLevelUp();
        }
    }
}
