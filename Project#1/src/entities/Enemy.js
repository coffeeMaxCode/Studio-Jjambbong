class Enemy {
    constructor() {
        this.active = false;
        
        // Base Props
        this.x = 0;
        this.y = 0;
        this.type = 'Medium';
        this.radius = 15;
        this.color = '#e74c3c';
        
        // Stats
        this.maxHp = 20;
        this.hp = 20;
        this.speed = 50;
        this.damage = 10;
        
        // Effects
        this.flashTimer = 0;
        this.knockbackTimer = 0;
        this.knockbackDir = { x: 0, y: 0 };
        this.knockbackSpeed = 150;
        
        // Caching images statically to avoid loading 300 times
        if (!Enemy.imgSmall) {
            Enemy.imgSmall = new Image(); Enemy.imgSmall.src = 'assets/slime_green.svg';
            Enemy.imgMedium = new Image(); Enemy.imgMedium.src = 'assets/slime_blue.svg';
            Enemy.imgLarge = new Image(); Enemy.imgLarge.src = 'assets/slime_red.svg';
        }
    }

    /**
     * Called when retrieved from Pool to initialize properties
     */
    spawn(x, y, type) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.type = type;

        // Apply type stats - adjust radius based on visual sizes
        if (type === 'Small') {
            this.radius = 12; // 32x32 visual
            this.maxHp = 10;
            this.speed = 80;
            this.damage = 5;
            this.color = '#2ed573';
            this.img = Enemy.imgSmall;
            this.imgSize = 32;
        } else if (type === 'Large') {
            this.radius = 45; // 128x128 visual
            this.maxHp = 100;
            this.speed = 25;
            this.damage = 25;
            this.color = '#ff4757';
            this.img = Enemy.imgLarge;
            this.imgSize = 128;
        } else { 
            // Medium
            this.radius = 24; // 64x64 visual
            this.maxHp = 30;
            this.speed = 50;
            this.damage = 10;
            this.color = '#1e90ff';
            this.img = Enemy.imgMedium;
            this.imgSize = 64;
        }

        this.hp = this.maxHp;
        this.flashTimer = 0;
        this.knockbackTimer = 0;
    }

    takeDamage(amount, knockbackDx, knockbackDy, forceSpeed = null) {
        if (!this.active) return;

        this.hp -= amount;

        // Only flash and show damage number if took real damage
        if (amount > 0) {
            this.flashTimer = 0.1; // 100ms flash
            // 데미지 숫자 표시 (머리 위, sourceKey=this로 스태킹 식별)
            if (window.effectPool) {
                const headY = this.y - (this.imgSize ? this.imgSize / 2 : this.radius) - 5;
                window.effectPool.spawnText(this.x, headY, Math.floor(amount).toString(), this);
            }
        }
        
        // Apply knockback
        if (knockbackDx !== undefined && knockbackDy !== undefined) {
            this.knockbackTimer = 0.1;
            this.knockbackSpeed = forceSpeed !== null ? forceSpeed : 150; // default 150 or custom
            
            const len = Math.sqrt(knockbackDx*knockbackDx + knockbackDy*knockbackDy);
            if (len > 0) {
                this.knockbackDir.x = knockbackDx / len;
                this.knockbackDir.y = knockbackDy / len;
            }
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.active = false;
        // Trigger generic gem drop
        if (window.spawnGem) {
            window.spawnGem(this.x, this.y);
        }
    }

    update(dt, playerX, playerY) {
        if (!this.active) return;

        // Visual timers
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Movement logic
        if (this.knockbackTimer > 0) {
            // Being knocked back
            this.x += this.knockbackDir.x * this.knockbackSpeed * dt;
            this.y += this.knockbackDir.y * this.knockbackSpeed * dt;
            this.knockbackTimer -= dt;
        } else {
            // Normal walking towards player
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw sprite
        if (this.img && this.img.complete && this.img.naturalWidth > 0) {
            if (this.flashTimer > 0) {
                // Flash effect using composition
                ctx.globalCompositeOperation = 'source-atop';
                ctx.drawImage(this.img, this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.drawImage(this.img, this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
            }
        } else {
            // Fallback
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = (this.flashTimer > 0) ? '#fff' : this.color;
            ctx.fill();
        }

        // Draw HP Bar
        const barWidth = this.imgSize * 0.8;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y + this.imgSize / 2 + 5; // offset below
        
        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
    }
}
