class Projectile {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.duration = 0;
        
        // Weapon stats
        this.damage = 0;
        this.radius = 5;
        this.color = '#fff';
        this.type = 'Sniper';
        this.originX = 0;
        this.originY = 0;
        this.pierce = 1; // How many enemies it can hit
        this.hitEnemies = []; // Track who we already hit
    }

    spawn(x, y, targetX, targetY, speed, duration, damage, radius, color, type, pierce) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.originX = x;
        this.originY = y;
        this.duration = duration;
        
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.type = type;
        this.pierce = pierce;
        this.hitEnemies = [];

        // Direction mapping
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
        } else {
            this.vx = speed;
            this.vy = 0;
        }
    }

    update(dt, waveManager) {
        if (!this.active) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.duration -= dt;

        if (this.duration <= 0) {
            this.active = false;
            return;
        }

        // Check collision with enemies here for projectiles
        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active || this.hitEnemies.includes(enemy)) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distSq = dx*dx + dy*dy;
            const rSum = this.radius + enemy.radius;

            if (distSq < rSum * rSum) {
                // Hit!
                let finalDamage = this.damage;
                if (this.type === 'Sniper') {
                    // scale damage by distance flown
                    const travelSq = (this.x - this.originX)**2 + (this.y - this.originY)**2;
                    const travel = Math.sqrt(travelSq);
                    finalDamage += Math.floor(travel / 50); // +1 dmg every 50 pixels
                }

                enemy.takeDamage(finalDamage); // no longer pass vx/vy for knockback
                if (window.effectPool) {
                    window.effectPool.spawnText(enemy.x, enemy.y - 15, Math.floor(finalDamage).toString(), '#ff5e5e');
                }

                this.hitEnemies.push(enemy);
                this.pierce--;
                
                if (this.pierce <= 0) {
                    this.active = false;
                    break;
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Weapon {
    constructor(type) {
        this.type = type; // 'Sniper', 'Balance', 'Bruiser'
        this.cooldownTimer = 0;
        
        // Common projectile pool shared across weapon instance
        this.projectilePool = new Pool(() => new Projectile(), 50);
        this.activeProjectiles = [];

        // Set base params based on type
        if (type === 'Sniper') {
            this.cooldown = 1.0;
            this.projSpeed = 600;
            this.projDuration = 3.0; // Can cross entire screen
            this.baseDamage = 20; 
            this.projRadius = 5;
            this.color = '#f1c40f'; // Yellow
            this.pierce = 3; 
        } else if (type === 'Balance') {
            this.cooldown = 0.5;
            this.projSpeed = 400;
            this.projDuration = 1.0; // About 50% radius
            this.baseDamage = 15;
            this.projRadius = 8;
            this.color = '#2ecc71'; // Green
            this.pierce = 1;
        } else if (type === 'Bruiser') {
            this.cooldown = 0.8;
            this.projSpeed = 200;
            this.projDuration = 0.3; // Very short range
            this.baseDamage = 50;
            this.projRadius = 25; // Large hitbox close to player
            this.color = '#e67e22'; // Orange
            this.pierce = 99; // Cleaves through multiple close enemies
        }
    }

    update(dt, player, waveManager) {
        this.cooldownTimer -= dt;

        // Effective cooldown is base divided by attack speed
        // e.g. ASPD 2.0 = half cooldown
        const effectiveCooldown = this.cooldown / player.attackSpeed;

        if (this.cooldownTimer <= 0 && waveManager) {
            const target = this.findNearestEnemy(player, waveManager);
            if (target) {
                this.fire(player, target);
                this.cooldownTimer = effectiveCooldown;
            }
        }

        // Update active projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i];
            p.update(dt, waveManager);
            if (!p.active) {
                this.projectilePool.release(p);
                this.activeProjectiles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.activeProjectiles) {
            p.draw(ctx);
        }
    }

    findNearestEnemy(player, waveManager) {
        let nearest = null;
        let minDistSq = Infinity;

        // For Balance, don't shoot at enemies too far away
        const maxDistSq = this.type === 'Balance' ? (600 * 600) : Infinity;

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx*dx + dy*dy;
            
            if (distSq < minDistSq && distSq <= maxDistSq) {
                minDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }

    fire(player, target) {
        const p = this.projectilePool.get();
        // Base damage scales with flat player attack power (+2 per upgrade)
        const actualDamage = this.baseDamage + player.attackPower;
        
        p.spawn(
            player.x, player.y,
            target.x, target.y,
            this.projSpeed, this.projDuration, actualDamage, 
            this.projRadius, this.color, this.type, this.pierce
        );
        this.activeProjectiles.push(p);
    }
}
