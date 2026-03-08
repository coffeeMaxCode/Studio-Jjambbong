class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;

        this.img = new Image();
        this.img.src = 'assets/player.svg';

        // Base Stats
        this.baseMaxHp = 100;
        this.baseAttackPower = 10;
        this.baseDefense = 0;
        this.baseMoveSpeed = 150;
        this.baseAttackSpeed = 1.0;

        // Current Stats
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.attackPower = this.baseAttackPower;
        this.defense = this.baseDefense;
        this.moveSpeed = this.baseMoveSpeed;
        this.attackSpeed = this.baseAttackSpeed;

        // State
        this.isDead = false;
        this.hasRevived = false;

        // i-frames
        this.invincibleTimer = 0;

        // Exp / Level
        this.level = 1;
        this.exp = 0;
        this.expToNext = 10;
        this.magnetRadius = 100;

        // 무기
        this.weapon = null;

        // 장판 무기 목록 (ZoneWeapon 인스턴스 배열)
        this.zoneWeapons = [];
    }

    update(dt, inputManager, waveManager) {
        if (this.isDead) return;

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        // 이동
        const axis = inputManager.getAxis();
        this.x += axis.x * this.moveSpeed * dt;
        this.y += axis.y * this.moveSpeed * dt;

        // 경계 클램핑 (Canvas 1280x720)
        const padding = this.radius;
        if (this.x < padding) this.x = padding;
        if (this.x > 1280 - padding) this.x = 1280 - padding;
        if (this.y < padding) this.y = padding;
        if (this.y > 720 - padding) this.y = 720 - padding;

        // 일반 무기 업데이트
        if (this.weapon) {
            this.weapon.update(dt, this, waveManager);
        }

        // 장판 무기 업데이트
        for (const zw of this.zoneWeapons) {
            zw.update(dt, this, waveManager);
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        // 장판 무기는 플레이어/적 뒤에 렌더링
        for (const zw of this.zoneWeapons) {
            zw.draw(ctx);
        }

        // 무적 시 깜빡임
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 플레이어 스프라이트
        if (this.img.complete && this.img.naturalWidth > 0) {
            ctx.drawImage(this.img, this.x - 32, this.y - 32, 64, 64);
        } else {
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;

        // 일반 무기 발사체
        if (this.weapon) {
            this.weapon.draw(ctx);
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return;

        // 방어력 감소 (최소 1 데미지)
        const finalDamage = Math.max(1, amount - this.defense);
        this.hp -= finalDamage;

        // 피격 무적 1초
        this.invincibleTimer = 1.0;

        this.updateHpUI();

        if (this.hp <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHpUI();
    }

    die() {
        this.hp = 0;
        this.isDead = true;
        this.updateHpUI();
        if (window.triggerGameOver) {
            window.triggerGameOver();
        }
    }

    revive() {
        if (this.hasRevived || !this.isDead) return false;
        this.hasRevived = true;
        this.isDead = false;
        this.hp = this.maxHp * 0.5;
        this.invincibleTimer = 3.0;
        this.updateHpUI();
        return true;
    }

    gainExp(amount) {
        if (this.isDead) return;
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.levelUp();
        }
        this.updateExpUI();
    }

    levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(this.expToNext * 1.25); // 기존 50% 증가에서 25%로 완화
        document.getElementById('level-display').innerText = `Lv: ${this.level}`;
        if (window.triggerLevelUp) {
            window.triggerLevelUp();
        }
        if (this.exp >= this.expToNext) {
            // 연속 레벨업은 UpgradeSystem에서 처리
        }
    }

    updateHpUI() {
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${pct}%`;
        document.getElementById('hp-text').innerText = `${Math.floor(this.hp)} / ${Math.floor(this.maxHp)}`;

        document.getElementById('stat-atk').innerText = `ATK: ${Math.floor(this.attackPower)}`;
        document.getElementById('stat-def').innerText = `DEF: ${Math.floor(this.defense)}`;
        document.getElementById('stat-spd').innerText = `SPD: ${Math.floor(this.moveSpeed)}`;
        document.getElementById('stat-aspd').innerText = `ASPD: ${this.attackSpeed.toFixed(2)}x`;
    }

    updateExpUI() {
        const pct = Math.min(100, (this.exp / this.expToNext) * 100);
        document.getElementById('exp-bar-fill').style.width = `${pct}%`;
        document.getElementById('exp-text').innerText = `${Math.floor(this.exp)} / ${this.expToNext}`;
    }
}
