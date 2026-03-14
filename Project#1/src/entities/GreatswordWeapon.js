/**
 * GreatswordWeapon - 대검 슬래시 무기
 *
 * [스프라이트시트] sword_motion.png — 2열 × 4행 = 8프레임 (RGBA, 896×597px/프레임)
 *
 * [핵심 구현]
 * 1. 기본 포즈    : 미공격 시 프레임 0을 플레이어 위치에 렌더링 (character001.png 대체)
 * 2. 스케일       : 전체 0.125 배율 적용 → 112×74.6px
 * 3. 가변 타이밍  : frameDelays 배열 기반 프레임 진행
 * 4. 루트모션     : frameOffsetsY 배열로 Y 좌표 보정 (발 고정 효과)
 * 5. 스크린 쉐이크: 프레임 3·4에서 canvas.classList.add('shake')
 * 6. 궤적 히트박스: 프레임별 고유 호(arc) 히트박스로 실제 칼날 궤적을 따름
 */

class GreatswordAttack {
    constructor() {
        this.x           = 0;
        this.y           = 0;
        this.baseAngle   = 0;   // 공격 기준 방향 (공격 시작 시 고정)
        this.frameIndex  = 0;
        this.frameTimer  = 0;
        this.hitEnemies  = [];
        this.damage      = 0;
        // 검기(SwordAura) 스폰 여부 — 1회만 발사되도록 제어
        this.auraSpawned = false;
    }
}

class GreatswordWeapon {
    // ── 스프라이트 구조 ───────────────────────────────────────────────
    static COLS         = 2;
    static ROWS         = 4;
    static TOTAL_FRAMES = 8;

    // ── 전역 렌더 스케일 (896×597 → 112×75 → × 1.5 = 168×112) ──────
    static DRAW_SCALE = 0.1875; // 0.125 × 1.5

    // ── 가변 프레임 타이밍 (ms → 초) ─────────────────────────────────
    static FRAME_DELAYS = [150, 150, 200, 40, 40, 100, 150, 200].map(ms => ms / 1000);

    // ── 루트모션 Y 오프셋 (게임 픽셀) ────────────────────────────────
    static FRAME_OFFSETS_Y = [10, 13, 24, 26, 48, 50, 56, 56];

    // ── 스크린 쉐이크 프레임 (충격 구간) ─────────────────────────────
    static SHAKE_FRAMES = new Set([3, 4]);

    // ── 프레임별 궤적 히트박스 (호(arc) 세그먼트) ────────────────────
    //
    // pivotX/Y : 캐릭터 로컬 공간(오른쪽 방향 기준)에서의 손 위치 오프셋 (px)
    // innerR   : 손잡이 끝까지 거리 (무효 구간)
    // outerR   : 칼날 끝까지 거리
    // startAngle / endAngle : baseAngle 기준 상대 라디안
    //   (음수 = 타겟 기준 위쪽, 양수 = 아래쪽)
    //
    // 시각적 궤적 분석:
    //  Frame 0: 대기 자세          → 히트 없음
    //  Frame 1: 발을 내딛으며 준비  → 히트 없음
    //  Frame 2: 상단 백스윙 → 첫 호, 타겟 위쪽(-63°)에서 시작
    //  Frame 3: 메인 크레센트 스윙  → 넓은 호(-14° ~ +46°), 가장 큰 판정
    //  Frame 4: 충격 플래시         → 집중 구간(+31° ~ +71°)
    //  Frame 5: 팔로우스루          → 하단 계속 이동(+60° ~ +109°)
    //  Frame 6: 회복 동작           → 히트 없음
    //  Frame 7: 복귀 자세           → 히트 없음
    static FRAME_HITBOXES = [
        null,
        null,
        { pivotX: 8, pivotY: -5, innerR: 12, outerR: 116, startAngle: -1.10, endAngle: -0.25 },
        { pivotX: 8, pivotY: -5, innerR: 12, outerR: 130, startAngle: -0.25, endAngle:  0.80 },
        { pivotX: 8, pivotY: -5, innerR: 10, outerR: 124, startAngle:  0.55, endAngle:  1.25 },
        { pivotX: 8, pivotY: -5, innerR: 10, outerR: 110, startAngle:  1.05, endAngle:  1.90 },
        null,
        null,
    ];

    // Player.draw()에서 기본 스프라이트를 건너뛰도록 알리는 플래그
    handlesSprite = true;

    constructor() {
        this.type            = 'Greatsword';
        this.level           = 1;
        this.cooldownTimer   = 0;
        this.bonusPower      = 0;
        this.speedMultiplier = 1.0;
        this.activeAttacks   = [];
        this.playerRef       = null;

        // ── 검기(SwordAura) 강화 상태 ────────────────────────────────
        // auraLevel: 0=미해금, 1=lv5 해금, 2=lv10, 3=lv15, 4=lv20+
        this.auraLevel         = 0;
        // 검기 전용 쿨타임 (대검 스윙 쿨타임과 독립)
        this.auraCooldown      = 2.0;  // lv1~3: 2.0초, lv4+: 0.5초
        this.auraCooldownTimer = 0;    // 0 이하면 발사 가능
        // 크리티컬 확률 (0.0~1.0) lv4에서 0.10, lv21+부터 2%씩 증가
        this.auraCritChance    = 0;

        const stats        = Config.WEAPON_STATS['Greatsword'];
        this.cooldown      = stats.cooldown;
        this.baseDamage    = stats.baseDamage;
        this.attackRadius  = stats.attackRadius;
        this.maxDistSq     = stats.maxDistSq;

        // 스크린 쉐이크용 캔버스 참조
        this._canvas = document.getElementById('game-canvas');

        // 스프라이트 로드 (RGBA → 배경 제거 불필요)
        this._sprite      = new Image();
        this._spriteReady = false;
        this._frameW      = 0;
        this._frameH      = 0;

        this._sprite.onload = () => {
            this._frameW      = this._sprite.width  / GreatswordWeapon.COLS;
            this._frameH      = this._sprite.height / GreatswordWeapon.ROWS;
            this._spriteReady = true;
        };
        this._sprite.src = 'src/img/sword_motion.png';
    }

    // ── 레벨업 ────────────────────────────────────────────────────────
    upgrade() {
        this.level++;
        this.bonusPower      += 8;
        this.speedMultiplier *= 1.1;
        this.attackRadius    += 20;

        // ── 검기 단계 갱신 (5레벨마다 +1) ────────────────────────────
        //   lv 5  → auraLevel 1 : 검기 해금, 쿨타임 2초
        //   lv 10 → auraLevel 2 : 반대 방향 추가 검기
        //   lv 15 → auraLevel 3 : 거리 비례 크기 성장
        //   lv 20 → auraLevel 4 : 쿨타임 0.5초, 크리티컬 10%
        this.auraLevel = this.level >= 5
            ? Math.floor((this.level - 5) / 5) + 1
            : 0;

        // ── 쿨타임 갱신 ──────────────────────────────────────────────
        this.auraCooldown = this.level >= 20 ? 1.0 : 2.0;

        // ── 크리티컬 확률 갱신 ───────────────────────────────────────
        //   lv20: 10%, lv21: 12%, lv22: 14% … (+2% per level above 20)
        if (this.level >= 20) {
            this.auraCritChance = 0.10 + (this.level - 20) * 0.02;
        } else {
            this.auraCritChance = 0;
        }
    }

    // ── 매 프레임 업데이트 ────────────────────────────────────────────
    update(dt, player, waveManager) {
        this.playerRef = player;

        if (this.cooldownTimer > 0)      this.cooldownTimer      -= dt;
        if (this.auraCooldownTimer > 0)  this.auraCooldownTimer  -= dt;

        // 이전 공격이 완전히 끝난 뒤에만 새 공격
        if (this.cooldownTimer <= 0 && this.activeAttacks.length === 0) {
            const target = this._findNearestEnemy(player, waveManager);
            if (target) {
                this._startAttack(player, target);
                this.cooldownTimer = this.cooldown / this.speedMultiplier;
            }
        }

        for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
            const atk = this.activeAttacks[i];

            atk.x = player.x;
            atk.y = player.y;

            // ── 가변 프레임 타이밍 ──────────────────────────────────
            atk.frameTimer += dt;
            while (atk.frameIndex < GreatswordWeapon.TOTAL_FRAMES) {
                const delay = GreatswordWeapon.FRAME_DELAYS[atk.frameIndex];
                if (atk.frameTimer >= delay) {
                    atk.frameTimer -= delay;
                    atk.frameIndex++;
                } else {
                    break;
                }
            }

            if (atk.frameIndex >= GreatswordWeapon.TOTAL_FRAMES) {
                this._setShake(false);
                this.activeAttacks.splice(i, 1);
                continue;
            }

            // ── 프레임 4 진입 시 검기(SwordAura) 1회 스폰 ──────────
            // Frame 4 = 충격 플래시 구간 — 애니메이션 약 52% 시점
            if (atk.frameIndex === 4 && !atk.auraSpawned) {
                atk.auraSpawned = true;
                this._spawnSwordAura(player, atk);
            }

            // ── 궤적 기반 프레임별 히트 판정 ────────────────────────
            this._applyFrameHit(atk, waveManager);
        }

        // 스크린 쉐이크 토글
        const atk = this.activeAttacks[0];
        this._setShake(!!(atk && GreatswordWeapon.SHAKE_FRAMES.has(atk.frameIndex)));
    }

    // ── 스크린 쉐이크 토글 ───────────────────────────────────────────
    _setShake(active) {
        if (!this._canvas) return;
        if (active) {
            this._canvas.classList.add('shake');
        } else {
            this._canvas.classList.remove('shake');
        }
    }

    // ── 공격 시작 ─────────────────────────────────────────────────────
    _startAttack(player, target) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;

        const atk       = new GreatswordAttack();
        atk.x           = player.x;
        atk.y           = player.y;
        atk.baseAngle   = Math.atan2(dy, dx);
        atk.frameIndex  = 0;
        atk.frameTimer  = 0;
        atk.damage      = this.baseDamage + this.bonusPower + player.attackPower;
        atk.hitEnemies  = [];
        this.activeAttacks.push(atk);
    }

    // ── 프레임별 궤적 히트 판정 (호 세그먼트) ────────────────────────
    //
    // 피벗 회전:
    //   worldPivot = player + rotate(pivot, baseAngle)
    // 호 각도 회전:
    //   worldArc   = baseAngle + [startAngle, endAngle]
    //
    // 판정:
    //   1. 적이 피벗 기준 [innerR, outerR+적반지름] 범위 내
    //   2. 적 방향이 호 범위 내
    _applyFrameHit(atk, waveManager) {
        const hb = GreatswordWeapon.FRAME_HITBOXES[atk.frameIndex];
        if (!hb) return;

        const cos = Math.cos(atk.baseAngle);
        const sin = Math.sin(atk.baseAngle);

        // 피벗 월드 좌표
        const pivotX = atk.x + hb.pivotX * cos - hb.pivotY * sin;
        const pivotY = atk.y + hb.pivotX * sin + hb.pivotY * cos;

        // 호 각도 범위 (월드 기준)
        const worldStart = atk.baseAngle + hb.startAngle;
        const worldEnd   = atk.baseAngle + hb.endAngle;
        const arcMid     = (worldStart + worldEnd) * 0.5;
        const arcHalf    = (worldEnd - worldStart) * 0.5;

        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active || atk.hitEnemies.includes(enemy)) continue;

            const dx   = enemy.x - pivotX;
            const dy   = enemy.y - pivotY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 환형 거리 필터 (적 반지름 포함)
            if (dist < hb.innerR || dist > hb.outerR + enemy.radius) continue;

            // 호 각도 필터
            let diff = Math.atan2(dy, dx) - arcMid;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            // enemy.radius에 비례한 각도 여유 (가까울수록 더 넓은 허용치)
            const tolerance = Math.atan2(enemy.radius, Math.max(dist, 1));
            if (Math.abs(diff) <= arcHalf + tolerance) {
                enemy.takeDamage(atk.damage, dx, dy, 350);
                atk.hitEnemies.push(enemy);
            }
        }
    }

    // ── 검기 스폰 ────────────────────────────────────────────────────
    /**
     * 충격 프레임 진입 시 SwordAura 를 발사한다.
     *
     * 스폰 위치:
     *   player 중심 + (공격 방향 벡터 × WEAPON_TIP_OFFSET)
     *   — 검끝 근처에서 에너지가 날아가는 것처럼 보이게 한다.
     *
     * @param {Player}          player
     * @param {GreatswordAttack} atk
     */
    _spawnSwordAura(player, atk) {
        if (!player.game)          return;
        if (this.auraLevel <= 0)   return; // lv5 미만: 검기 미해금
        if (this.auraCooldownTimer > 0) return; // 쿨타임 중

        // 쿨타임 리셋
        this.auraCooldownTimer = this.auraCooldown;

        const OFFSET = 80; // 검끝까지 오프셋 (px)
        const cos    = Math.cos(atk.baseAngle);
        const sin    = Math.sin(atk.baseAngle);
        const spawnX = player.x + cos * OFFSET;
        const spawnY = player.y + sin * OFFSET;

        // 대검 데미지 × 2
        const auraDamage = atk.damage * 2;

        // 모든 레벨 공통 설정
        const cfg = {
            originX:          player.x,
            originY:          player.y,
            growWithDistance: this.auraLevel >= 3,
            critChance:       this.auraCritChance,
        };

        // 전방 검기
        player.game.spawnSwordAura(spawnX, spawnY, cos, sin, auraDamage, cfg);

        // lv2+: 반대 방향 추가 검기
        if (this.auraLevel >= 2) {
            const bx = player.x - cos * OFFSET;
            const by = player.y - sin * OFFSET;
            player.game.spawnSwordAura(bx, by, -cos, -sin, auraDamage, cfg);
        }
    }

    // ── 최근접 적 탐색 ────────────────────────────────────────────────
    _findNearestEnemy(player, waveManager) {
        // auto-aim OFF: 플레이어 facing 방향의 가상 타겟
        if (player.game && !player.game.autoAimEnabled) {
            return {
                x: player.x + player.facingX * 200,
                y: player.y + player.facingY * 200,
                active: true
            };
        }
        let nearest   = null;
        let minDistSq = this.maxDistSq;
        for (const enemy of waveManager.activeEnemies) {
            if (!enemy.active) continue;
            const dx  = enemy.x - player.x;
            const dy  = enemy.y - player.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDistSq) { minDistSq = dSq; nearest = enemy; }
        }
        return nearest;
    }

    // ── 공격 범위 실시간 시각화 ──────────────────────────────────────
    // - 대기 중  : 공격 가능 범위를 facing 방향 기준으로 연한 호로 표시
    // - 공격 중  : 현재 프레임의 정확한 히트박스 호를 강조 표시
    _drawRangeIndicator(ctx, player, atk) {
        ctx.save();

        if (atk) {
            // ── 활성 공격: 프레임별 히트박스 호 ────────────────────
            const hb = GreatswordWeapon.FRAME_HITBOXES[atk.frameIndex];
            if (!hb) { ctx.restore(); return; }

            const cos        = Math.cos(atk.baseAngle);
            const sin        = Math.sin(atk.baseAngle);
            const pivotX     = atk.x + hb.pivotX * cos - hb.pivotY * sin;
            const pivotY     = atk.y + hb.pivotX * sin + hb.pivotY * cos;
            const worldStart = atk.baseAngle + hb.startAngle;
            const worldEnd   = atk.baseAngle + hb.endAngle;

            // 프레임 구간별 색상
            let fillColor, strokeColor;
            if (atk.frameIndex <= 3) {
                fillColor   = 'rgba(80, 160, 255, 0.20)';  // 파랑: 스윙
                strokeColor = 'rgba(80, 160, 255, 0.70)';
            } else if (atk.frameIndex === 4) {
                fillColor   = 'rgba(255, 120, 40, 0.30)';  // 주황: 충격
                strokeColor = 'rgba(255, 120, 40, 0.90)';
            } else {
                fillColor   = 'rgba(255, 220, 60, 0.18)';  // 노랑: 팔로우스루
                strokeColor = 'rgba(255, 220, 60, 0.60)';
            }

            // 외곽 호 (outerR)
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.arc(pivotX, pivotY, hb.outerR, worldStart, worldEnd);
            ctx.arc(pivotX, pivotY, hb.innerR, worldEnd, worldStart, true);
            ctx.closePath();
            ctx.fillStyle   = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth   = 1.5;
            ctx.fill();
            ctx.stroke();

            // 피벗 중심점
            ctx.beginPath();
            ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();

        } else {
            // ── 대기: 전체 스윙 범위 미리보기 ──────────────────────
            // 프레임 2 시작(-1.10) ~ 프레임 5 끝(+1.90) 기준 facing 방향으로 투영
            const facingAngle = Math.atan2(player.facingY, player.facingX);
            const sweepStart  = facingAngle + GreatswordWeapon.FRAME_HITBOXES[2].startAngle;
            const sweepEnd    = facingAngle + GreatswordWeapon.FRAME_HITBOXES[5].endAngle;
            const maxR        = 130; // 최대 outerR

            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.arc(player.x, player.y, maxR, sweepStart, sweepEnd);
            ctx.closePath();
            ctx.fillStyle   = 'rgba(255, 200, 50, 0.07)';
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.28)';
            ctx.lineWidth   = 1;
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── 렌더링 ────────────────────────────────────────────────────────
    // - 미공격 시: 프레임 0 (대기 자세) 렌더링
    // - 공격 시  : 현재 프레임 + 루트모션 Y 오프셋 적용
    draw(ctx) {
        if (!this._spriteReady || !this.playerRef) return;

        const player = this.playerRef;
        const scale  = GreatswordWeapon.DRAW_SCALE;
        const fw     = this._frameW;
        const fh     = this._frameH;
        const drawW  = fw * scale;
        const drawH  = fh * scale;

        const atk = this.activeAttacks[0] ?? null;

        // ── 공격 범위 시각화 (스프라이트 아래 레이어) ────────────────
        this._drawRangeIndicator(ctx, player, atk);

        // 현재 표시할 프레임 인덱스
        const frameIdx = (atk && atk.frameIndex < GreatswordWeapon.TOTAL_FRAMES)
            ? atk.frameIndex
            : 0;

        const col = frameIdx % GreatswordWeapon.COLS;
        const row = Math.floor(frameIdx / GreatswordWeapon.COLS);

        // ── 발 고정 방식 Y 보정 ──────────────────────────────────────
        // 최대 오프셋(frame 7 = 56)을 기준으로 역산:
        // 오프셋이 작은 초기 프레임일수록 더 아래로 그려 발 위치를 일정하게 유지
        const maxOffsetY = GreatswordWeapon.FRAME_OFFSETS_Y[GreatswordWeapon.TOTAL_FRAMES - 1];
        const offsetY    = (GreatswordWeapon.FRAME_OFFSETS_Y[frameIdx] - maxOffsetY) * 0.5;
        const drawX      = atk ? atk.x : player.x;
        const drawY      = (atk ? atk.y : player.y) + offsetY;

        // ── 무적 시 깜빡임 반영 ──────────────────────────────────────
        if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // ── 왼쪽 방향 공격 시 수평 반전 ─────────────────────────────
        const facingLeft = atk
            ? Math.cos(atk.baseAngle) < 0
            : player.facingX < 0;

        ctx.save();
        ctx.translate(drawX, drawY);
        if (facingLeft) ctx.scale(-1, 1);

        ctx.drawImage(
            this._sprite,
            col * fw, row * fh, fw, fh,
            -drawW / 2, -drawH / 2, drawW, drawH
        );

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}
