# AGENTS.md — science-islands 레포 작업 규칙

이 레포는 **놀러오세요 과학의 섬** — 주민의 부탁을 실험으로 해결하는 스토리형 3D 게임 시리즈(공용 `engine/` + 섬별 폴더).
작성자: 조승재(해누리중 과학교사). 전역 규칙은 `~/.codex/AGENTS.md` 와 `Desktop\11_웹앱개발\GPT_개발인계_지침서.md` 를 따르고, 아래는 **이 레포에만 더 붙는 규칙**이다.

## 절대 규칙

1. **`*/source/` 는 손대지 않는다.** 저작권 있는 원본 자료(타 교사 PPT·방송 애니메이션 캡처)가 들어 있고 `.gitignore` 로 빠져 있다. 읽기는 되지만 **레포에 올리거나 게임 화면에 쓰지 않는다.**
2. **그림은 코드로 그린다.** 남의 그림·AI 생성 그림 금지. 인물·배경·소품은 three.js / SVG / CSS 로 직접 만든다.
3. **`scienceisjo/electricity` 레포는 건드리지 않는다.** 「전기의 숲」은 https://scienceisjo.github.io/electricity/sparkle-island/ 에 배포된 채로 두고, 코드는 **읽어서 가져오기만** 한다(별도 읽기 전용 클론에서).
4. **push·merge 금지.** 브랜치 `codex/main` 에 커밋까지만. 병합·배포는 사용자 또는 Claude 가 한다.
5. **로컬 서버 포트는 7100~7199.** (5xxx·8123 은 다른 세션이 쓴다.)
6. 파일을 지우거나 통째로 갈아엎기 전에 `_backup/` 에 원본을 남긴다.

## 결과물 규격

- 각 섬은 **배포 시 단일 HTML 하나**(`<island>/index.html`). 빌드 전 조각은 `engine/*.js`, `<island>/story.js`, `<island>/labs/*.js` 로 두고 `build.py` 가 인라인으로 합친다. 외부 CDN 금지 — three.js 는 `lib/three.min.js` 로컬 사본.
- 페이지 맨 아래 공통 푸터를 넣는다(전기의 숲 원본과 같은 형식):
  `<footer id="app-credit">© 2026 조승재(과학이조선생) · 해누리중학교 · All rights reserved<br><span>최종 업데이트: YYYY-MM-DD</span></footer>`
- 한글에 고정폭(monospace) 글꼴을 쓰지 않는다(자간이 벌어짐). 숫자·코드·URL 에만.
- 큰 화면 대응: `@media (min-width:1600px){html{zoom:…}}` 관례를 따른다.
- 한글 입력이 있는 입력칸은 전기의 숲의 IME 보정 블록을 그대로 쓴다.
- 86MB 짜리 `sparkle-island/audio/maple-piano-bgm.mp3` 는 **새 섬으로 복사하지 않는다.** 필요하면 사용자에게 재인코딩/공유 방식을 묻는다.

## 작업 흐름

```
git clone https://github.com/scienceisjo/science-islands.git C:\Users\user\codex-work\science-islands
cd C:\Users\user\codex-work\science-islands
git switch -c codex/main
# 읽기 전용 참고본(수정·커밋 금지)
git clone --depth 1 https://github.com/scienceisjo/electricity.git C:\Users\user\codex-work\_ref-electricity
```

작업 전 `git fetch` 로 뒤처짐을 확인한다(다른 세션이 같은 레포를 건드릴 수 있다).

## 지금 할 일

`engine/인계_엔진분리.md` 를 읽고 그대로 수행한다.
