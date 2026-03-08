/**
 * EffectPool - 데미지 텍스트 오브젝트 풀
 *
 * - 1초 표시 후 즉시 소멸 (페이드 없음)
 * - Bold Red 고정
 * - 연속 피격 스태킹: 같은 몬스터에 연속 피격 시 숫자가 위로 쌓임
 * - 풀 사이즈 500: 후반 초당 수백 히트 대응
 * - 최상위 레이어에서 draw() 호출 → 모든 오브젝트 위에 렌더링
 */
class EffectPool {
    constructor() {
        this.poolSize = 500;

        this.pool = [];
        for (let i = 0; i < this.poolSize; i++) {
            this.pool.push({
                active: false,
                x: 0,
                y: 0,
                text: '',
                duration: 0,
                sourceKey: null
            });
        }

        // 몬스터별 현재 활성 텍스트 수 추적 (스태킹용)
        this.stackMap = new Map(); // sourceKey (enemy 객체) -> 활성 텍스트 수
    }

    /**
     * 데미지 숫자 스폰
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표 (머리 위 기준)
     * @param {string} text - 표시할 텍스트
     * @param {object|null} sourceKey - 피격 몬스터 참조 (스태킹 식별용)
     */
    spawnText(x, y, text, sourceKey = null) {
        const t = this.pool.find(t => !t.active);
        if (!t) return; // 풀 가득 참 → 스킵 (메모리 안전)

        // 연속 피격 스태킹: 같은 몬스터에 쌓인 숫자만큼 위로 오프셋
        let stackOffset = 0;
        if (sourceKey !== null) {
            const count = this.stackMap.get(sourceKey) || 0;
            stackOffset = count;
            this.stackMap.set(sourceKey, count + 1);
        }

        t.active = true;
        t.x = x;
        t.y = y - stackOffset * 20; // 20px씩 위로 쌓기
        t.text = text;
        t.duration = 1.0; // 정확히 1초, 페이드 없음
        t.sourceKey = sourceKey;
    }

    update(dt) {
        for (const t of this.pool) {
            if (!t.active) continue;

            t.duration -= dt;

            if (t.duration <= 0) {
                t.active = false;
                // 스택 카운트 감소
                if (t.sourceKey !== null) {
                    const count = this.stackMap.get(t.sourceKey) || 1;
                    if (count <= 1) {
                        this.stackMap.delete(t.sourceKey);
                    } else {
                        this.stackMap.set(t.sourceKey, count - 1);
                    }
                }
            }
        }
    }

    draw(ctx) {
        // Bold Red 고정 설정 (루프 밖에서 1회만 설정 → 성능 최적화)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#ff2222';
        ctx.globalAlpha = 1.0; // 페이드 없음: 항상 완전 불투명

        for (const t of this.pool) {
            if (!t.active) continue;

            // 검은 테두리 (가독성)
            ctx.strokeText(t.text, t.x, t.y);
            // 빨간 본 텍스트
            ctx.fillText(t.text, t.x, t.y);
        }

        ctx.restore();
    }
}
