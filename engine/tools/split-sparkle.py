# -*- coding: utf-8 -*-
"""1단계 · 기계적 분리 (한 번만 돌리는 도구)

전기의 숲(sparkle-island/index.html) 을 <script> 경계에서 그대로 잘라
  engine/*.js            공용 엔진
  _reference/sparkle/*.js  전기 섬 콘텐츠(검증용 기준 섬)
  _reference/sparkle/shell.html  나머지 뼈대(자른 자리에 <!--PART:이름--> 표식)
로 옮긴다. **본문은 한 글자도 고치지 않는다.** CRLF·공백·주석 그대로.

사용: python engine/tools/split-sparkle.py <원본 index.html>
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE = os.path.join(ROOT, "engine")
ISLAND = os.path.join(ROOT, "_reference", "sparkle")

# 블록 순서 그대로: (이름, 어디로) — engine = 공용, island = 섬 콘텐츠
PLAN = [
    ("model", "island"),      # IslandModel  퀘스트·일지·circuit()·저장 sanitize
    ("world", "engine"),      # IslandWorld  three.js 섬·이동·시점·구역
    ("ime", "engine"),        # 깨진 한글 입력 되살리기
    ("audio", "engine"),      # IslandAudio
    ("comfort", "engine"),    # IslandComfort + 키보드 도움말
    ("circuit", "island"),    # IslandCircuit  plan()/svg()/deviceGlyph
    ("missions", "island"),   # IslandMissions steps/checks/hint
    ("fx", "engine"),         # 축하 연출
    ("play", "island"),       # IslandPlay names/controls/zones/gifts
    ("concept", "island"),    # IslandConcept 개념 확인 2문항
    ("main", "engine"),       # 메인 UI·공방 틀·저장·완료
    ("visit-count", "engine"),  # 방문 집계 스니펫
]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\user\electricity-staging\sparkle-island\index.html"
    with open(src, "r", encoding="utf-8", newline="") as f:
        html = f.read()

    assert "PART:" not in html, "원본에 표식과 겹치는 문자열이 있음"
    os.makedirs(ENGINE, exist_ok=True)
    os.makedirs(ISLAND, exist_ok=True)

    blocks = [m for m in re.finditer(r"<script([^>]*)>(.*?)</script>", html, re.S)]
    bodies = [m for m in blocks if m.group(2)]  # 본문 있는 것만 (three.min.js 태그 제외)
    assert len(bodies) == len(PLAN), f"블록 {len(bodies)}개 ≠ 계획 {len(PLAN)}개"

    shell_parts, cursor = [], 0
    for (name, where), m in zip(PLAN, bodies):
        target = ENGINE if where == "engine" else ISLAND
        path = os.path.join(target, name + ".js")
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(m.group(2))
        shell_parts.append(html[cursor:m.start(2)])
        shell_parts.append("<!--PART:%s-->" % name)
        cursor = m.end(2)
        print("%-12s %-7s %7d bytes" % (name, where, len(m.group(2))))
    shell_parts.append(html[cursor:])

    shell = "".join(shell_parts)
    with open(os.path.join(ISLAND, "shell.html"), "w", encoding="utf-8", newline="") as f:
        f.write(shell)
    print("shell.html  %d bytes (원본 %d)" % (len(shell), len(html)))


if __name__ == "__main__":
    main()
