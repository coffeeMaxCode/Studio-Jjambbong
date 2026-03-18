class WeaponProjectile {
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
        this.onDeactivate = null; // 투사체 소멸 시 호출할 콜백 (Fireball 폭발 등)
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
        this.onDeactivate = null;

        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
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
            const distSq = dx * dx + dy * dy;
            const rSum = this.radius + enemy.radius;

            if (distSq < rSum * rSum) {
                let finalDamage = this.damage;
                if (this.type === 'Sniper') {
                    const travelSq = (this.x - this.originX) ** 2 + (this.y - this.originY) ** 2;
                    const travel = Math.sqrt(travelSq);
                    // 거리가 멀수록 데미지 증가 (100유닛당 +10 데미지 예시, 기획에 맞춰 조정 가능)
                    finalDamage += Math.floor(travel / 50) * 5;
                }

                let knockbackDx, knockbackDy, forceSpeed;
                if (this.type === 'Dagger') {
                    knockbackDx = this.vx;
                    knockbackDy = this.vy;
                    forceSpeed = 400 + (this.bonusKnockback || 0); // Strong knockback for Dagger
                }

                enemy.takeDamage(finalDamage, knockbackDx, knockbackDy, forceSpeed);
                this.hitEnemies.push(enemy);
                this.pierce--;

                if (this.pierce <= 0) {
                    if (this.onDeactivate) this.onDeactivate(this.x, this.y);
                    this.active = false;
                    break;
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        if (this.type === 'Dagger') {
            const angle = Math.atan2(this.vy, this.vx);
            // 전방 180도 반원형 (부채꼴) — X(reach)×2.0, Y(width)×0.7
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.scale(2.0, 0.7);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2);
            ctx.lineTo(0, 0);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }
}

class Weapon {
    constructor(type) {
        this.type = type;
        this.cooldownTimer = 0;

        this.projectilePool = new Pool(() => new WeaponProjectile(), 50);
        this.activeWeaponProjectiles = [];

        this.level = 1;
        this.bonusPower = 0;
        this.bonusKnockback = 0;
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

        // 샷건 전용: 초기 벌어짐 각도 15도
        if (this.type === 'Shotgun') {
            this.shotgunSpread = 15;
        }

        // 재장전 시스템 초기화
        this.shotsFired = 0;
        this.reloadTimer = 0;
        this.baseReloadTime = 0;
        this.maxShots = 0;

        if (this.type === 'Shotgun') {
            this.maxShots = 3;
            this.baseReloadTime = 2.0;
        } else if (this.type === 'Sniper') {
            this.maxShots = 5;
            this.baseReloadTime = 3.0;
        }
    }

    update(dt, player, waveManager) {
        // 재장전 중이면 타이머만 감소시키고 공격 로직 skip
        if (this.reloadTimer > 0) {
            this.reloadTimer -= dt;
        } else {
            // 공격 쿨다운 및 사격 로직
            const effectiveCooldown = (this.cooldown / this.speedMultiplier) / (player.attackSpeed * player.buffMultipliers.aspd);

            if (this.cooldownTimer <= 0 && waveManager) {
                const target = this.findNearestEnemy(player, waveManager);
                if (target) {
                    this.fire(player, target);
                    this.cooldownTimer = effectiveCooldown;
                }
            } else if (this.cooldownTimer > 0) {
                this.cooldownTimer -= dt;
            }
        }

        // 이미 발사된 투사체 업데이트 (재장전 중에도 멈추지 않음)
        for (let i = this.activeWeaponProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeWeaponProjectiles[i];
            p.update(dt, waveManager);
            if (!p.active) {
                this.projectilePool.release(p);
                this.activeWeaponProjectiles.splice(i, 1);
            }
        }
    }

    upgrade() {
        this.level++;
        if (this.type === 'Dagger') {
            this.bonusRadius += 5; // Reduced from 10
            this.speedMultiplier *= 1.055; // Changed from 1.1
            this.bonusPower += 1.5; // Reduced from 2.5
            this.bonusKnockback += 20;
        } else if (this.type === 'Shotgun') {
            this.bonusBullets += 1;
            this.speedMultiplier *= 1.1;
            this.bonusPower += 1.5; // Halved from 3
            // 레벨업마다 5도씩 증가 (최대 60도)
            if (this.shotgunSpread < 60) {
                this.shotgunSpread = Math.min(60, this.shotgunSpread + 5);
            }
        } else if (this.type === 'Sniper') {
            this.bonusPower += 5;
            this.speedMultiplier *= 1.1;
        }

        // 재장전 시간 단축 (최소 0.5초 고정)
        if (this.baseReloadTime > 0.5) {
            this.baseReloadTime = Math.max(0.5, this.baseReloadTime - 0.5);
        }
    }

    draw(ctx) {
        for (const p of this.activeWeaponProjectiles) {
            p.draw(ctx);
        }
    }

    findNearestEnemy(player, waveManager) {
        // auto-aim OFF: 플레이어가 바라보는 방향의 가상 타겟 반환
        if (player.game && !player.game.autoAimEnabled) {
            return {
                x: player.x + player.facingX * 500,
                y: player.y + player.facingY * 500,
                active: true
            };
        }

        let nearest = null;
        let minDistSq = this.maxDistSq;

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;

            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > this.maxDistSq) continue;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }

    fire(player, target) {
        if (this.reloadTimer > 0) return; // 재장전 중이면 발사 불가

        this.cooldownTimer = this.cooldown;
        const actualDamage = this.baseDamage + this.bonusPower + player.attackPower;
        const actualRadius = this.projRadius + this.bonusRadius;

        // 사격 횟수 증가 및 재장전 트리거
        if (this.maxShots > 0) {
            this.shotsFired++;
            if (this.shotsFired >= this.maxShots && this.baseReloadTime > 0) {
                this.reloadTimer = this.baseReloadTime;
                this.shotsFired = 0;
            }
        }

        if (this.type === 'Shotgun') {
            // 산탄총 형태
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const baseAngle = Math.atan2(dy, dx);

            const totalBullets = 2 + this.bonusBullets;
            // 현재 벌어짐 각도(shotgunSpread)를 탄환 수에 맞춰 분배
            const currentSpread = this.shotgunSpread;
            const spreadAngleDeg = currentSpread / (totalBullets > 1 ? totalBullets - 1 : 1);
            const startAngleDeg = -currentSpread / 2;

            for (let i = 0; i < totalBullets; i++) {
                const p = this.projectilePool.get();
                const offsetDeg = startAngleDeg + (totalBullets > 1 ? i * spreadAngleDeg : currentSpread / 2);
                const rad = baseAngle + (offsetDeg * Math.PI / 180);

                const targetX = player.x + Math.cos(rad) * 100;
                const targetY = player.y + Math.sin(rad) * 100;

                p.spawn(
                    player.x, player.y,
                    targetX, targetY,
                    this.projSpeed, this.projDuration, actualDamage,
                    actualRadius, this.color, this.type, this.pierce
                );
                p.bonusKnockback = this.bonusKnockback;
                this.activeWeaponProjectiles.push(p);
            }
        } else {
            const p = this.projectilePool.get();
            p.spawn(
                player.x, player.y,
                target.x, target.y,
                this.projSpeed, this.projDuration, actualDamage,
                actualRadius, this.color, this.type, this.pierce
            );
            p.bonusKnockback = this.bonusKnockback;
            this.activeWeaponProjectiles.push(p);
        }
    }
}
