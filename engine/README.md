# engine — 공용 엔진 (분리 예정)

「놀러오세요 전기의 숲」(`scienceisjo/electricity/sparkle-island/index.html`, 단일 파일 약 240KB, 축약 코드)에서 내용과 무관한 블록을 떼어 여기에 둔다.

## 가져올 블록 (전기의 숲 script 순서 기준)
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
