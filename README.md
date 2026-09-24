# 놀러오세요 과학의 섬 · science-islands

주민의 부탁을 해결하려고 실험하고, 그 실험으로 세계의 규칙을 알아가는 **스토리형 3D 탐험·실험 게임 시리즈**.
섬 하나가 게임 하나. 공용 엔진 위에 섬마다 이야기·실험을 얹는다.

배포: https://scienceisjo.github.io/science-islands/ (섬 목록) · 섬은 `https://scienceisjo.github.io/science-islands/<섬>/`

## 섬 목록

| 섬 | 단원 | 대상 | 상태 | 주소 |
|---|---|---|---|---|
| 놀러오세요 전기의 숲 · 빛 축제를 부탁해 | 전기와 자기(전류·전압·저항·회로) | 중2 | 배포됨(원조, 이 레포 밖) | https://scienceisjo.github.io/electricity/sparkle-island/ |
| 레몬 백작의 부탁 (lemon-island) | 산과 염기·중화 반응 | 고1 통합과학 | 배포됨 (v1, 2026-09-24) | https://scienceisjo.github.io/science-islands/lemon-island/ |

> 레몬 백작의 부탁은 [겨울쌤의 「레몬 백작의 부탁」 수업](https://m.blog.naver.com/tady52/222403408526)을 바탕으로 구현되었습니다.

## 폴더 규칙

```
science-islands/
├─ index.html          섬 목록(허브)
├─ engine/             공용 엔진 — 3D 섬·이동·구역 진입·NPC 부탁·대사 러너·공방(실험) 틀·일지·증거 태그·개념 확인·저장·IME·오디오·전체화면·축하 연출
├─ <island>/           섬 하나 = 폴더 하나
│  ├─ index.html       배포되는 단일 HTML (build.py 로 조립)
│  ├─ story.js         구역·인물·퀘스트·대사 데이터
│  ├─ labs/            실험 모듈 (공방 틀 안에 꽂히는 시뮬)
│  ├─ art/ audio/      섬 전용 에셋
│  ├─ build.py         engine + story + labs → index.html
│  └─ source/          (로컬 전용, git 제외) 원본 자료·추출본·참고 이미지
└─ lemon-island/       첫 번째 가지
```

- 엔진은 「놀러오세요 전기의 숲」(scienceisjo/electricity/sparkle-island)에서 분리해 가져온다. 전기의 숲 자체는 원래 자리에 그대로 둔다.
- `*/source/` 는 저작권 있는 참고 자료가 섞여 있어 **절대 올리지 않는다**(.gitignore).
- 인물·배경은 three.js 로 직접 만든다. 남의 그림·AI 그림을 쓰지 않는다.
- 새 섬을 만들 때: 폴더 복사 → `story.js`·`labs/` 만 새로 쓰고 `build.py` 로 조립 → 허브 `index.html` 섬 목록에 한 줄.

© 2026 조승재(과학이조선생) · 해누리중학교
