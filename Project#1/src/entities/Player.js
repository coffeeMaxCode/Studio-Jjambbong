class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18; // Adjusted for sprite size (approx 64x64)
        
        this.img = new Image();
        this.img.src = 'assets/player.svg';

        // Base Stats (used for +10% upgrades)
        this.baseMaxHp = 100;
        this.baseAttackPower = 10;
        this.baseDefense = 0;
        this.baseMoveSpeed = 150;
        this.baseAttackSpeed = 1.0; // multiplier

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

        // Weapon (Initialized by Weapon Manager later)
        this.weapon = null;
    }

    update(dt, inputManager, waveManager) {
        if (this.isDead) return;

        // i-frames countdown
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        // Movement
        const axis = inputManager.getAxis();
        this.x += axis.x * this.moveSpeed * dt;
        this.y += axis.y * this.moveSpeed * dt;

        // Boundary Clamping (Canvas size: 1280x576)
        const padding = this.radius;
        if (this.x < padding) this.x = padding;
        if (this.x > 1280 - padding) this.x = 1280 - padding;
        if (this.y < padding) this.y = padding;
        if (this.y > 576 - padding) this.y = 576 - padding;
        
        // Update Weapon
        if (this.weapon) {
            this.weapon.update(dt, this, waveManager);
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        // Blink if invincible
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw Player Sprite
        if (this.img.complete && this.img.naturalWidth > 0) {
            ctx.drawImage(this.img, this.x - 32, this.y - 32, 64, 64);
        } else {
            // Fallback
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;

        // Draw Weapon Projectiles
        if (this.weapon) {
            this.weapon.draw(ctx);
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return;

        // Apply defense reduction (minimum 1 damage)
        const finalDamage = Math.max(1, amount - this.defense);
        this.hp -= finalDamage;

        // I-frame on normal hit (1.0 seconds)
        this.invincibleTimer = 1.0; 

        this.updateHpUI();

        if (this.hp <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        this.updateHpUI();
    }

    die() {
        this.hp = 0;
        this.isDead = true;
        this.updateHpUI();
        
        // Trigger global game over
        if (window.triggerGameOver) {
            window.triggerGameOver();
        }
    }

    revive() {
        if (this.hasRevived || !this.isDead) return false;
        
        this.hasRevived = true;
        this.isDead = false;
        this.hp = this.maxHp * 0.5; // 50% HP
        this.invincibleTimer = 3.0; // 3 seconds of invincibility
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
        this.expToNext = Math.floor(this.expToNext * 1.5); // Exponential growth
        document.getElementById('level-display').innerText = `Lv: ${this.level}`;
        
        // Trigger LevelUp UI logic
        if (window.triggerLevelUp) {
            window.triggerLevelUp();
        }
        
        // Check if multiple level ups pending
        if (this.exp >= this.expToNext) {
            // Usually handled iteratively by upgrade system 
        }
    }

    updateHpUI() {
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${pct}%`;
        document.getElementById('hp-text').innerText = `${Math.floor(this.hp)} / ${Math.floor(this.maxHp)}`;
        
        // Update other stats display
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
