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

        this.level = 1;
        this.bonusPower = 0;
        this.speedMultiplier = 1.0;
        this.bonusRadius = 0;
        this.bonusBullets = 0; // For Shotgun (starts with +0, base is 2)

        // Config에서 스탯 불러오기
        const stats = Config.WEAPON_STATS[type];
        if (stats) {
            this.cooldown = stats.cooldown;
            this.projSpeed = stats.projSpeed;
            this.projDuration = stats.projDuration;
            this.baseDamage = stats.baseDamage;
            this.projRadius = stats.projRadius;
            this.color = stats.color;
            this.pierce = stats.pierce;
            this.maxDistSq = stats.maxDistSq;
        } else {
            console.warn(`No stats found for weapon type: ${type}`);
        }
    }

    update(dt, player, waveManager) {
        this.cooldownTimer -= dt;

        const effectiveCooldown = (this.cooldown / this.speedMultiplier) / player.attackSpeed;

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

    upgrade() {
        this.level++;
        if (this.type === 'Dagger') {
            this.bonusRadius += 10;
            this.speedMultiplier *= 1.1;
            this.bonusPower += 5;
        } else if (this.type === 'Shotgun') {
            this.bonusBullets += 1;
            this.speedMultiplier *= 1.1;
            this.bonusPower += 3;
        } else if (this.type === 'Sniper') {
            this.bonusPower += 10;
            this.speedMultiplier *= 1.1;
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

        // 생성자에서 설정된 Config의 maxDistSq 사용
        const currentMaxDistSq = this.maxDistSq || Infinity;

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;

            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx*dx + dy*dy;

            if (distSq < minDistSq && distSq <= currentMaxDistSq) {
                minDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }

    fire(player, target) {
        const actualDamage = this.baseDamage + this.bonusPower + player.attackPower;
        const actualRadius = this.projRadius + this.bonusRadius;

        if (this.type === 'Shotgun') {
            // 산탄총 형태
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const baseAngle = Math.atan2(dy, dx);
            
            const totalBullets = 2 + this.bonusBullets;
            const spreadAngleDeg = 15;
            const startAngleDeg = -spreadAngleDeg * (totalBullets - 1) / 2;

            for (let i = 0; i < totalBullets; i++) {
                const p = this.projectilePool.get();
                const offsetDeg = startAngleDeg + i * spreadAngleDeg;
                const rad = baseAngle + (offsetDeg * Math.PI / 180);
                
                const targetX = player.x + Math.cos(rad) * 100;
                const targetY = player.y + Math.sin(rad) * 100;

                p.spawn(
                    player.x, player.y,
                    targetX, targetY,
                    this.projSpeed, this.projDuration, actualDamage,
                    actualRadius, this.color, this.type, this.pierce
                );
                this.activeProjectiles.push(p);
            }
        } else {
            const p = this.projectilePool.get();
            p.spawn(
                player.x, player.y,
                target.x, target.y,
                this.projSpeed, this.projDuration, actualDamage,
                actualRadius, this.color, this.type, this.pierce
            );
            this.activeProjectiles.push(p);
        }
    }
}
