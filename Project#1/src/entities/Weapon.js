class Projectile {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.duration = 0;

        this.damage = 0;
        this.radius = 5;
        this.color = '#fff';
        this.type = 'Sniper';
        this.originX = 0;
        this.originY = 0;
        this.pierce = 1;
        this.hitEnemies = [];
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

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active || this.hitEnemies.includes(enemy)) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distSq = dx*dx + dy*dy;
            const rSum = this.radius + enemy.radius;

            if (distSq < rSum * rSum) {
                let finalDamage = this.damage;
                if (this.type === 'Sniper') {
                    const travelSq = (this.x - this.originX)**2 + (this.y - this.originY)**2;
                    const travel = Math.sqrt(travelSq);
                    finalDamage += Math.floor(travel / 50);
                }

                enemy.takeDamage(finalDamage);
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
        this.type = type;
        this.cooldownTimer = 0;

        this.projectilePool = new Pool(() => new Projectile(), 50);
        this.activeProjectiles = [];

        // 초기 공격 속도 2배 빠르게 (쿨다운 절반)
        if (type === 'Sniper') {
            this.cooldown = 0.5;      // 기존 1.0 → 0.5
            this.projSpeed = 600;
            this.projDuration = 3.0;
            this.baseDamage = 20;
            this.projRadius = 5;
            this.color = '#f1c40f';
            this.pierce = 3;
        } else if (type === 'Balance') {
            this.cooldown = 0.25;     // 기존 0.5 → 0.25
            this.projSpeed = 400;
            this.projDuration = 1.0;
            this.baseDamage = 15;
            this.projRadius = 8;
            this.color = '#2ecc71';
            this.pierce = 1;
        } else if (type === 'Bruiser') {
            this.cooldown = 0.4;      // 기존 0.8 → 0.4
            this.projSpeed = 200;
            this.projDuration = 0.3;
            this.baseDamage = 50;
            this.projRadius = 25;
            this.color = '#e67e22';
            this.pierce = 99;
        }
    }

    update(dt, player, waveManager) {
        this.cooldownTimer -= dt;

        const effectiveCooldown = this.cooldown / player.attackSpeed;

        if (this.cooldownTimer <= 0 && waveManager) {
            const target = this.findNearestEnemy(player, waveManager);
            if (target) {
                this.fire(player, target);
                this.cooldownTimer = effectiveCooldown;
            }
        }

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
