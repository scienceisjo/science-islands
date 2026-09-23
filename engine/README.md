# engine — 공용 엔진

「놀러오세요 전기의 숲」(`scienceisjo/electricity/sparkle-island/index.html`)에서 떼어 온 공용 부분.
**1단계(분리)와 2-a(읽기 좋게 펴기)는 끝났다.** 지금 이 폴더의 코드는 전기의 숲과 뜻이 같다는 것이 증명돼 있다.

| 확인 | 방법 | 결과 |
|---|---|---|
| 조각을 되합치면 원본 그대로인가 | `python build.py _reference/sparkle --check <원본>` | 216,320 바이트 · SHA-256 `0ff978fb…5652` 일치 |
| 보기 좋게 편 뒤에도 뜻이 같은가 | `node engine/tools/ast-compare.mjs _backup_engine_min engine` | 12개 파일 구문 트리 전부 일치 |
| 계산·그림·문구가 같은가 | `engine/tools/snapshot.js` 를 두 판본에서 실행 | 561,888자 스냅숏 해시 `cb4a6840…b071` 일치 |

## 파일

| 파일 | 내용 |
|---|---|
| `world.js` | three.js 섬 · 지형/소품 만들기 · 캐릭터 이동 · 길찾기 · 구역 진입 · 프레임 루프 |
| `main.js` | 화면 전체 진행 — HUD · 대화 · 공방(실험) 모달 · 일지 · 지도 · 설정 · 저장/복원 · 드래그 · 조이스틱 |
| `ime.js` | 깨진 한글 입력 되살리기 |
| `audio.js` | 배경음 · 효과음 |
| `comfort.js` | 편의 설정 · 키보드 도움말 |
| `fx.js` | 축하 연출 |
| `visit-count.js` | 방문 집계(Supabase) |
| `tools/` | `split-sparkle.py`(한 번 쓴 분리 도구) · `ast-compare.mjs` · `snapshot.js` |

`_reference/sparkle/` 는 **배포하지 않는 검증용 기준 섬**이다(전기의 숲 콘텐츠: model·circuit·missions·play·concept + shell.html).

## 남은 일 — 2-b 섬 인터페이스

아직 엔진 안에 전기 섬 전용 코드가 남아 있다. 새 섬을 만들려면 이걸 섬 쪽으로 옮겨야 한다.

| 어디 | 무엇이 남아 있나 |
|---|---|
| `world.js` | `build()`(섬 지형·건물 배치 약 200줄) · `regionAt()`(구역 판정) · 축제 연출 6개 메서드 |
| `main.js` | 회로 전용 · `hintText()` 5개 · `simData()` · `probeToolbar()` · `measureHint()` · `measurementLabel()` · `meterExplanation()` · `readingHtml()` · `placePart()` · `renderExperiment()` 속 회로 문구 · `drawMap()` |
| `main.js` | 섬 이름 문구 11군데(일지 표지 · 지도 제목 · 축제 대사 · 초대장 · 내려받는 파일 이름) |

옮기는 방향은 `인계_엔진분리.md` 2단계 참고. 실험 모듈 인터페이스가 그 핵심이다.

## 옛 메모 — 가져올 블록 (전기의 숲 script 순서 기준)
- IslandWorld — three.js 섬·캐릭터 이동·시점·구역 진입
- IME·Audio — 한글 입력 보정, 배경음·효과음
- IslandComfort — 편의 설정(글자 크기·움직임 줄이기 등)
- 축하 fx — 퀘스트 완료 연출
- 메인 — renderLab / capture / commitRecord / completeQuest / 드래그 고스트, 저장·복원(sanitize), 전체화면 clamp
- 공방(실험) 틀 — 모달·Step 카드·기록칸·힌트·증거 태그(`state.evidence[quest]`)·개념 확인(그림+비유 2문항)

## 섬마다 바뀌는 것 (engine 밖, `<island>/`)
- IslandModel 의 퀘스트 데이터 → `story.js`
- IslandCircuit(`plan()`·`svg()`·`deviceGlyph`) → `labs/*.js` (실험 모듈 공통 인터페이스로)
- IslandMissions(steps/checks/hint)·IslandPlay(names/controls/zones/svg)·IslandConcept(2문항) → `story.js` + `labs/`

## 엔진에 새로 붙일 것
1. 대사 러너(여러 줄 + 다음 버튼, 화자 표시)
2. 증거 고르기 보고(일지 카드 중 골라 NPC 에게 제출)
3. 해결 후 세계 변화(상태 기반 소품·NPC 교체) — 전기의 숲 축제 연출을 일반화

## 방법
1. `electricity-staging` 최신 fetch → `index.html` 을 jsbeautifier 로 풀어 블록 경계 확인
2. 엔진 블록을 `engine/*.js` 로, 전기의 숲 내용 블록을 참고용 `reference/sparkle-*.js` 로
3. `build.py`(engine + story + labs → 단일 index.html) 를 만들고, **먼저 전기의 숲을 이 조립으로 다시 만들어 원본과 같은지 확인**한 뒤 레몬 섬에 착수
