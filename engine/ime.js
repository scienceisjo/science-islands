/* ══ ⌨️ 깨진 한글 입력 되살리기 (질문과수원 → 수업 페이지 → 공통 표준) ═══════════
   디벗(윈도우 한글 IME)이 모드를 잃으면 세 가지로 깨진다.
     ① 전각          ｐｕｓｈ　ｅａｃｈ   → 조용히 고친다
     ② 반각 자모     ﾡￜﾵﾼￆﾩﾷￜ          → 조용히 고친다 (깃털이)
     ③ 한영전환 실패 dkssudgktpdy       → 진짜 영어일 수 있으니 «혹시 이거예요?» 하고 물어본다
   칸을 떠날 때(focusout) 처리한다 — 타이핑 중에 value 를 갈아끼우면 커서가 튄다.
   의존성 없음. window.__ime = {fixWidth, qwertyToHan, maybeKorean, ask, disp, setVal} 노출. */
(function() {
    const _JL = 'ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ',
        _JV = 'ᅡᅢᅣᅤᅥᅦᅧᅨᅩᅪᅫᅬᅭᅮᅯᅰᅱᅲᅳᅴᅵ',
        _JT = 'ᆨᆩᆪᆫᆬᆭᆮᆯᆰᆱᆲᆳᆴᆵᆶᆷᆸᆹᆺᆻᆼᆽᆾᆿᇀᇁᇂ';
    const _VMERGE = {
        'ᅩᅡ': 'ᅪ',
        'ᅩᅢ': 'ᅫ',
        'ᅩᅵ': 'ᅬ',
        'ᅮᅥ': 'ᅯ',
        'ᅮᅦ': 'ᅰ',
        'ᅮᅵ': 'ᅱ',
        'ᅳᅵ': 'ᅴ'
    };
    const _TMERGE = {
        'ᆨᆺ': 'ᆪ',
        'ᆫᆽ': 'ᆬ',
        'ᆫᇂ': 'ᆭ',
        'ᆯᆨ': 'ᆰ',
        'ᆯᆷ': 'ᆱ',
        'ᆯᆸ': 'ᆲ',
        'ᆯᆺ': 'ᆳ',
        'ᆯᇀ': 'ᆴ',
        'ᆯᇁ': 'ᆵ',
        'ᆯᇂ': 'ᆶ',
        'ᆸᆺ': 'ᆹ'
    };
    const _L2T = {
        'ᄀ': 'ᆨ',
        'ᄁ': 'ᆩ',
        'ᄂ': 'ᆫ',
        'ᄃ': 'ᆮ',
        'ᄅ': 'ᆯ',
        'ᄆ': 'ᆷ',
        'ᄇ': 'ᆸ',
        'ᄉ': 'ᆺ',
        'ᄊ': 'ᆻ',
        'ᄋ': 'ᆼ',
        'ᄌ': 'ᆽ',
        'ᄎ': 'ᆾ',
        'ᄏ': 'ᆿ',
        'ᄐ': 'ᇀ',
        'ᄑ': 'ᇁ',
        'ᄒ': 'ᇂ'
    };
    const _isSyl = c => {
        const o = c.charCodeAt(0);
        return o >= 0xAC00 && o <= 0xD7A3;
    };
    const _split = c => {
        const i = c.charCodeAt(0) - 0xAC00;
        return {
            l: _JL[Math.floor(i / 588)],
            v: _JV[Math.floor((i % 588) / 28)],
            t: (i % 28) ? _JT[i % 28 - 1] : ''
        };
    };
    const _join = (l, v, t) => String.fromCharCode(0xAC00 + (_JL.indexOf(l) * 21 + _JV.indexOf(v)) * 28 + (t ? _JT.indexOf(t) + 1 : 0));
    /* ①② 전각 영문·전각 공백·반각 자모 → 정상 한글/ASCII */
    function fixWidth(src) {
        const s = String(src || '').normalize('NFKC'),
            out = [];
        for (const ch of s) {
            const prev = out.length ? out[out.length - 1] : '';
            if (prev && _isSyl(prev)) {
                const p = _split(prev);
                if (!p.t && _JV.indexOf(ch) >= 0) {
                    const nv = _VMERGE[p.v + ch];
                    if (nv) {
                        out[out.length - 1] = _join(p.l, nv, '');
                        continue;
                    }
                }
                if (!p.t && _L2T[ch]) {
                    out[out.length - 1] = _join(p.l, p.v, _L2T[ch]);
                    continue;
                }
                if (p.t && _L2T[ch]) {
                    const nt = _TMERGE[p.t + _L2T[ch]];
                    if (nt) {
                        out[out.length - 1] = _join(p.l, p.v, nt);
                        continue;
                    }
                }
            }
            out.push(ch);
        }
        return out.join('');
    }
    /* ③ 두벌식 자판표 — 영어로 쳐진 한글 되돌리기 */
    const _QK = {
        q: 'ᄇ',
        w: 'ᄌ',
        e: 'ᄃ',
        r: 'ᄀ',
        t: 'ᄉ',
        y: 'ᅭ',
        u: 'ᅧ',
        i: 'ᅣ',
        o: 'ᅢ',
        p: 'ᅦ',
        a: 'ᄆ',
        s: 'ᄂ',
        d: 'ᄋ',
        f: 'ᄅ',
        g: 'ᄒ',
        h: 'ᅩ',
        j: 'ᅥ',
        k: 'ᅡ',
        l: 'ᅵ',
        z: 'ᄏ',
        x: 'ᄐ',
        c: 'ᄎ',
        v: 'ᄑ',
        b: 'ᅲ',
        n: 'ᅮ',
        m: 'ᅳ',
        Q: 'ᄈ',
        W: 'ᄍ',
        E: 'ᄄ',
        R: 'ᄁ',
        T: 'ᄊ',
        O: 'ᅤ',
        P: 'ᅨ'
    };
    for (const k in _QK) {
        const U = k.toUpperCase();
        if (!(U in _QK)) _QK[U] = _QK[k];
    }

    function _assemble(buf) {
        const out = [];
        let made = 0,
            orphan = 0,
            i = 0;
        while (i < buf.length) {
            const c = buf[i];
            if (_JL.indexOf(c) >= 0 && i + 1 < buf.length && _JV.indexOf(buf[i + 1]) >= 0) {
                const l = c;
                i++;
                let v = buf[i];
                i++;
                if (i < buf.length && _VMERGE[v + buf[i]]) {
                    v = _VMERGE[v + buf[i]];
                    i++;
                }
                let t = '';
                if (i < buf.length && _L2T[buf[i]]) {
                    if (!(i + 1 < buf.length && _JV.indexOf(buf[i + 1]) >= 0)) {
                        t = _L2T[buf[i]];
                        i++;
                        if (i < buf.length && _L2T[buf[i]] && _TMERGE[t + _L2T[buf[i]]] && !(i + 1 < buf.length && _JV.indexOf(buf[i + 1]) >= 0)) {
                            t = _TMERGE[t + _L2T[buf[i]]];
                            i++;
                        }
                    }
                }
                out.push(_join(l, v, t));
                made++;
            } else {
                out.push(c);
                orphan++;
                i++;
            }
        }
        return {
            text: out.join(''),
            made,
            orphan
        };
    }

    function qwertyToHan(src) {
        const s = String(src || '');
        let out = '',
            buf = [],
            made = 0,
            orphan = 0;
        const flush = () => {
            const r = _assemble(buf);
            out += r.text;
            made += r.made;
            orphan += r.orphan;
            buf = [];
        };
        for (const ch of s) {
            if (_QK[ch]) buf.push(_QK[ch]);
            else {
                flush();
                out += ch;
            }
        }
        flush();
        return {
            text: out,
            made,
            orphan
        };
    }
    const hanScore = s => {
        const r = qwertyToHan(s);
        const t = r.made + r.orphan;
        return t ? r.made / t : 0;
    };
    /* 실측(진짜 영어 29문장 vs 영어로 친 한글 8문장): 진짜 영어 최고 0.67, 영타 한글 최저 0.83 → 0.75 면 양쪽 다 오판 0건.
       영문자 6자 미만은 안 본다 — the→솓, and→뭉, she→녿 처럼 짧은 단어는 우연히 한글이 된다. 임계값 바꾸지 말 것. */
    const IME_MIN_LEN = 6,
        IME_MIN_SCORE = 0.75;

    function maybeKorean(src) {
        const s = String(src || '');
        const letters = (s.match(/[A-Za-z]/g) || []).length;
        if (letters < IME_MIN_LEN) return null;
        if (letters / s.length < 0.6) return null; /* 한글이 섞여 있으면 의도한 영어다 */
        const sc = hanScore(s);
        if (sc < IME_MIN_SCORE) return null;
        const r = qwertyToHan(s);
        if (r.text === s) return null;
        return {
            text: r.text,
            score: sc
        };
    }
    /* 값 넣기 — 네이티브 setter 로 넣어야 React 통제 입력도 onChange 를 받는다. 넣은 뒤 input 이벤트로 앱 상태 갱신 */
    function setVal(el, v) {
        const P = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const d = Object.getOwnPropertyDescriptor(P, 'value');
        if (d && d.set) d.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    }
    const keep = new Set(); /* «영어 맞아요» 라고 답한 글 — 다시 안 묻는다 */
    const escH = t => String(t).replace(/[&<>"]/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    } [c]));

    function chipClose() {
        const c = document.getElementById('_imeChip');
        if (c) c.remove();
    }

    function chip(el, fixed) {
        chipClose();
        const box = document.createElement('div');
        box.className = 'ime-chip';
        box.id = '_imeChip';
        box.innerHTML = '<div class="ic-t">⌨️ 자판이 영어로 되어 있었나 봐요. 혹시 이거예요?</div><div class="ic-g">' + escH(fixed) + '</div>' +
            '<div class="ic-b"><button type="button" class="ic-yes">네, 고쳐줘</button><button type="button" class="ic-no">영어 맞아요</button></div>';
        el.parentNode.insertBefore(box, el.nextSibling);
        box.querySelector('.ic-yes').onclick = () => {
            setVal(el, fixed);
            chipClose();
            el.focus();
        };
        box.querySelector('.ic-no').onclick = () => {
            keep.add(el.value);
            chipClose();
        };
    }

    function fixField(el) {
        const raw = el.value || '';
        if (!raw.trim()) {
            chipClose();
            return;
        }
        const w = fixWidth(raw);
        if (w !== raw) setVal(el, w); /* ①② 조용히 */
        const ko = maybeKorean(el.value);
        if (ko && !keep.has(el.value)) chip(el, ko.text);
        else chipClose(); /* ③ 물어본다 */
    }
    document.addEventListener('focusout', e => {
        const el = e.target;
        if (!el || !el.tagName) return;
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
        if (el.dataset && (el.dataset.ime === 'off' || el.dataset.ime === 'submit')) return; /* off=안 건드림, submit=제출 버튼에서 ask() 로 확인 */
        const ty = (el.type || 'text').toLowerCase();
        if (ty === 'password' || ty === 'number' || ty === 'email' || ty === 'date' || ty === 'range') return;
        setTimeout(() => fixField(el), 0); /* 버튼 클릭이 먼저 먹게 */
    }, true);
    /* 저장 직전 마지막 문 — 붙여넣기 후 바로 저장·엔터 제출은 focusout 을 빠져나간다. 저장 함수 첫 줄에서 v = __ime.ask(v) */
    function ask(v, what) {
        let s = String(v == null ? '' : v);
        if (!s.trim()) return s;
        s = fixWidth(s);
        const ko = maybeKorean(s);
        if (ko && ko.text !== s && !keep.has(s)) {
            if (confirm((what ? ('「' + what + '」 칸에 ') : '') + '자판이 영어로 되어 있었나 봐요.\n\n지금: ' + s + '\n한글로: ' + ko.text + '\n\n한글로 바꿔서 저장할까요?\n(영어가 맞으면 «취소»)')) s = ko.text;
            else keep.add(s);
        }
        return s;
    }
    /* 화면에 «내보내는» 글 — 이미 깨진 채 저장된 것도 보여줄 때만 되살린다(원본 불변, ③은 자동 변환 금지) */
    const disp = s => {
        try {
            return fixWidth(String(s == null ? '' : s));
        } catch (e) {
            return String(s == null ? '' : s);
        }
    };
    window.__ime = {
        fixWidth,
        qwertyToHan,
        maybeKorean,
        ask,
        disp,
        setVal
    };
})();