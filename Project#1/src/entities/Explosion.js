/**
 * Explosion.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 스프라이트 시트 기반 1회성 폭발 애니메이션 클래스.
 *
 * [스프라이트 시트 규격]
 *   파일: src/img/grenade_explosion.png
 *   구조: 6열 × 3행 = 18프레임
 *   순서: 좌→우, 위→아래 (선형 인덱스 0~17)
 *
 * [성능 설계]
 *   - 이미지는 static 프로퍼티에 딱 한 번만 로드 (전역 공유, 슬라이싱 없음).
 *   - 매 draw() 호출마다 sx/sy/sWidth/sHeight 파라미터로 현재 프레임을 잘라서 렌더링.
 *   - 메모리 누수 방지: isFinished = true 이후 Game.activeExplosions 에서 자동 제거됨.
 * ─────────────────────────────────────────────────────────────────────────────
 */
class Explosion {

    // ─── 정적(Static) 상수 ─────────────────────────────────────────────────────
    // 스프라이트 시트의 열/행 개수. 인스턴스마다 반복 선언하지 않도록 static으로 공유.
    static COLS          = 6;   // 가로 프레임 수
    static ROWS          = 3;   // 세로 프레임 수
    static TOTAL_FRAMES  = 18;  // COLS × ROWS = 전체 프레임 수

    // ─── 전역 이미지 캐시 ───────────────────────────────────────────────────────
    // HTMLImageElement 하나만 메모리에 유지. null이면 아직 로드 전.
    static _img = null;

    /**
     * 스프라이트 시트를 최초 한 번만 로드한다.
     * 이후 호출에서는 이미 로드된 이미지를 그대로 재사용하므로 네트워크 요청 없음.
     */
    static _loadAsset() {
        if (Explosion._img) return; // 이미 로드됨 → 즉시 반환
        Explosion._img = new Image();
        Explosion._img.src = 'src/img/grenade_explosion.png';
    }

    // ─── 생성자 ────────────────────────────────────────────────────────────────
    /**
     * @param {number} x         - 폭발 중심 X 좌표 (월드 공간)
     * @param {number} y         - 폭발 중심 Y 좌표 (월드 공간)
     * @param {number} size      - 렌더링 크기(px). 이 정사각형 안에 전체 스프라이트가 그려짐.
     *                             (기본값 160: 수류탄 기본 반지름 80 × 2)
     * @param {number} frameRate - 초당 프레임 수. 18fps → 전체 1.0초, 24fps → 0.75초.
     *                             (기본값 20: 전체 재생 시간 약 0.9초)
     */
    constructor(x, y, size = 160, frameRate = 15) {

        // 전역 이미지 로드 트리거 (첫 인스턴스에서만 실제로 로드됨)
        Explosion._loadAsset();

        // ── 위치 & 렌더 설정 ──────────────────────────────────────────────────
        this.x    = x;    // 폭발 중심 X
        this.y    = y;    // 폭발 중심 Y
        this.size = size; // 화면에 그려질 정사각형 크기(px)

        // ── 타이밍 ───────────────────────────────────────────────────────────
        // frameDuration: 한 프레임이 화면에 머무는 시간(초).
        //   예) frameRate=20 → 1/20 = 0.05초/프레임 → 18프레임 × 0.05 = 0.9초 완료
        this.frameRate     = frameRate;
        this.frameDuration = 1 / frameRate;

        // timer: 마지막 프레임 전환 이후 누적된 경과 시간(초).
        //   timer >= frameDuration 이 되는 순간 다음 프레임으로 넘어간다.
        this.timer = 0;

        // ── 애니메이션 상태 ──────────────────────────────────────────────────
        // currentFrame: 현재 표시 중인 프레임 인덱스 (0 ~ TOTAL_FRAMES-1).
        this.currentFrame = 0;

        // isFinished: 모든 프레임 재생 완료 시 true.
        //   Game 루프에서 이 플래그를 확인해 배열에서 제거 → 메모리 누수 방지.
        this.isFinished = false;
    }

    // ─── update(dt) ────────────────────────────────────────────────────────────
    /**
     * 프레임 레이트 독립적으로 프레임 인덱스를 전진시킨다.
     * Game.update() 에서 매 틱마다 호출해야 한다.
     *
     * @param {number} dt - 이전 프레임부터 현재까지 경과 시간(초). DeltaTime.
     */
    update(dt) {
        // 이미 종료된 애니메이션은 처리하지 않음
        if (this.isFinished) return;

        // 경과 시간 누적
        this.timer += dt;

        // 한 프레임 분량의 시간이 쌓이면 다음 프레임으로 전환
        if (this.timer >= this.frameDuration) {
            // timer를 0으로 리셋하지 않고 초과분을 빼는 방식.
            //   → 고주사율 화면에서도 프레임 타이밍 오차가 누적되지 않는다.
            this.timer -= this.frameDuration;
            this.currentFrame++;

            // 모든 프레임을 소진했으면 종료 플래그 설정
            if (this.currentFrame >= Explosion.TOTAL_FRAMES) {
                this.isFinished = true;
                // currentFrame을 마지막 유효 인덱스로 고정 (draw에서 범위 초과 방지)
                this.currentFrame = Explosion.TOTAL_FRAMES - 1;
            }
        }
    }

    // ─── draw(ctx) ─────────────────────────────────────────────────────────────
    /**
     * 현재 프레임에 해당하는 스프라이트 영역을 잘라 캔버스에 그린다.
     * 이미지 슬라이싱(분리 저장) 없이 sx/sy 오프셋으로 직접 크롭.
     * Game.draw() 에서 매 틱마다 호출해야 한다.
     *
     * [투명도 정책]
     *   - 프레임  0 ~ 11 : alpha = 0.85 (초반 약한 반투명 고정)
     *   - 프레임 12 ~ 17 : alpha 0.85 → 0.0 선형 감소 (점진적 페이드아웃)
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // 종료됐거나 이미지가 아직 준비되지 않으면 렌더링 건너뜀
        if (this.isFinished) return;
        const img = Explosion._img;
        if (!img || !img.complete || img.naturalWidth === 0) return;

        // ── 소스(스프라이트 시트) 좌표 계산 ─────────────────────────────────
        // 각 프레임의 픽셀 크기 = 시트 전체 크기 ÷ 열/행 수
        const frameW = img.naturalWidth  / Explosion.COLS; // 프레임 너비(px)
        const frameH = img.naturalHeight / Explosion.ROWS; // 프레임 높이(px)

        // 선형 인덱스 → 2D(열, 행) 좌표 변환
        //   예) currentFrame=7, COLS=6 → col=1, row=1
        const col = this.currentFrame % Explosion.COLS;
        const row = Math.floor(this.currentFrame / Explosion.COLS);

        // 스프라이트 시트에서 이 프레임의 좌상단 픽셀 위치
        const sx = col * frameW;
        const sy = row * frameH;

        // ── 목적지(캔버스) 좌표 계산 ─────────────────────────────────────────
        // (this.x, this.y)를 중심으로 size × size 정사각형에 맞춰 그림
        const destX = this.x - this.size / 2;
        const destY = this.y - this.size / 2;

        // ── 투명도(alpha) 계산 ───────────────────────────────────────────────
        // BASE_ALPHA  : 폭발 전체에 적용되는 기본 반투명 수치 (완전 불투명보다 약간 낮게)
        // FADE_START  : 이 프레임 인덱스부터 페이드아웃 시작
        // FADE_END    : 이 프레임 인덱스에서 alpha = 0.0 (완전 투명)
        const BASE_ALPHA = 0.70;
        const FADE_START = 12;
        const FADE_END   = Explosion.TOTAL_FRAMES - 1; // 17

        let alpha;
        if (this.currentFrame < FADE_START) {
            // 초반 프레임(0~11): 기본 반투명 고정
            alpha = BASE_ALPHA;
        } else {
            // 페이드아웃 구간(12~17):
            //   progress = 0.0 (프레임 12) → 1.0 (프레임 17)
            //   alpha    = BASE_ALPHA × (1 - progress)
            //
            //   프레임별 계산 예시 (FADE_RANGE = 17 - 12 = 5):
            //     frame 12 → progress 0/5 = 0.00 → alpha 0.85
            //     frame 13 → progress 1/5 = 0.20 → alpha 0.68
            //     frame 14 → progress 2/5 = 0.40 → alpha 0.51
            //     frame 15 → progress 3/5 = 0.60 → alpha 0.34
            //     frame 16 → progress 4/5 = 0.80 → alpha 0.17
            //     frame 17 → progress 5/5 = 1.00 → alpha 0.00
            const FADE_RANGE = FADE_END - FADE_START; // 5
            const progress   = (this.currentFrame - FADE_START) / FADE_RANGE; // 0.0 ~ 1.0
            alpha = BASE_ALPHA * (1 - progress);
        }

        // ── ctx.save / globalAlpha / drawImage / ctx.restore ─────────────────
        // save()  : 현재 캔버스 상태(globalAlpha 포함 모든 속성) 스택에 저장
        //           → 이 블록 밖의 다른 렌더링 요소에 투명도가 전파되지 않음
        ctx.save();

            // globalAlpha: 이후 모든 draw 호출에 곱해지는 불투명도 (0.0 ~ 1.0)
            ctx.globalAlpha = alpha;

            // 'screen' 합성 모드: 검정(#000000) 픽셀을 투명으로 처리하고
            // 불꽃/연기 색상만 아래 레이어와 밝게 합성한다.
            // → 스프라이트 시트의 검정 배경이 게임 화면에 사각형으로 찍히지 않음
            ctx.globalCompositeOperation = 'screen';

            // 9-인자 drawImage: 소스 크롭 + 목적지 스케일
            // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            //   - sx, sy, sWidth, sHeight : 스프라이트 시트에서 잘라낼 영역
            //   - dx, dy, dWidth, dHeight : 캔버스에 그릴 위치와 크기 (자동 스케일)
            ctx.drawImage(
                img,               // 소스: 전역 공유 스프라이트 시트
                sx, sy,            // 소스 좌상단 (현재 프레임 위치)
                frameW, frameH,    // 소스 크기 (한 프레임 크롭 영역)
                destX, destY,      // 목적지 좌상단 (캔버스 위치)
                this.size, this.size // 목적지 크기 (렌더 스케일)
            );

        // restore(): globalAlpha = 1.0, globalCompositeOperation = 'source-over' 로 복원
        ctx.restore();
    }
}
