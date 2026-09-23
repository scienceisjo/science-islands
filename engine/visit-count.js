/* 방문 집계 — Supabase(과학이조선생 프로젝트 A) 의 visit_hit RPC 한 번 + visit_count 로 숫자를 읽어 표지에 띄움.
   보내는 것: 앱 이름·페이지·임의 방문자ID·유입경로·기기종류뿐. 탐험가 이름·일지 내용은 절대 보내지 않음.
   SETUP SQL(수업HTML/_템플릿/방문집계_SETUP.sql) 을 아직 안 돌렸으면 조용히 실패하고 표지 줄만 숨긴다.
   내 컴퓨터(file:·localhost)에서 연 건 세지 않고 숫자만 보여 준다. */
(function() {
    try {
        var U = "https://vbvtnmnodeoocbbjauap.supabase.co";
        var K = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidnRubW5vZGVvb2NiYmphdWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTQ0OTYsImV4cCI6MjA5NTA3MDQ5Nn0.dvuRrt3qw2Tya_QwGbcXrmGPdfDgI4xmgyH8UjU73Nc";
        var APP = "sparkle-island",
            PAGE = "index";
        var H = {
            "Content-Type": "application/json",
            "apikey": K,
            "Authorization": "Bearer " + K
        };
        var line = document.getElementById("visitLine");
        var n = function(v) {
            return Number(v || 0).toLocaleString("ko-KR");
        };

        function paint(c) {
            if (!c || typeof c !== "object") return;
            var first = !(+c.visitors > 0);
            if (line) {
                line.innerHTML = first ? "🌲 아직 아무도 안 왔어요 — 첫 손님이 되어 주세요!" : "🌲 지금까지 <b>" + n(c.visitors) + "</b>명이 놀러왔어요 · 오늘 <b>" + n(c.today_visitors) + "</b>명";
                line.hidden = false;
            }
            var chip = document.getElementById("visitChip"),
                chipText = document.getElementById("visitChipText"); // 게임 화면 위 칩 — 놀이 중에도 누구나 봄
            if (chip && chipText) {
                chipText.innerHTML = first ? "첫 손님이에요!" : "지금까지 <b>" + n(c.visitors) + "</b>명 · 오늘 <b>" + n(c.today_visitors) + "</b>명 놀러왔어요";
                chip.hidden = false;
            }
            var foot = document.getElementById("app-credit"); // 맨 아래 저작권 줄 끝에도
            if (foot && !foot.querySelector(".visit-foot")) {
                var sp = document.createElement("span");
                sp.className = "visit-foot";
                sp.textContent = " · 🌲 누적 방문 " + n(c.visitors) + "명 (오늘 " + n(c.today_visitors) + "명)";
                foot.appendChild(sp);
            }
        }

        function count() {
            return fetch(U + "/rest/v1/rpc/visit_count", {
                    method: "POST",
                    headers: H,
                    body: JSON.stringify({
                        p_app: APP
                    })
                })
                .then(function(r) {
                    return r.ok ? r.json() : null;
                }).then(paint).catch(function() {});
        }
        var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        if (local) {
            count();
            return;
        } // 개발 중엔 세지 않고 숫자만

        var now = Date.now(),
            seenKey = "visit_seen_" + APP + "_" + PAGE,
            seen = false;
        try {
            seen = now - (+sessionStorage.getItem(seenKey) || 0) < 30 * 60 * 1000;
            sessionStorage.setItem(seenKey, String(now));
        } catch (e) {}
        if (seen) {
            count();
            return;
        } // 같은 탭에서 30분 안 새로고침은 한 번으로

        var vid = "";
        try {
            vid = localStorage.getItem("visit_vid") || "";
            if (!vid) {
                vid = Math.random().toString(36).slice(2, 12);
                localStorage.setItem("visit_vid", vid);
            }
        } catch (e) {
            vid = "s" + Math.random().toString(36).slice(2, 11);
        }
        var ref = "";
        try {
            ref = document.referrer ? new URL(document.referrer).hostname : "";
        } catch (e) {}
        if (ref === location.hostname) ref = ""; // 사이트 안에서 옮겨 다닌 건 유입경로 아님
        var src = "",
            srcKey = "visit_src_" + APP;
        try {
            var q = new URLSearchParams(location.search);
            src = q.get("from") || q.get("utm_source") || ""; // 링크에 ?from=kakao 처럼 붙여 두면 어디서 왔는지 남음
            if (src) {
                localStorage.setItem(srcKey, src);
            } else {
                src = localStorage.getItem(srcKey) || "";
                if (!src && ref) {
                    src = ref;
                    localStorage.setItem(srcKey, src);
                }
            }
        } catch (e) {}
        var dev = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop";
        fetch(U + "/rest/v1/rpc/visit_hit", {
                method: "POST",
                keepalive: true,
                headers: H,
                body: JSON.stringify({
                    p_app: APP,
                    p_page: PAGE,
                    p_visitor: vid,
                    p_src: src,
                    p_ref: ref,
                    p_device: dev
                })
            })
            .catch(function() {}).then(count); // 기록한 뒤 숫자를 읽어야 내 방문까지 포함됨
    } catch (e) {}
})();