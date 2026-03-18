/**
 * Projectile — 범용 투사체 베이스 클래스
 *
 * 위치·속도·방향·수명을 관리하는 공통 상태와
 * Pool 패턴과 호환되는 spawn / deactivate 인터페이스를 제공합니다.
 *
 * 서브클래스에서 오버라이드해야 하는 메서드:
 *   - update(dt)    : 서브클래스 고유 로직 (super.update(dt) 선행 호출)
 *   - draw(ctx)     : 렌더링 전용
 *   - getHitbox()   : 충돌 영역 반환
 */
class Projectile {
    constructor() {
        this.active = false;

        // ── Transform ──────────────────────────────────────────────────
        this.x = 0;
        this.y = 0;

        // ── Physics ────────────────────────────────────────────────────
        this.vx    = 0;   // px/s
        this.vy    = 0;
        this.speed = 0;

        // ── Lifecycle ──────────────────────────────────────────────────
        this.ttl    = 0;  // 남은 수명 (초)
        this.maxTtl = 0;  // 최초 수명 — 진행률 계산용

        // 캔버스 경계 (Game 에서 spawnSwordAura 호출 전에 주입)
        this.canvasWidth  = 1280;
        this.canvasHeight = 720;
    }

    // ── 초기화 ──────────────────────────────────────────────────────────
    /**
     * 투사체를 활성화하고 초기 상태를 설정한다.
     *
     * @param {number} x     - 초기 X 좌표
     * @param {number} y     - 초기 Y 좌표
     * @param {number} dirX  - 이동 방향 X (비정규화 허용)
     * @param {number} dirY  - 이동 방향 Y
     * @param {number} speed - 이동 속도 (px/s)
     * @param {number} ttl   - 수명 (초)
     */
    spawn(x, y, dirX, dirY, speed, ttl) {
        this.active = true;
        this.x      = x;
        this.y      = y;
        this.speed  = speed;
        this.ttl    = ttl;
        this.maxTtl = ttl;

        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        this.vx = (dirX / len) * speed;
        this.vy = (dirY / len) * speed;
    }

    // ── 매 프레임 갱신 ──────────────────────────────────────────────────
    /**
     * 위치를 갱신하고 수명·경계 이탈을 검사한다.
     * 서브클래스에서 추가 로직을 붙일 때 super.update(dt) 를 먼저 호출한다.
     *
     * @param {number} dt - 델타 타임 (초)
     */
    update(dt) {
        if (!this.active) return;

        this.ttl -= dt;
        if (this.ttl <= 0 || this._isOutOfBounds()) {
            this.deactivate();
            return;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    // ── 소멸 ────────────────────────────────────────────────────────────
    /** 투사체를 비활성화한다. Pool 반환 전 상태 초기화용. */
    deactivate() {
        this.active = false;
    }

    // ── AABB 히트박스 ────────────────────────────────────────────────────
    /**
     * 충돌 판정에 사용되는 AABB 를 반환한다.
     * 서브클래스에서 실제 크기에 맞게 오버라이드한다.
     *
     * @returns {{ x: number, y: number, w: number, h: number }}
     */
    getHitbox() {
        return { x: this.x - 10, y: this.y - 10, w: 20, h: 20 };
    }

    // ── 렌더링 ──────────────────────────────────────────────────────────
    /**
     * 투사체를 Canvas 에 그린다.
     * 서브클래스에서 구체적인 비주얼을 구현한다.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) { /* 서브클래스에서 구현 */ }

    // ── Private ─────────────────────────────────────────────────────────
    _isOutOfBounds() {
        const m = 120;
        return (
            this.x < -m || this.x > this.canvasWidth  + m ||
            this.y < -m || this.y > this.canvasHeight + m
        );
    }
}
