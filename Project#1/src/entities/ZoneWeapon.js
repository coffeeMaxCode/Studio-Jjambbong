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

        if (type === 'Grenade') {
            this.deployTimer = 0;       // 0이면 즉시 첫 배치
            this.deployInterval = 3.0;  // 3초마다 새 장판 배치
            this.zoneRadius = 70;
            this.zoneDuration = 3.0;
            this.baseDamage = 15;
            this.tickInterval = 0.5;
        } else {
            // Radiation (오라형): 즉시 영구 장판 생성
            this.zoneRadius = 80;
            this.baseDamage = 8;
            this.tickInterval = 0.5;

            const aura = new ActiveZone();
            aura.active = true;
            aura.radius = this.zoneRadius;
            aura.duration = -1;
            aura.tickInterval = this.tickInterval;
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
            this.baseDamage += 10;
            this.zoneRadius += 20; 
            this.tickInterval *= 0.9;
        } else {
            this.baseDamage += 5;
            this.zoneRadius += 30; 
            this.tickInterval *= 0.9;
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
            this.deployTimer -= dt;
            const effectiveCooldown = this.deployInterval / this.speedMultiplier;
            if (this.deployTimer <= 0) {
                this._deployTargetedZone(player, waveManager);
                this.deployTimer = effectiveCooldown;
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

            // 틱 데미지: 0.5초마다 범위 내 모든 적에게 피해
            zone.tickTimer -= dt;
            if (zone.tickTimer <= 0) {
                zone.tickTimer = zone.tickInterval;
                this._applyTickDamage(zone, player, waveManager);
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

    _deployTargetedZone(player, waveManager) {
        // 가장 가까운 적 위치에 배치, 없으면 플레이어 주변 랜덤
        let tx = player.x + (Math.random() - 0.5) * 300;
        let ty = player.y + (Math.random() - 0.5) * 300;

        let minDistSq = Infinity;
        for (const e of waveManager.activeEnemies) {
            if (!e.active) continue;
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dSq = dx*dx + dy*dy;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                tx = e.x;
                ty = e.y;
            }
        }

        const zone = new ActiveZone();
        zone.active = true;
        zone.x = tx;
        zone.y = ty;
        zone.radius = this.zoneRadius;
        zone.duration = this.zoneDuration;
        zone.tickTimer = 0;             // 배치 즉시 첫 틱 발동
        zone.tickInterval = this.tickInterval;
        zone.damage = this.baseDamage + Math.floor(player.attackPower);
        zone.followPlayer = false;
        zone.color = 'rgba(255,100,0,0.35)';
        this.activeZones.push(zone);
    }

    _applyTickDamage(zone, player, waveManager) {
        const damage = zone.followPlayer
            ? this.baseDamage + Math.floor(player.attackPower * 0.5)
            : zone.damage;

        const textColor = zone.followPlayer ? '#a855f7' : '#f97316';

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;
            const dx = enemy.x - zone.x;
            const dy = enemy.y - zone.y;
            if (dx*dx + dy*dy <= zone.radius * zone.radius) {
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
