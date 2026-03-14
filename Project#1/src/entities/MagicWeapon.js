// ── MagicWeapon.js ─────────────────────────────────────────────────────────
// 마법사 직업 전용 무기: EnergyBoltWeapon, FireballWeapon
// 기존 Weapon 클래스를 상속하여 특수 동작만 오버라이드

class EnergyBoltWeapon extends Weapon {
    constructor() {
        super('EnergyBolt');
    }

    upgrade() {
        this.level++;
        this.bonusPower += 4;
        this.speedMultiplier *= 1.08;
        if (this.baseReloadTime > 0.5) {
            this.baseReloadTime = Math.max(0.5, this.baseReloadTime - 0.5);
        }
    }

    // 보라색 글로우 투사체
    draw(ctx) {
        for (const p of this.activeWeaponProjectiles) {
            if (!p.active) continue;
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#9b59b6';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            // 중앙 밝은 코어
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#d7bde2';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

class FireballWeapon extends Weapon {
    constructor() {
        super('Fireball');
        this.explosionRadius = Config.WEAPON_STATS['Fireball'].explosionRadius;
        this.bonusExplosionRadius = 0;
    }

    upgrade() {
        this.level++;
        this.bonusPower += 5;
        this.bonusExplosionRadius += 10;
        this.speedMultiplier *= 1.1;
        if (this.baseReloadTime > 0.5) {
            this.baseReloadTime = Math.max(0.5, this.baseReloadTime - 0.5);
        }
    }

    fire(player, target) {
        if (this.reloadTimer > 0) return;

        this.cooldownTimer = this.cooldown;
        const actualDamage = this.baseDamage + this.bonusPower + player.attackPower;
        const actualRadius = this.projRadius + this.bonusRadius;
        const actualExplosionR = this.explosionRadius + this.bonusExplosionRadius;

        if (this.maxShots > 0) {
            this.shotsFired++;
            if (this.shotsFired >= this.maxShots && this.baseReloadTime > 0) {
                this.reloadTimer = this.baseReloadTime;
                this.shotsFired = 0;
            }
        }

        const p = this.projectilePool.get();
        // spawn() 먼저 호출 (내부에서 onDeactivate를 null로 리셋)
        p.spawn(
            player.x, player.y,
            target.x, target.y,
            this.projSpeed, this.projDuration, actualDamage,
            actualRadius, this.color, this.type, this.pierce
        );
        // spawn() 이후 콜백 설정
        p.onDeactivate = (x, y) => {
            const wm = player.game && player.game.waveManager;
            if (wm) {
                for (const e of wm.activeEnemies) {
                    if (!e.active) continue;
                    const dx = e.x - x;
                    const dy = e.y - y;
                    if (dx * dx + dy * dy < actualExplosionR * actualExplosionR) {
                        e.takeDamage(actualDamage);
                    }
                }
            }
            if (player.game) {
                player.game.spawnExplosion(x, y, actualExplosionR * 2);
            }
        };
        this.activeWeaponProjectiles.push(p);
    }

    // 주황-빨간 글로우 투사체
    draw(ctx) {
        for (const p of this.activeWeaponProjectiles) {
            if (!p.active) continue;
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#e67e22';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#f9e79f';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
