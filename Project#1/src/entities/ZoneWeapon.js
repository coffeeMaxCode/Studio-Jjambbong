/**
 * ActiveZone - 장판 개별 인스턴스
 * 설치형(Targeted): 고정 위치, 일정 시간 지속
 * 오라형(Aura): 플레이어를 따라다니며 영구 지속
 */
class ActiveZone {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.duration = 0;      // -1이면 영구 지속
        this.tickTimer = 0;
        this.tickInterval = 0.5;
        this.damage = 0;
        this.color = 'rgba(255,100,0,0.35)';
        this.followPlayer = false;
        this.hitEnemies = []; // 해당 장판에 이미 맞은 적 목록
    }
}

/**
 * ZoneWeapon - 장판 무기 시스템
 * type: 'Grenade' (설치형) | 'Radiation' (오라형)
 */
class ZoneWeapon {
    constructor(type) {
        this.type = type;
        this.level = 1;
        this.activeZones = [];
        this.speedMultiplier = 1.0;

        if (this.type === 'Grenade') {
            this.deployTimer = 0;       // 0이면 즉시 첫 배치
            this.deployInterval = 3.0;  // 3초마다 새 장판 배치
            this.zoneRadius = 70;
            this.zoneDuration = 0.2;    // 0.2초 지속 (doubled from 0.1)
            this.baseDamage = 50;       // 폭발형이므로 데미지 상향 조정
            this.tickInterval = 0.05;   // 매우 빠른 체크
        } else if (this.type === 'Radiation') {
            // Radiation (오라형): 즉시 영구 장판 생성
            this.zoneRadius = 80;
            this.baseDamage = 5;
            this.tickInterval = 1.0;

            const aura = new ActiveZone();
            aura.active = true;
            aura.radius = this.zoneRadius;
            aura.duration = -1;
            aura.tickInterval = this.tickInterval;
            aura.tickTimer = this.tickInterval; // 초기 틱 타이머 설정
            aura.followPlayer = true;
            aura.color = 'rgba(138,43,226,0.25)';
            this.activeZones.push(aura);
        }
    }

    /** 레벨업 시 스탯 강화 (반경, 속도, 공격력 증가) */
    upgrade() {
        this.level++;
        this.speedMultiplier *= 1.1; // 공격속도 증가 (쿨타임 감소)

        if (this.type === 'Grenade') {
            this.baseDamage += 5; // Halved from 10 (originally 20)
            this.zoneRadius += 20;
            this.tickInterval *= 0.9;
        } else if (this.type === 'Radiation') {
            this.baseDamage += 0.625; // Halved from 1.25 (originally 2.5)
            this.zoneRadius += 7;
            this.tickInterval *= 0.9; // Match the 10% tooltip reduction
            // 오라 반경 즉시 반영 및 틱 갱신
            if (this.activeZones[0]) {
                this.activeZones[0].radius = this.zoneRadius;
                this.activeZones[0].tickInterval = this.tickInterval;
            }
        }
    }

    update(dt, player, waveManager) {
        // 설치형: 쿨다운마다 새 장판 배치
        if (this.type === 'Grenade') {
            const effectiveCooldown = this.deployInterval / this.speedMultiplier;
            if (this.deployTimer <= 0) {
                if (this._deployTargetedZone(player, waveManager)) {
                    this.deployTimer = effectiveCooldown;
                }
            } else if (this.deployTimer > 0) {
                this.deployTimer -= dt;
            }
        }

        for (let i = this.activeZones.length - 1; i >= 0; i--) {
            const zone = this.activeZones[i];
            if (!zone.active) {
                this.activeZones.splice(i, 1);
                continue;
            }

            // 오라형은 플레이어 위치 추적
            if (zone.followPlayer) {
                zone.x = player.x;
                zone.y = player.y;
            }

            // 틱/즉시 데미지 처리
            if (this.type === 'Grenade') {
                // 수류탄: 지속 시간 동안 범위 내 적에게 즉시 1회 피해
                this._applyInstantDamage(zone, player, waveManager);
            } else {
                // 오라형 등 기존 틱 방식
                zone.tickTimer -= dt;
                if (zone.tickTimer <= 0) {
                    zone.tickTimer = zone.tickInterval;
                    this._applyTickDamage(zone, player, waveManager);
                }
            }

            // 지속 시간 처리 (영구 장판은 duration = -1)
            if (zone.duration > 0) {
                zone.duration -= dt;
                if (zone.duration <= 0) {
                    zone.active = false;
                }
            }
        }
    }

    _applyInstantDamage(zone, player, waveManager) {
        const damage = zone.damage;
        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active || zone.hitEnemies.includes(enemy)) continue;

            const dx = enemy.x - zone.x;
            const dy = enemy.y - zone.y;
            const rSum = zone.radius + enemy.radius;
            if (dx * dx + dy * dy <= rSum * rSum) {
                enemy.takeDamage(damage);
                zone.hitEnemies.push(enemy);
            }
        }
    }

    _deployTargetedZone(player, waveManager) {
        let tx = player.x + (Math.random() - 0.5) * 300;
        let ty = player.y + (Math.random() - 0.5) * 300;

        let minDistSq = Infinity;
        let foundTarget = false;
        const maxDistSq = 800 * 800; // Screen-wide range

        for (const e of waveManager.activeEnemies) {
            if (!e.active) continue;
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dSq = dx * dx + dy * dy;

            if (dSq > maxDistSq) continue;

            if (dSq < minDistSq) {
                minDistSq = dSq;
                tx = e.x;
                ty = e.y;
                foundTarget = true;
            }
        }

        if (!foundTarget) return false;

        const zone = new ActiveZone();
        zone.active = true;
        zone.x = tx;
        zone.y = ty;
        zone.radius = this.zoneRadius;
        zone.duration = this.zoneDuration;
        zone.tickTimer = 0;             // 배치 즉시 첫 틱 발동
        zone.tickInterval = this.tickInterval;
        zone.damage = this.baseDamage + player.attackPower;
        zone.followPlayer = false;
        zone.color = 'rgba(255,100,0,0.6)'; // 폭발이므로 좀 더 진하게
        zone.hitEnemies = [];
        this.activeZones.push(zone);

        // 폭발 애니메이션 생성: 장판 반지름 × 2 크기로 스폰
        // player.game이 존재할 때만 호출하여 방어적으로 처리
        if (player.game) {
            player.game.spawnExplosion(tx, ty, this.zoneRadius * 2);
        }

        return true;
    }

    _applyTickDamage(zone, player, waveManager) {
        const damage = zone.followPlayer
            ? this.baseDamage + player.attackPower
            : zone.damage;

        const textColor = zone.followPlayer ? '#a855f7' : '#f97316';

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;
            const dx = enemy.x - zone.x;
            const dy = enemy.y - zone.y;
            const rSum = zone.radius + enemy.radius;
            if (dx * dx + dy * dy <= rSum * rSum) {
                enemy.takeDamage(damage);
            }
        }
    }

    draw(ctx) {
        for (const zone of this.activeZones) {
            if (!zone.active) continue;

            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.fillStyle = zone.color;
            ctx.fill();

            // 테두리
            ctx.strokeStyle = zone.followPlayer
                ? 'rgba(138,43,226,0.7)'
                : 'rgba(255,100,0,0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}
