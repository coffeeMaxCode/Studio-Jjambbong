/**
 * SwordAura — 검기(劍氣) 투사체
 *
 * Projectile 베이스 클래스를 확장합니다.
 *
 * [방향 로직 — 방사형(Radial) 보정]
 *   drawAngle = atan2(originY - aura.y, originX - aura.x)
 *   → 이미지의 오목면(+x 방향)이 항상 스폰 원점(캐릭터)을 향함
 *   → 투사체가 어느 방향으로 이동하든 오목면이 캐릭터 쪽을 유지
 *
 * [강화 단계별 기능]
 *   Lv1 : 기본 검기. 쿨타임 2초, 무한 관통, 대검 데미지 × 3
 *   Lv2 : 반대 방향 추가 검기 (Game에서 2발 스폰)
 *   Lv3 : 거리 비례 크기·히트박스 성장 (growWithDistance 플래그)
 *   Lv4+: 크리티컬 확률 (critChance) 적용
 */
class SwordAura extends Projectile {

    // ── 정적 이미지 캐시 ────────────────────────────────────────────────
    static _img      = null;
    static _imgReady = false;

    static _loadImage() {
        if (SwordAura._img) return;
        SwordAura._img = new Image();
        SwordAura._img.onload = () => { SwordAura._imgReady = true; };
        SwordAura._img.src = 'src/img/swordeffect.png';
    }

    // ── 트레일 ──────────────────────────────────────────────────────────
    static TRAIL_MAX_LEN   = 10;
    static TRAIL_ALPHA_MAX = 0.50;

    // ── 성장 배율 (lv3) ─────────────────────────────────────────────────
    // 기본 240px, 최대 도달 거리 ~308px (560px/s × 0.55s)
    // 목표 최대 크기: 240 × 1.5 = 360px
    // GROWTH_RATE = (360 - 240) / 308 ≈ 0.39 → 거리 1px당 0.39px 증가
    static GROWTH_RATE = 0.39;

    // ── 방향 보정 추가 오프셋 ───────────────────────────────────────────
    // 방사형 각도에 더해 투사체를 45° 추가 회전 (시각적 조정)
    static ANGLE_OFFSET = Math.PI / 3; // 60°

    constructor() {
        super();
        SwordAura._loadImage();

        this.baseDrawW        = 240;  // 업그레이드 없이 사용하는 기본 크기
        this.baseDrawH        = 240;
        this.drawW            = 240;  // 현재 프레임 렌더 크기 (성장 시 변동)
        this.drawH            = 240;
        this.damage           = 0;
        this.critChance       = 0;    // 0.0 ~ 1.0
        this.growWithDistance = false;

        // 방사형 회전을 위한 스폰 원점 (캐릭터 위치)
        this.originX = 0;
        this.originY = 0;

        this._trail      = [];
        this._hitEnemies = []; // 중복 타격 방지용 (무한 관통이므로 소멸 X)
    }

    // ── 초기화 ──────────────────────────────────────────────────────────
    /**
     * @param {number} x      - 스폰 X (보통 검끝 위치)
     * @param {number} y      - 스폰 Y
     * @param {number} dirX   - 이동 방향 X
     * @param {number} dirY   - 이동 방향 Y
     * @param {number} speed  - px/s
     * @param {number} ttl    - 수명 (초)
     * @param {number} damage - 적용 데미지
     * @param {Object} cfg    - 선택 설정
     *   @param {number}  cfg.drawW            - 기본 렌더 크기 (기본 240)
     *   @param {number}  cfg.drawH            - 기본 렌더 크기 (기본 240)
     *   @param {number}  cfg.originX          - 방사형 원점 X (캐릭터 X)
     *   @param {number}  cfg.originY          - 방사형 원점 Y (캐릭터 Y)
     *   @param {boolean} cfg.growWithDistance - 거리 비례 성장 여부 (lv3)
     *   @param {number}  cfg.critChance       - 크리티컬 확률 0.0~1.0 (lv4)
     */
    spawn(x, y, dirX, dirY, speed, ttl, damage, cfg = {}) {
        super.spawn(x, y, dirX, dirY, speed, ttl);

        const {
            drawW            = 240,
            drawH            = 240,
            originX          = x,
            originY          = y,
            growWithDistance = false,
            critChance       = 0,
        } = cfg;

        this.damage           = damage;
        this.baseDrawW        = drawW;
        this.baseDrawH        = drawH;
        this.drawW            = drawW;
        this.drawH            = drawH;
        this.originX          = originX;
        this.originY          = originY;
        this.growWithDistance = growWithDistance;
        this.critChance       = critChance;
        this._trail           = [];
        this._hitEnemies      = [];
    }

    // ── 소멸 ────────────────────────────────────────────────────────────
    deactivate() {
        super.deactivate();
        this._trail      = [];
        this._hitEnemies = [];
    }

    // ── 현재 거리 계산 ───────────────────────────────────────────────────
    _distFromOrigin() {
        const dx = this.x - this.originX;
        const dy = this.y - this.originY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ── AABB 히트박스 (앞쪽 볼록 선단부) ────────────────────────────────
    /**
     * 이동 방향 기준 앞쪽 영역을 AABB 히트박스로 사용.
     * growWithDistance 시 현재 drawW에 맞춰 함께 증가한다.
     */
    getHitbox() {
        const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const ndx = this.vx / len;
        const ndy = this.vy / len;

        const cx   = this.x + ndx * (this.drawW * 0.20);
        const cy   = this.y + ndy * (this.drawW * 0.20);
        const half = this.drawW * 0.28;

        return { x: cx - half, y: cy - half, w: half * 2, h: half * 2 };
    }

    // ── 매 프레임 갱신 ──────────────────────────────────────────────────
    update(dt, waveManager) {
        if (!this.active) return;

        super.update(dt);
        if (!this.active) return;

        // ── lv3: 거리 비례 크기 성장 ─────────────────────────────────
        if (this.growWithDistance) {
            const dist = this._distFromOrigin();
            const grown = this.baseDrawW + dist * SwordAura.GROWTH_RATE;
            this.drawW = grown;
            this.drawH = grown;
        }

        // ── 트레일 갱신 ───────────────────────────────────────────────
        this._trail.push({ x: this.x, y: this.y, alpha: SwordAura.TRAIL_ALPHA_MAX });
        if (this._trail.length > SwordAura.TRAIL_MAX_LEN) this._trail.shift();
        const alphaDecay = SwordAura.TRAIL_ALPHA_MAX / SwordAura.TRAIL_MAX_LEN;
        for (const t of this._trail) t.alpha -= alphaDecay;

        // ── 충돌 검사 ─────────────────────────────────────────────────
        if (waveManager) this._checkCollisions(waveManager);
    }

    // ── 충돌 처리 (무한 관통) ────────────────────────────────────────────
    /**
     * 무한 관통: _hitEnemies로 중복 타격만 방지.
     * 충돌해도 소멸하지 않고 TTL/경계에 의해서만 소멸한다.
     * lv4+ 크리티컬: critChance 확률로 데미지 2배 적용.
     */
    _checkCollisions(waveManager) {
        const hb = this.getHitbox();

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active)                    continue;
            if (this._hitEnemies.includes(enemy)) continue;

            const nearX = Math.max(hb.x, Math.min(enemy.x, hb.x + hb.w));
            const nearY = Math.max(hb.y, Math.min(enemy.y, hb.y + hb.h));
            const dx    = enemy.x - nearX;
            const dy    = enemy.y - nearY;

            if (dx * dx + dy * dy < enemy.radius * enemy.radius) {
                const isCrit   = this.critChance > 0 && Math.random() < this.critChance;
                const finalDmg = isCrit ? this.damage * 2 : this.damage;
                const kbx      = enemy.x - this.x;
                const kby      = enemy.y - this.y;
                enemy.takeDamage(finalDmg, kbx, kby, 220, isCrit);
                this._hitEnemies.push(enemy);
                // 소멸 없음 — 무한 관통
            }
        }
    }

    // ── 렌더링 ──────────────────────────────────────────────────────────
    /**
     * [방사형 회전 보정]
     *   drawAngle = atan2(originY - aura.y, originX - aura.x)
     *   이미지의 오목면(+x = 0°)이 캐릭터 원점 방향을 향한다.
     *
     * [페이드아웃]
     *   수명 마지막 30% 에서 선형 감소
     */
    draw(ctx) {
        if (!this.active) return;

        // 방사형 보정: 오목면(이미지 +x)을 원점 방향으로 고정 + 45° 추가 회전
        const drawAngle = Math.atan2(
            this.originY - this.y,
            this.originX - this.x
        ) + SwordAura.ANGLE_OFFSET;

        ctx.save();

        // ── 잔상 ─────────────────────────────────────────────────────
        if (SwordAura._imgReady) {
            for (const t of this._trail) {
                if (t.alpha <= 0) continue;
                ctx.save();
                ctx.globalAlpha = t.alpha;
                ctx.translate(t.x, t.y);
                ctx.rotate(drawAngle);
                ctx.drawImage(
                    SwordAura._img,
                    -this.drawW / 2, -this.drawH / 2,
                    this.drawW, this.drawH
                );
                ctx.restore();
            }
        }

        // ── 본체 ─────────────────────────────────────────────────────
        const lifeRatio = this.ttl / this.maxTtl;
        const bodyAlpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1.0;
        ctx.globalAlpha = bodyAlpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(drawAngle);

        if (SwordAura._imgReady) {
            ctx.drawImage(
                SwordAura._img,
                -this.drawW / 2, -this.drawH / 2,
                this.drawW, this.drawH
            );
        } else {
            ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, this.drawW * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawDebugHitbox(ctx) {
        const hb = this.getHitbox();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.85)';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        ctx.restore();
    }
}
