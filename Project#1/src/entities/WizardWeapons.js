// ════════════════════════════════════════════════════════════════════════════
// WizardWeapons.js — 마법사 직업 전용 무기 시스템
//
//  EnergyBoltWeapon  : 가로 빔 채널링 무기 (25레벨 구간)
//  FireballWeapon    : 세로 낙하 멀티타겟 무기 (25레벨 구간)
//
// wizard_motion.png 스프라이트시트 (4열 × 2행 = 8프레임)
//  [0][1][2][3]  idle / ready / channeling light / channeling heavy
//  [4][5][6][7]  casting / full cast / post-cast / idle2
// ════════════════════════════════════════════════════════════════════════════

// ── 전기 번개 경로 생성 (fractal subdivision) ─────────────────────────────
function _genLightning(x1, y1, x2, y2, depth, roughness) {
    if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1,       dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = (Math.random() - 0.5) * len * roughness;
    const nx = -dy / len, ny = dx / len;
    const midX = mx + nx * offset, midY = my + ny * offset;
    const left  = _genLightning(x1, y1, midX, midY, depth - 1, roughness * 0.85);
    const right = _genLightning(midX, midY, x2, y2, depth - 1, roughness * 0.85);
    return [...left.slice(0, -1), ...right];
}

// ── FallingFireball — 낙하 파이어볼 시각 오브젝트 ────────────────────────
class FallingFireball {
    constructor(targetX, targetY, img, size, damage, hasSplash, splashRadius,
                hasBurn, burnDmg, burnDuration, onImpact) {
        this.startY      = targetY - 300;
        this.x           = targetX;
        this.y           = this.startY;
        this.targetX     = targetX;
        this.targetY     = targetY;
        this.img         = img;
        this.size        = size;
        this.damage      = damage;
        this.hasSplash   = hasSplash;
        this.splashRadius = splashRadius;
        this.hasBurn     = hasBurn;
        this.burnDmg     = burnDmg;
        this.burnDuration = burnDuration;
        this.onImpact    = onImpact; // callback(x,y,damage)
        this.duration    = 0.45;
        this.timer       = this.duration;
        this.active      = true;
        this.impacted    = false;
        // 충격파 애니메이션
        this.impactTimer = 0;
        this.impactRadius = 0;
    }

    update(dt) {
        if (this.impacted) {
            this.impactTimer -= dt;
            if (this.impactTimer <= 0) this.active = false;
            return;
        }
        this.timer -= dt;
        const t = 1 - Math.max(0, this.timer / this.duration);
        // 이징: 천천히 시작해서 빠르게 낙하 (cubic ease-in)
        const eased = t * t * t;
        this.y = this.startY + (this.targetY - this.startY) * eased;

        if (this.timer <= 0) {
            this.y        = this.targetY;
            this.impacted = true;
            this.impactTimer = 0.42;
            if (this.onImpact) this.onImpact(this.x, this.y, this.damage);
        }
    }

    draw(ctx) {
        if (!this.active) return;
        const s = this.size;

        // 낙하 예고선 (떨어질 위치 표시)
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.targetX, this.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 낙하 타겟 원
        if (!this.impacted) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, s * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 파이어볼 본체
        if (!this.impacted) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (this.duration - this.timer) / 0.15 + 0.3);
            if (this.img && this.img.complete && this.img.naturalWidth > 0) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#e67e22';
                ctx.translate(this.x, this.y);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(this.img, -s / 2, -s / 2, s, s);
                ctx.rotate(-Math.PI / 2);
                ctx.translate(-this.x, -this.y);
            } else {
                // 폴백: 주황 글로우 원
                ctx.beginPath();
                ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, s / 2);
                g.addColorStop(0, '#fff3cd');
                g.addColorStop(0.5, '#e67e22');
                g.addColorStop(1, 'rgba(231,76,60,0)');
                ctx.fillStyle = g;
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#e74c3c';
                ctx.fill();
            }
            ctx.restore();
        }

        // 충격 애니메이션
        if (this.impacted && this.impactTimer > 0) {
            const progress = Math.max(0, Math.min(1, 1 - (this.impactTimer / 0.4)));
            const r = Math.max(1, (this.hasSplash ? this.splashRadius : s * 0.8) * progress);
            ctx.save();
            ctx.globalAlpha = (1 - progress) * 0.7;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, r, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(this.targetX, this.targetY, 0,
                                               this.targetX, this.targetY, r);
            g.addColorStop(0, 'rgba(255,200,50,0.9)');
            g.addColorStop(0.5, 'rgba(231,76,60,0.6)');
            g.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#e74c3c';
            ctx.fill();
            ctx.restore();
        }
    }
}

// ── MeteorStrike — 메테오 낙하 오브젝트 ─────────────────────────────────
class MeteorStrike {
    constructor(targetX, targetY, img, damage, radius, onImpact) {
        this.targetX  = targetX;
        this.targetY  = targetY;
        this.x        = targetX + (Math.random() - 0.5) * 80;
        this.y        = -150;
        this.img      = img;
        this.damage   = damage;
        this.radius   = radius;
        this.onImpact = onImpact;
        this.size     = 120;
        this.duration = 1.4;
        this.timer    = this.duration;
        this.active   = true;
        this.impacted = false;
        this.impactTimer = 0;
    }

    update(dt) {
        if (this.impacted) {
            this.impactTimer -= dt;
            if (this.impactTimer <= 0) this.active = false;
            return;
        }
        this.timer -= dt;
        const t = 1 - Math.max(0, this.timer / this.duration);
        const eased = t * t;
        this.y = -150 + (this.targetY + 150) * eased;
        if (this.timer <= 0) {
            this.y = this.targetY;
            this.impacted = true;
            this.impactTimer = 0.6;
            if (this.onImpact) this.onImpact(this.x, this.y, this.damage, this.radius);
        }
    }

    draw(ctx) {
        if (!this.active) return;
        const s = this.size;

        // 경고 원
        if (!this.impacted) {
            const progress = 1 - Math.max(0, this.timer / this.duration);
            ctx.save();
            ctx.globalAlpha = progress * 0.4;
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, this.radius * progress, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 메테오 본체
        if (!this.impacted) {
            ctx.save();
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#e74c3c';
            if (this.img && this.img.complete && this.img.naturalWidth > 0) {
                ctx.drawImage(this.img, this.x - s / 2, this.y - s / 2, s, s);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, s / 2);
                g.addColorStop(0, '#f9e79f');
                g.addColorStop(0.4, '#e67e22');
                g.addColorStop(1, '#c0392b');
                ctx.fillStyle = g;
                ctx.fill();
            }
            ctx.restore();
        }

        // 충격 폭발
        if (this.impacted) {
            const p = 1 - (this.impactTimer / 0.6);
            ctx.save();
            ctx.globalAlpha = (1 - p) * 0.85;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, this.radius * (0.2 + p * 0.8), 0, Math.PI * 2);
            const g = ctx.createRadialGradient(this.targetX, this.targetY, 0,
                                               this.targetX, this.targetY, this.radius);
            g.addColorStop(0, 'rgba(255,220,50,1)');
            g.addColorStop(0.4, 'rgba(231,76,60,0.8)');
            g.addColorStop(1, 'rgba(192,57,43,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = 60;
            ctx.shadowColor = '#e74c3c';
            ctx.fill();
            ctx.restore();
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EnergyBoltWeapon — 채널링 빔 무기
// ════════════════════════════════════════════════════════════════════════════
class EnergyBoltWeapon {
    constructor() {
        this.type  = 'EnergyBolt';
        this.level = 1;
        this.baseDamage  = 10;
        this.bonusPower  = 0;
        this.speedMultiplier = 1.0;

        // ── 상태 머신 ──────────────────────────────────────────────────
        this.state           = 'idle';      // 'idle' | 'channeling' | 'firing'
        this.cooldownTimer   = 0;
        this.cooldown        = 0.5;
        this.channelTimer    = 0;
        this.channelDuration = 0.5;
        this.fireTimer       = 0;
        this.fireDuration    = 1.0;

        // ── 빔 형태 ────────────────────────────────────────────────────
        this.beamLength = 620;             // X축 사거리
        this.beamHeight = 22;              // Y축 폭
        this.beamAngle  = 0;              // 고정된 발사 방향 (라디안)

        // ── 데미지 틱 ──────────────────────────────────────────────────
        this.tickInterval = 0.22;
        this.tickTimer    = 0;
        this.hitThisTick  = new Set();

        // ── 레벨 게이트 기능 ───────────────────────────────────────────
        this.hasElectricSpark = false;    // lv15
        this.noCooldown       = false;    // lv20
        this.tripleBeam       = false;    // lv25

        // ── 시각 상태 ──────────────────────────────────────────────────
        this.beamAlpha    = 0;
        this.flickerVal   = 1;
        this.flickerTimer = 0;
        this.sparkChains  = [];          // { x1,y1,x2,y2, life, maxLife }

        // ── 스프라이트 ────────────────────────────────────────────────
        this.cannonImg = new Image();
        this.cannonImg.src = 'src/img/energy_canon.png';

        // ── 내부 레퍼런스 저장 ────────────────────────────────────────
        this._px = 0;
        this._py = 0;

        // 아이들 애니메이션
        this._idleFrameTimer = 0;
        this._idleFrameIdx   = 0;         // 0=frame0, 1=frame7
        this._castFlashTimer = 0;
    }

    // ── 레벨업 ──────────────────────────────────────────────────────────
    upgrade() {
        this.level++;
        this.bonusPower += 4;
        if (this.level === 5)  this.beamHeight = Math.round(this.beamHeight * 1.5);
        if (this.level === 10) this.beamLength = Math.round(this.beamLength * 1.3);
        if (this.level === 15) this.hasElectricSpark = true;
        if (this.level === 20) {
            this.channelDuration = Math.max(0.1, this.channelDuration * 0.5);
            this.fireDuration    = 2.0;
            this.noCooldown      = true;
            this.cooldown        = 0;
        }
        if (this.level === 25) this.tripleBeam = true;
    }

    // ── 플레이어 애니메이션 프레임 ────────────────────────────────────
    get _animFrame() {
        if (this.state === 'channeling') return 3;       // 묵직한 차징
        if (this.state === 'firing') {
            // 빠른 오실레이션 4↔5
            return (Math.floor(this.fireTimer / 0.12) % 2 === 0) ? 4 : 5;
        }
        // 아이들: 0↔7 천천히
        return this._idleFrameIdx === 0 ? 0 : 7;
    }

    // ── 메인 업데이트 ──────────────────────────────────────────────────
    update(dt, player, waveManager) {
        this._px = player.x;
        this._py = player.y;
        player.charFrame = this._animFrame;

        // 깜빡임 효과
        this.flickerTimer -= dt;
        if (this.flickerTimer <= 0) {
            this.flickerTimer = 0.04 + Math.random() * 0.06;
            this.flickerVal   = 0.8 + Math.random() * 0.2;
        }

        // 아이들 애니메이션 타이머
        this._idleFrameTimer -= dt;
        if (this._idleFrameTimer <= 0) {
            this._idleFrameTimer = 0.55;
            this._idleFrameIdx   = 1 - this._idleFrameIdx;
        }

        // 스파크 체인 수명 감소
        for (let i = this.sparkChains.length - 1; i >= 0; i--) {
            this.sparkChains[i].life -= dt;
            if (this.sparkChains[i].life <= 0) this.sparkChains.splice(i, 1);
        }

        switch (this.state) {
            case 'idle':
                this.beamAlpha = 0;
                this.cooldownTimer -= dt;
                if (this.cooldownTimer <= 0) {
                    const target = this._resolveTarget(player, waveManager);
                    if (target) {
                        this._lockAngle(player, target);
                        this.state        = 'channeling';
                        this.channelTimer = this.channelDuration;
                    }
                }
                break;

            case 'channeling': {
                this.channelTimer -= dt;
                // 채널링 중에도 방향 추적
                const tgt = this._resolveTarget(player, waveManager);
                if (tgt) this._lockAngle(player, tgt);
                if (this.channelTimer <= 0) {
                    this.state       = 'firing';
                    this.fireTimer   = this.fireDuration;
                    this.tickTimer   = 0;
                    this.beamAlpha   = 1;
                    this.hitThisTick.clear();
                }
                break;
            }

            case 'firing':
                this.fireTimer -= dt;
                this.beamAlpha  = Math.max(0, this.fireTimer / this.fireDuration);

                // 발사 중에도 마우스 방향 추적
                const fTgt = this._resolveTarget(player, waveManager);
                if (fTgt) this._lockAngle(player, fTgt);

                // 데미지 틱
                this.tickTimer -= dt;
                if (this.tickTimer <= 0) {
                    this.tickTimer = this.tickInterval;
                    this.hitThisTick.clear();
                    this._applyDamage(player, waveManager);
                }

                if (this.fireTimer <= 0) {
                    this.state         = 'idle';
                    this.cooldownTimer = this.noCooldown ? 0 : this.cooldown;
                    this.beamAlpha     = 0;
                    this.sparkChains   = [];
                }
                break;
        }
    }

    _resolveTarget(player, waveManager) {
        // 마우스 우선
        if (player.game && player.game.mouseX !== undefined) {
            return { x: player.game.mouseX, y: player.game.mouseY };
        }
        // auto-aim OFF → facing 방향 가상 타겟
        if (player.game && !player.game.autoAimEnabled) {
            return { x: player.x + player.facingX * 600, y: player.y + player.facingY * 600 };
        }
        // auto-aim ON → 최근접 적
        let nearest = null, minDSq = Infinity;
        for (const e of waveManager.activeEnemies) {
            if (!e.active) continue;
            const dx = e.x - player.x, dy = e.y - player.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDSq) { minDSq = dSq; nearest = e; }
        }
        return nearest || { x: player.x + player.facingX * 600, y: player.y + player.facingY * 600 };
    }

    _lockAngle(player, target) {
        this.beamAngle = Math.atan2(target.y - player.y, target.x - player.x);
    }

    _applyDamage(player, waveManager) {
        const dmg = this.baseDamage + this.bonusPower + player.attackPower;
        const cos  = Math.cos(this.beamAngle);
        const sin  = Math.sin(this.beamAngle);

        const beams = [{ angle: this.beamAngle }];
        if (this.tripleBeam) {
            beams.push({ angle: this.beamAngle + Math.PI / 4 });
            beams.push({ angle: this.beamAngle - Math.PI / 4 });
        }

        for (const { angle } of beams) {
            const c = Math.cos(angle), s = Math.sin(angle);
            for (const enemy of waveManager.activeEnemies) {
                if (!enemy.active || this.hitThisTick.has(enemy)) continue;
                if (this._isInBeam(enemy, this._px, this._py, c, s)) {
                    enemy.takeDamage(dmg);
                    this.hitThisTick.add(enemy);
                    if (this.hasElectricSpark) this._spark(enemy, waveManager, dmg * 0.5);
                }
            }
        }
    }

    _isInBeam(enemy, px, py, cos, sin) {
        const dx = enemy.x - px, dy = enemy.y - py;
        // 빔 로컬 좌표 변환
        const localX =  dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        return localX > -5 &&
               localX < this.beamLength &&
               Math.abs(localY) < (this.beamHeight / 2 + enemy.radius);
    }

    // ── 전기 스파크 (lv15) ────────────────────────────────────────────
    _spark(source, waveManager, damage) {
        let chained = 0;
        const chainR = 160;
        for (const e of waveManager.activeEnemies) {
            if (!e.active || e === source || chained >= 3) continue;
            if (this.hitThisTick.has(e)) continue;
            const dx = e.x - source.x, dy = e.y - source.y;
            if (dx * dx + dy * dy < chainR * chainR) {
                e.takeDamage(damage);
                this.hitThisTick.add(e);
                this.sparkChains.push({
                    x1: source.x, y1: source.y,
                    x2: e.x,      y2: e.y,
                    life: 0.18,   maxLife: 0.18
                });
                chained++;
            }
        }
    }

    // ── 렌더링 ────────────────────────────────────────────────────────
    draw(ctx) {
        if (this.state === 'firing' && this.beamAlpha > 0.01) {
            const alpha = this.beamAlpha * this.flickerVal;
            this._drawBeam(ctx, this._px, this._py, this.beamAngle, alpha, 1.0);
            if (this.tripleBeam) {
                this._drawBeam(ctx, this._px, this._py, this.beamAngle + Math.PI / 4, alpha * 0.75, 0.8);
                this._drawBeam(ctx, this._px, this._py, this.beamAngle - Math.PI / 4, alpha * 0.75, 0.8);
            }
        }
        // 채널링 차징 이펙트
        if (this.state === 'channeling') {
            this._drawChannelCharge(ctx);
        }
        // 전기 스파크 시각화
        for (const sp of this.sparkChains) {
            this._drawLightning(ctx, sp.x1, sp.y1, sp.x2, sp.y2, sp.life / sp.maxLife);
        }
    }

    _drawBeam(ctx, px, py, angle, alpha, scale) {
        const len = this.beamLength * scale;
        const hw  = this.beamHeight / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.rotate(angle);

        // 바깥 글로우 — 수직 방향 그라데이션으로 사각형 엣지 제거
        const outerGrad = ctx.createLinearGradient(0, -hw * 4, 0, hw * 4);
        outerGrad.addColorStop(0,    'rgba(140,200,255,0)');
        outerGrad.addColorStop(0.15, 'rgba(140,200,255,0.45)');
        outerGrad.addColorStop(0.5,  'rgba(100,170,255,0.65)');
        outerGrad.addColorStop(0.85, 'rgba(140,200,255,0.45)');
        outerGrad.addColorStop(1,    'rgba(140,200,255,0)');
        ctx.fillStyle   = outerGrad;
        ctx.shadowBlur  = 50;
        ctx.shadowColor = '#7ec8e3';
        ctx.fillRect(0, -hw * 4, len * 0.92, hw * 8);

        // 중간 빔 코어
        const midGrad = ctx.createLinearGradient(0, 0, len, 0);
        midGrad.addColorStop(0,   'rgba(200,230,255,0.95)');
        midGrad.addColorStop(0.5, 'rgba(120,190,255,0.8)');
        midGrad.addColorStop(1,   'rgba(60,140,255,0)');
        ctx.fillStyle   = midGrad;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = '#a8d8ea';
        ctx.fillRect(0, -hw, len, hw * 2);

        // 중심 흰색 코어
        const whiteGrad = ctx.createLinearGradient(0, 0, len * 0.65, 0);
        whiteGrad.addColorStop(0,   'rgba(255,255,255,0.95)');
        whiteGrad.addColorStop(0.7, 'rgba(220,240,255,0.6)');
        whiteGrad.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle   = whiteGrad;
        ctx.shadowBlur  = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fillRect(0, -hw * 0.45, len * 0.65, hw * 0.9);

        // 랜덤 전기 잔물결
        if (Math.random() < 0.4) {
            const rippleX = Math.random() * len * 0.8;
            const rippleY = (Math.random() - 0.5) * hw * 3;
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = 'rgba(200,230,255,0.7)';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, hw * 0.5 + Math.random() * hw, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // energy_canon.png 이미지 오버레이
        if (this.cannonImg.complete && this.cannonImg.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(px, py);
            ctx.rotate(angle);
            const imgH = 44;
            const imgW = this.cannonImg.naturalWidth / this.cannonImg.naturalHeight * imgH;
            ctx.drawImage(this.cannonImg, 0, -imgH / 2, imgW, imgH);
            ctx.restore();
        }
    }

    _drawChannelCharge(ctx) {
        // 마법사 주위 원형 에너지 집중 이펙트
        const t = 1 - (this.channelTimer / this.channelDuration);
        const r = 30 + t * 20;
        ctx.save();
        ctx.globalAlpha = t * 0.7;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = '#7ec8e3';
        ctx.strokeStyle = '#a8d8ea';
        ctx.lineWidth   = 2 + t * 2;
        ctx.beginPath();
        ctx.arc(this._px, this._py, r, 0, Math.PI * 2);
        ctx.stroke();
        // 내부 파티클 효과
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.channelTimer * 3;
            const pr = r * 0.6;
            ctx.globalAlpha = t * 0.5;
            ctx.fillStyle   = '#c8e6ff';
            ctx.beginPath();
            ctx.arc(this._px + Math.cos(angle) * pr,
                    this._py + Math.sin(angle) * pr, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawLightning(ctx, x1, y1, x2, y2, lifePct) {
        const pts = _genLightning(x1, y1, x2, y2, 3, 0.55);
        // 외곽 글로우
        ctx.save();
        ctx.globalAlpha = lifePct * 0.7;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = '#7ec8e3';
        ctx.strokeStyle = '#9fd3ee';
        ctx.lineWidth   = 3;
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        // 흰 중심선
        ctx.strokeStyle = '#e8f6ff';
        ctx.lineWidth   = 1.2;
        ctx.shadowBlur  = 4;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
    }
}

// ════════════════════════════════════════════════════════════════════════════
// FireballWeapon — 수직 낙하 멀티타겟 무기
// ════════════════════════════════════════════════════════════════════════════
class FireballWeapon {
    constructor() {
        this.type  = 'Fireball';
        this.level = 1;
        this.baseDamage  = 18;
        this.bonusPower  = 0;
        this.speedMultiplier = 1.0;

        // ── 상태 머신 ──────────────────────────────────────────────────
        this.state           = 'idle';   // 'idle' | 'channeling' | 'cooldown'
        this.cooldownTimer   = 0;
        this.cooldown        = 2.0;
        this.channelTimer    = 0;
        this.channelDuration = 0.5;

        // ── 멀티 타겟 ──────────────────────────────────────────────────
        this.targetCount  = 5;
        this.fireballSize = 104;

        // ── 레벨 게이트 기능 ───────────────────────────────────────────
        this.hasSplash    = false;   // lv10
        this.splashRadius = 23;
        this.hasBurn      = false;   // lv15
        this.burnDmgSec   = 5.0;     // 틱당 화상 데미지
        this.burnDuration = 20.0;    // 화상 지속 시간
        this.burnSpread   = false;   // 주변 전파
        this.meteorCooldown    = 0;
        this.meteorCooldownMax = 3.0;

        // ── 번 DoT 추적 ──────────────────────────────────────────────
        // [{enemy, timer, damage}]  — active burn states
        this.burnList = [];

        // ── 시각 오브젝트 ─────────────────────────────────────────────
        this.activeFalls   = [];   // FallingFireball[]
        this.activeMeteors = [];   // MeteorStrike[]

        // ── 이미지 ────────────────────────────────────────────────────
        this.fireballImg = new Image();
        this.fireballImg.src = 'src/img/fireball.png';
        this.meteorImg   = new Image();
        this.meteorImg.src = 'src/img/meteo.png';

        // ── 아이들 / 시전 애니메이션 ──────────────────────────────────
        this._idleFrames    = [7, 1];
        this._idleIdx       = 0;
        this._idleTimer     = 0;
        this._strikeFlash   = 0;

        // ── 위치 캐시 (draw에서 사용) ─────────────────────────────────
        this._cachedPx = 0;
        this._cachedPy = 0;
    }

    // ── 레벨업 ──────────────────────────────────────────────────────────
    upgrade() {
        this.level++;
        this.bonusPower += 5;
        if (this.level === 5)  this.targetCount = Math.ceil(this.targetCount * 2);
        if (this.level === 10) { this.hasSplash = true; }
        if (this.level === 15) {
            this.channelDuration = 0.1;
            this.hasBurn         = true;
            this.burnSpread      = true;
        }
        if (this.level === 20) this.targetCount = Math.ceil(this.targetCount * 1.3);
        if (this.level === 25) { /* meteor 활성 - _tryMeteor()에서 확인 */ }
    }

    // ── 플레이어 애니메이션 프레임 ────────────────────────────────────
    get _animFrame() {
        if (this.state === 'channeling') return 2;                  // 손을 올리는 포즈
        if (this._strikeFlash > 0) return 4;                       // 시전 순간 flash
        return this._idleFrames[this._idleIdx];                    // 7 ↔ 1
    }

    // ── 메인 업데이트 ──────────────────────────────────────────────────
    update(dt, player, waveManager) {
        this._cachedPx = player.x;
        this._cachedPy = player.y;
        player.charFrame = this._animFrame;

        // 스트라이크 플래시 카운트다운
        if (this._strikeFlash > 0) this._strikeFlash -= dt;

        // 아이들 애니메이션
        this._idleTimer -= dt;
        if (this._idleTimer <= 0 && this.state !== 'channeling') {
            this._idleTimer = 0.65;
            this._idleIdx   = 1 - this._idleIdx;
        }

        // 번 DoT 처리
        this._updateBurns(dt, player);

        // 낙하 파이어볼 업데이트
        for (let i = this.activeFalls.length - 1; i >= 0; i--) {
            const f = this.activeFalls[i];
            f.update(dt);
            if (!f.active) this.activeFalls.splice(i, 1);
        }

        // 메테오 업데이트
        for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
            const m = this.activeMeteors[i];
            m.update(dt);
            if (!m.active) this.activeMeteors.splice(i, 1);
        }

        // 메테오 쿨타임
        if (this.meteorCooldown > 0) this.meteorCooldown -= dt;

        switch (this.state) {
            case 'idle':
                this.cooldownTimer -= dt;
                if (this.cooldownTimer <= 0) {
                    // 적이 존재할 때만 시전 시작
                    const hasEnemies = waveManager.activeEnemies.some(e => e.active);
                    if (hasEnemies) {
                        this.state        = 'channeling';
                        this.channelTimer = this.channelDuration;
                    }
                }
                break;

            case 'channeling':
                this.channelTimer -= dt;
                if (this.channelTimer <= 0) {
                    this._strike(player, waveManager);
                    this._strikeFlash    = 0.15;
                    this.state           = 'idle';
                    this.cooldownTimer   = this.cooldown;
                }
                break;
        }
    }

    // ── 시전: 낙하 파이어볼 생성 ─────────────────────────────────────
    _strike(player, waveManager) {
        const dmg = this.baseDamage + this.bonusPower + player.attackPower;

        // 가장 가까운 순으로 targetCount 적 선택
        const sorted = waveManager.activeEnemies
            .filter(e => e.active)
            .map(e => {
                const dx = e.x - player.x, dy = e.y - player.y;
                return { enemy: e, dist: dx * dx + dy * dy };
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, this.targetCount);

        for (const { enemy } of sorted) {
            const fb = new FallingFireball(
                enemy.x, enemy.y,
                this.fireballImg, this.fireballSize,
                dmg,
                this.hasSplash, this.splashRadius,
                this.hasBurn, this.burnDmgSec, this.burnDuration,
                (x, y, damage) => this._onImpact(x, y, damage, player, waveManager, enemy)
            );
            this.activeFalls.push(fb);
        }

        // 메테오 (lv25, 30% 확률)
        if (this.level >= 25 && this.meteorCooldown <= 0 && Math.random() < 0.3) {
            this._tryMeteor(player, waveManager);
        }
    }

    _onImpact(x, y, damage, player, waveManager, primaryEnemy) {
        // 직접 데미지는 FallingFireball 생성 시 전달된 대상에게만
        if (primaryEnemy && primaryEnemy.active) {
            primaryEnemy.takeDamage(damage);

            // 화상 적용 (lv15)
            if (this.hasBurn) {
                this._applyBurn(primaryEnemy, player);
            }
        }

        // 스플래시 (lv10)
        if (this.hasSplash) {
            for (const e of waveManager.activeEnemies) {
                if (!e.active || e === primaryEnemy) continue;
                const dx = e.x - x, dy = e.y - y;
                if (dx * dx + dy * dy < this.splashRadius * this.splashRadius) {
                    e.takeDamage(damage * 0.5);
                    if (this.hasBurn) this._applyBurn(e, player);
                }
            }
        }
    }

    // ── 화상 DoT ─────────────────────────────────────────────────────
    _applyBurn(enemy, player) {
        // 이미 타고 있으면 타이머 갱신
        const existing = this.burnList.find(b => b.enemy === enemy);
        if (existing) {
            existing.timer = this.burnDuration;
            return;
        }
        this.burnList.push({ enemy, timer: this.burnDuration, tickTimer: 0.1 });
    }

    _updateBurns(dt, player) {
        for (let i = this.burnList.length - 1; i >= 0; i--) {
            const b = this.burnList[i];
            if (!b.enemy.active) { this.burnList.splice(i, 1); continue; }
            b.timer -= dt;
            if (b.timer <= 0) { this.burnList.splice(i, 1); continue; }
            // 초당 데미지 틱
            b.tickTimer -= dt;
            if (b.tickTimer <= 0) {
                b.tickTimer = 0.1;
                b.enemy.takeDamage(this.burnDmgSec + player.attackPower * 0.3);
            }
        }
    }

    // ── 메테오 (lv25) ─────────────────────────────────────────────────
    _tryMeteor(player, waveManager) {
        // 적들의 중심으로 낙하
        const active = waveManager.activeEnemies.filter(e => e.active);
        if (active.length === 0) return;
        const cx = active.reduce((s, e) => s + e.x, 0) / active.length;
        const cy = active.reduce((s, e) => s + e.y, 0) / active.length;
        const meteoDmg = (this.baseDamage + this.bonusPower + player.attackPower) * 3;
        const meteoR   = 200;

        const meteor = new MeteorStrike(cx, cy, this.meteorImg, meteoDmg, meteoR,
            (mx, my, dmg, radius) => {
                for (const e of waveManager.activeEnemies) {
                    if (!e.active) continue;
                    const dx = e.x - mx, dy = e.y - my;
                    if (dx * dx + dy * dy < radius * radius) {
                        e.takeDamage(dmg);
                        if (this.hasBurn) this._applyBurn(e, player);
                    }
                }
                if (player.game) player.game.spawnExplosion(mx, my, radius * 2.2);
            }
        );
        this.activeMeteors.push(meteor);
        this.meteorCooldown = this.meteorCooldownMax;
    }

    // ── 렌더링 ────────────────────────────────────────────────────────
    draw(ctx) {
        // 채널링 이펙트
        if (this.state === 'channeling') {
            this._drawChannelEffect(ctx);
        }

        // 낙하 파이어볼들
        for (const fb of this.activeFalls)   fb.draw(ctx);
        for (const mt of this.activeMeteors) mt.draw(ctx);

        // 화상 상태 표시 (타오르는 주황 링)
        this._drawBurnIndicators(ctx);
    }

    _drawChannelEffect(ctx) {
        const t = 1 - (this.channelTimer / this.channelDuration);
        // 하늘에서 모이는 에너지 파티클 4개
        for (let i = 0; i < 5; i++) {
            const angle  = (i / 5) * Math.PI * 2 - this.channelTimer * 4;
            const dist   = 60 - t * 40;
            const px     = this._cachedPx + Math.cos(angle) * dist;
            const py     = this._cachedPy + Math.sin(angle) * dist - 20;
            ctx.save();
            ctx.globalAlpha = t * 0.8;
            ctx.fillStyle   = '#ff8c00';
            ctx.shadowBlur  = 15;
            ctx.shadowColor = '#e74c3c';
            ctx.beginPath();
            ctx.arc(px, py, 5 + t * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawBurnIndicators(ctx) {
        if (this.burnList.length === 0) return;
        const time = performance.now() / 1000;
        for (const b of this.burnList) {
            if (!b.enemy.active) continue;
            const progress = b.timer / this.burnDuration;
            ctx.save();
            ctx.globalAlpha = progress * 0.6;
            ctx.strokeStyle = `rgba(255,${Math.floor(100 + Math.sin(time * 8) * 50)},0,1)`;
            ctx.lineWidth   = 2;
            ctx.shadowBlur  = 8;
            ctx.shadowColor = '#e67e22';
            ctx.beginPath();
            ctx.arc(b.enemy.x, b.enemy.y, b.enemy.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

}
