# -*- coding: utf-8 -*-
"""섬 하나를 단일 HTML 로 조립한다.

    python build.py <섬폴더> [-o 출력.html] [--check 원본.html]

섬폴더의 `shell.html` 안에 있는 `<!--PART:이름-->` 표식을 파일 내용으로 바꾼다.
찾는 순서는 **섬폴더 먼저, 없으면 engine/** — 섬이 엔진 부품을 덮어쓸 수 있다.

읽고 쓰기는 모두 newline='' 이라 원본의 CRLF 가 그대로 살아난다.
`--check` 를 주면 결과와 원본의 SHA-256 을 비교한다(1단계 합격 기준).
"""
import argparse
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.join(ROOT, "engine")
MARK = re.compile(r"<!--PART:([A-Za-z0-9_-]+)-->")


def read(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        return f.read()


def sha(data):
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def build(island_dir):
    shell_path = os.path.join(island_dir, "shell.html")
    if not os.path.exists(shell_path):
        sys.exit("shell.html 이 없습니다: " + shell_path)
    shell = read(shell_path)
    used = []

    def swap(m):
        name = m.group(1)
        for base in (island_dir, ENGINE):
            path = os.path.join(base, name + ".js")
            if os.path.exists(path):
                used.append((name, os.path.relpath(path, ROOT)))
                return read(path)
        sys.exit("부품을 못 찾음: %s.js (섬폴더·engine 둘 다 없음)" % name)

    return MARK.sub(swap, shell), used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("island", help="섬 폴더 (예: _reference/sparkle, lemon-island)")
    ap.add_argument("-o", "--out", help="출력 파일 (기본: <섬폴더>/index.html)")
    ap.add_argument("--check", help="이 원본과 바이트가 같은지 확인만 하고 쓰지 않음")
    args = ap.parse_args()

    island_dir = os.path.join(ROOT, args.island)
    html, used = build(island_dir)

    for name, path in used:
        print("  %-12s ← %s" % (name, path))

    if args.check:
        origin = read(args.check)
        ok = sha(html) == sha(origin)
        print("\n조립 %d bytes  %s" % (len(html), sha(html)))
        print("원본 %d bytes  %s" % (len(origin), sha(origin)))
        print("\n%s" % ("✅ 바이트 단위로 같습니다." if ok else "❌ 다릅니다."))
        if not ok:
            for i, (a, b) in enumerate(zip(html, origin)):
                if a != b:
                    print("첫 차이 %d번째 글자: 조립 %r / 원본 %r" % (i, html[i:i + 40], origin[i:i + 40]))
                    break
        return 0 if ok else 1

    out = args.out or os.path.join(island_dir, "index.html")
    with open(out, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    print("\n%s  %d bytes" % (os.path.relpath(out, ROOT), len(html)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
