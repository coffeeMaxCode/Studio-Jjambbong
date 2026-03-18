# Studio-Jjambbong 개발 로그

---

## 2026-03-12

### 대검(Greatsword) 무기 구현 완성

#### 신규 파일
- `src/entities/GreatswordWeapon.js` — 대검 무기 클래스 신규 구현

#### 스프라이트 & 애니메이션
- `sword_motion.png` (RGBA, 2열 × 4행 = 8프레임) 기반 애니메이션 구현
- `DRAW_SCALE = 0.1875` (0.125 × 1.5배 캐릭터 크기 업스케일)
- 가변 프레임 타이밍: `FRAME_DELAYS = [150,150,200,40,40,100,150,200]ms`
- `character001.png` 대체: `handlesSprite = true` 플래그로 Player 기본 스프라이트 비활성화
- Y축 보정(발 고정): `offsetY = (FRAME_OFFSETS_Y[frame] - maxOffsetY) * 0.5`
  - 보정 방향 및 강도 반복 튜닝 끝에 현재 값으로 확정

#### 히트박스
- 프레임별 고유 호(arc) 세그먼트 히트박스 (`FRAME_HITBOXES`) 구현
- 프레임 2~5에서만 판정 발생, 칼날 궤적 추종
- 피벗 회전 + 적 반지름 기반 각도 여유(tolerance) 적용

#### 공격 범위 시각화
- 대기 중: facing 방향 기준 전체 스윙 범위를 연한 노란 호로 표시
- 공격 중: 프레임별 색상 (파랑→주황→노랑) 히트박스 실시간 표시

#### 스크린 쉐이크
- 프레임 3·4 구간 canvas에 `shake` CSS 클래스 토글
- `style.css` — `@keyframes cameraShake` (0.08s ease-out) 추가

#### 수치 조정
| 항목 | 값 |
|------|-----|
| 쿨다운 | 2.5초 |
| 기본 데미지 | 25 |
| 공격 반경 (`attackRadius`) | 360px (초기 180 → 2배) |
| 발동 사거리 (`maxDistSq`) | 600² (초기 300² → 2배) |
| 히트박스 `outerR` | 110~130px (초기 55~65 → 2배) |

#### 연관 파일 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/engine/Config.js` | Greatsword 스탯 추가 |
| `src/engine/Game.js` | btn-bruiser → `initGame('Greatsword')`, `stopwatchTimer` 선언 추가 |
| `src/systems/UpgradeSystem.js` | Greatsword 업그레이드 분기 및 툴팁 추가, moveSpeed 버그 수정 |
| `src/entities/Player.js` | `handlesSprite` 체크로 기본 스프라이트 조건부 렌더링 |
| `index.html` | `GreatswordWeapon.js` 스크립트 태그 추가 |

#### 버그 수정
- 일시정지 화면에서 대검 선택 시 잘못된 무기(`Dagger`) 참조 → `Greatsword`로 수정
- `moveSpeed` 레벨업 시 기하급수 증가 버그: `+= baseMoveSpeed + 25` → `+= 25`
- `stopwatchTimer` 미선언 오류 수정

---
