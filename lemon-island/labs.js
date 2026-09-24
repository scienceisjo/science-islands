(function(root) {
    'use strict';
    /* 레몬 백작의 부탁 — 여섯 개의 실험대.
       실험대 하나 = 한 부탁. 게임(game.js)은 아래 약속만 알고 부른다.
         steps · prediction · principle · safety
         init(tags) · checks(tags) · hint(sim, tags)
         scene(sim) · readings(sim) · note(sim) · controls(sim)
         act(sim, action, data) → {msg, sound} · capture(sim, tags) → {error} | {tag, label, fields, snap}
         after(sim, tags) · figure(record)
       기록 칸(fields): {key, label, kind:'choice'|'number', options, unit, answer, tol, hint} */
    const M = root.IslandModel,
        S = M.solutions,
        I = M.indicators,
        C = M.colors,
        PT = M.particles;
    const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]));
    const W = 1000,
        H = 560;

    /* ── 그림 도구 ─────────────────────────────────── */
    function svg(inner, title) {
        return `<svg class="lab-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><defs><linearGradient id="glassG" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset=".45" stop-color="#eef6f8" stop-opacity=".25"/><stop offset="1" stop-color="#ffffff" stop-opacity=".6"/></linearGradient><linearGradient id="tableG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead9b8"/><stop offset="1" stop-color="#dcc59b"/></linearGradient><radialGradient id="glowG"><stop offset="0" stop-color="#fff6c2" stop-opacity=".95"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient><linearGradient id="phG"><stop offset="0" stop-color="#e0453a"/><stop offset=".3" stop-color="#f3c33f"/><stop offset=".5" stop-color="#5db36d"/><stop offset=".72" stop-color="#3f79d4"/><stop offset="1" stop-color="#6a4bb0"/></linearGradient><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#6b5a3a" flood-opacity=".18"/></filter></defs><rect width="${W}" height="${H}" rx="26" fill="#fbf7ea"/><rect y="${H-92}" width="${W}" height="92" rx="0" fill="url(#tableG)"/><rect y="${H-92}" width="${W}" height="6" fill="#cdb488" opacity=".6"/>${inner}</svg>`;
    }

    function title(text, sub = '') {
        return `<text x="34" y="52" class="t-title">${esc(text)}</text>${sub?`<text x="34" y="82" class="t-sub">${esc(sub)}</text>`:''}`;
    }

    function hit(inner, action, data = {}, label = '', extra = '') {
        const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
        return `<g class="lab-hit ${extra}" role="button" tabindex="0" data-lab="${action}"${attrs} aria-label="${esc(label)}">${inner}</g>`;
    }

    function beaker(x, y, w, h, color, level = .6, opt = {}) {
        const liquidTop = y + h * (1 - level),
            r = 16;
        const liquid = level > 0 ? `<path d="M${x+3} ${liquidTop} L${x+3} ${y+h-r} Q${x+3} ${y+h} ${x+r} ${y+h} L${x+w-r} ${y+h} Q${x+w-3} ${y+h} ${x+w-3} ${y+h-r} L${x+w-3} ${liquidTop} Z" fill="${color}" opacity="${opt.opacity ?? .88}"/><ellipse cx="${x+w/2}" cy="${liquidTop}" rx="${w/2-4}" ry="7" fill="#ffffff" opacity=".28"/>` : '';
        const ticks = Array.from({
            length: 4
        }, (_, i) => `<line x1="${x+8}" x2="${x+26}" y1="${y+h*.25+i*h*.17}" y2="${y+h*.25+i*h*.17}" stroke="#8aa3ad" stroke-width="2" opacity=".6"/>`).join('');
        return `<g filter="url(#soft)">${liquid}<path d="M${x-6} ${y} L${x} ${y+6} L${x} ${y+h-r} Q${x} ${y+h+2} ${x+r} ${y+h+2} L${x+w-r} ${y+h+2} Q${x+w} ${y+h+2} ${x+w} ${y+h-r} L${x+w} ${y+6} L${x+w+6} ${y}" fill="url(#glassG)" stroke="#7d93a0" stroke-width="3.5" stroke-linejoin="round"/>${ticks}${opt.label?`<text x="${x+w/2}" y="${y+h+34}" class="t-label" text-anchor="middle">${esc(opt.label)}</text>`:''}${opt.sub?`<text x="${x+w/2}" y="${y+h+58}" class="t-small" text-anchor="middle">${esc(opt.sub)}</text>`:''}</g>`;
    }

    function tube(x, y, color, level = .55, opt = {}) {
        const w = 58,
            h = 190;
        const liquidTop = y + h * (1 - level);
        return `<g filter="url(#soft)"><path d="M${x+4} ${liquidTop} L${x+4} ${y+h-24} A${w/2-4} ${w/2-4} 0 0 0 ${x+w-4} ${y+h-24} L${x+w-4} ${liquidTop} Z" fill="${color}" opacity=".85"/><path d="M${x} ${y} L${x} ${y+h-24} A${w/2} ${w/2} 0 0 0 ${x+w} ${y+h-24} L${x+w} ${y}" fill="url(#glassG)" stroke="#7d93a0" stroke-width="3.5"/>${opt.inner||''}${opt.label?`<text x="${x+w/2}" y="${y+h+40}" class="t-label" text-anchor="middle">${esc(opt.label)}</text>`:''}</g>`;
    }

    function strip(x, y, color, dipped, w = 34, h = 118) {
        return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.paper}" stroke="#b8a987" stroke-width="2"/><rect x="${x}" y="${y+h*.45}" width="${w}" height="${h*.55}" rx="6" fill="${color}" opacity="${dipped?1:.9}"/></g>`;
    }

    function slot(x, y, w, h, text) {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff6c8" stroke="#dbb444" stroke-width="3" stroke-dasharray="9 6" class="hit-ring"/><text x="${x+w/2}" y="${y+h/2+7}" text-anchor="middle" class="t-slot">${esc(text)}</text>`;
    }

    function spot(x, y, color, label) {
        return `<g><ellipse cx="${x}" cy="${y+4}" rx="36" ry="12" fill="#d8cdb3"/><ellipse cx="${x}" cy="${y}" rx="36" ry="14" fill="#f7f4ec" stroke="#c2b797" stroke-width="2"/>${color?`<ellipse cx="${x}" cy="${y}" rx="24" ry="9" fill="${color}"/>`:''}${label?`<text x="${x}" y="${y+36}" class="t-small" text-anchor="middle">${esc(label)}</text>`:''}</g>`;
    }

    function particle(x, y, sp, r = 22) {
        const p = PT[sp];
        const fill = {
            cation: '#7fca7c',
            anion: '#f2a35b',
            molecule: '#f3d766',
            water: '#7fb5ec'
        } [p.type];
        const stroke = {
            cation: '#4f9a53',
            anion: '#c97a33',
            molecule: '#c4a53a',
            water: '#4f86c4'
        } [p.type];
        const len = Array.from(p.text).length,
            rx = r * (len <= 2 ? 1 : 1 + .2 * (len - 2)),
            fs = Math.max(11, r * (len > 5 ? .62 : .78));
        return `<g><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><text x="${x}" y="${y+fs*.36}" text-anchor="middle" class="t-particle" font-size="${fs}">${esc(p.text)}</text></g>`;
    }

    /* 비커 안 액체 영역에 입자를 고르게 흩뿌린다(같은 입력 → 같은 자리) */
    function scatter(list, box, r) {
        const n = list.length;
        if (!n) return '';
        const cols = Math.max(2, Math.ceil(Math.sqrt(n * box.w / box.h))),
            rows = Math.ceil(n / cols);
        const dx = box.w / cols,
            dy = box.h / rows;
        return list.map((sp, i) => {
            const c = i % cols,
                rr = Math.floor(i / cols);
            const jx = Math.sin(i * 12.9898) * dx * .12,
                jy = Math.cos(i * 78.233) * dy * .12;
            return particle(box.x + dx * (c + .5) + jx, box.y + dy * (rr + .5) + jy, sp, r);
        }).join('');
    }

    function bubbleSet(x, y, w, speed, n = 7) {
        if (!speed || speed === 'none') return '';
        const dur = speed === 'fast' ? 1.1 : 2.6;
        return Array.from({
            length: speed === 'fast' ? n : Math.ceil(n / 2)
        }, (_, i) => `<circle cx="${x+w*(.2+.6*((i*37)%100)/100)}" cy="${y}" r="${3+(i%3)}" fill="#ffffff" stroke="#9bb8c4" stroke-width="1.2" class="rise" style="animation-duration:${dur+(i%3)*.3}s;animation-delay:${(i*.23)%dur}s"/>`).join('');
    }

    function tag(x, y, text, color = '#56735c') {
        return `<text x="${x}" y="${y}" class="t-tag" fill="${color}" text-anchor="middle">${esc(text)}</text>`;
    }

    function choiceField(key, label, options, answer, hint = '') {
        return {
            key,
            label,
            kind: 'choice',
            options,
            answer,
            hint
        };
    }

    function numberField(key, label, unit, answer, hint = '', tol = .005) {
        return {
            key,
            label,
            kind: 'number',
            unit,
            answer,
            tol,
            hint
        };
    }
    const has = (tags, t) => tags.includes(t);
    const toolButton = (sim, tool, label, icon, enabled = true) => `<button type="button" class="tool-btn" data-lab="tool" data-tool="${tool}" aria-pressed="${sim.tool===tool}" ${enabled?'':'disabled'}><span aria-hidden="true">${icon}</span>${esc(label)}</button>`;

    /* ── 이온 이동 실험(산·염기 공용) ─────────────────── */
    function migrationScene(sim, kind) {
        const m = sim.migration,
            negLeft = m.polarity === 'left-neg';
        const px = 150,
            pw = 700,
            py = 250,
            ph = 90,
            mid = px + pw / 2;
        const paper = kind === 'acid' ? C.litmusBlue : C.litmusRed,
            band = kind === 'acid' ? C.litmusRed : C.litmusBlue;
        // 산: 붉은색(H⁺)이 (−)극 쪽으로 / 염기: 푸른색(OH⁻)이 (+)극 쪽으로
        const toLeft = kind === 'acid' ? negLeft : !negLeft;
        const fresh = m.ran && Date.now() - m.ranAt < 2600;
        const reach = m.ran ? 250 : 0;
        const bandX = toLeft ? mid - 18 - reach : mid - 18,
            bandW = 36 + reach;
        const origin = toLeft ? 'right center' : 'left center';
        const left = negLeft ? '−' : '+',
            right = negLeft ? '+' : '−';
        const threadColor = kind === 'acid' ? '#e8e3d0' : '#e8e3d0';
        return `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10" fill="${paper}" opacity=".85" stroke="#8a97a8" stroke-width="3"/><rect x="${bandX}" y="${py+4}" width="${bandW}" height="${ph-8}" rx="8" fill="${band}" opacity=".95" class="${fresh?'migrate-band':''}" style="transform-box:fill-box;transform-origin:${origin}"/><line x1="${mid}" x2="${mid}" y1="${py-40}" y2="${py+ph+40}" stroke="${threadColor}" stroke-width="7" stroke-linecap="round"/><text x="${mid}" y="${py-52}" class="t-small" text-anchor="middle">${kind==='acid'?'묽은 염산을 적신 실':'수산화 나트륨 수용액을 적신 실'}</text><rect x="${px-58}" y="${py+18}" width="58" height="54" rx="10" fill="#8b949e"/><rect x="${px+pw}" y="${py+18}" width="58" height="54" rx="10" fill="#8b949e"/><circle cx="${px-29}" cy="${py+45}" r="22" fill="${left==='+'?'#e0555a':'#3b4b5a'}"/><text x="${px-29}" y="${py+54}" class="t-pole" text-anchor="middle">${left}</text><circle cx="${px+pw+29}" cy="${py+45}" r="22" fill="${right==='+'?'#e0555a':'#3b4b5a'}"/><text x="${px+pw+29}" y="${py+54}" class="t-pole" text-anchor="middle">${right}</text><path d="M${px-29} ${py+18} V${py-70} H${px+pw+29} V${py+18}" fill="none" stroke="${m.ran?'#e0a53a':'#9aa5b0'}" stroke-width="5" stroke-dasharray="${m.ran?'0':'12 8'}"/><rect x="${mid-60}" y="${py-96}" width="120" height="50" rx="10" fill="#3b4b5a"/><text x="${mid}" y="${py-64}" class="t-white" text-anchor="middle">전원 장치</text><text x="${px+pw/2}" y="${py+ph+70}" class="t-small" text-anchor="middle">질산 칼륨 수용액에 적신 ${kind==='acid'?'푸른':'붉은'} 리트머스 종이 · ${m.ran?'전류를 흘렸어요':'아직 전류를 흘리지 않았어요'}</text>`;
    }

    function migrationControls(sim) {
        const m = sim.migration;
        return `<div class="tool-tray"><button type="button" data-lab="flip" ${m.ran?'disabled':''}>⇄ 전극 바꾸기</button><button type="button" class="primary" data-lab="run" ${m.ran?'disabled':''}>▶ 전류 흘리기</button><button type="button" data-lab="rerun">↺ 새 종이로 다시</button></div><p class="compact-rule">지금: 왼쪽 ${m.polarity==='left-neg'?'(−)':'(+)'}극 · 오른쪽 ${m.polarity==='left-neg'?'(+)':'(−)'}극. 전극을 바꿔서 다시 해 봐도 좋아요.</p>`;
    }

    function migrationAct(sim, a) {
        const m = sim.migration;
        if (a === 'flip' && !m.ran) m.polarity = m.polarity === 'left-neg' ? 'left-pos' : 'left-neg';
        if (a === 'run' && !m.ran) {
            m.ran = true;
            m.ranAt = Date.now();
            return {
                sound: 'switch-close'
            };
        }
        if (a === 'rerun') {
            m.ran = false;
            m.ranAt = 0;
        }
    }

    function migrationFields(kind) {
        return kind === 'acid' ? [
            choiceField('side', '붉은색이 넓어진 쪽', ['(+)극 쪽', '(−)극 쪽', '양쪽 똑같이'], '(−)극 쪽', '그림에서 붉은 띠가 어느 전극 쪽으로 넓어졌는지 봐요.'),
            choiceField('charge', '움직인 이온의 전하', ['양(+)전하', '음(−)전하'], '양(+)전하', '(−)극으로 끌려가는 이온은 어떤 전하일까요?'),
            choiceField('ion', '붉은색을 만든 이온', ['H⁺ (수소 이온)', 'Cl⁻ (염화 이온)', 'K⁺ (칼륨 이온)', 'NO₃⁻ (질산 이온)'], 'H⁺ (수소 이온)', 'K⁺·NO₃⁻는 종이 전체에 있었는데 색을 바꾸지 않았어요. 염산에만 있는 양이온은?')
        ] : [
            choiceField('side', '푸른색이 넓어진 쪽', ['(+)극 쪽', '(−)극 쪽', '양쪽 똑같이'], '(+)극 쪽', '그림에서 푸른 띠가 어느 전극 쪽으로 넓어졌는지 봐요.'),
            choiceField('charge', '움직인 이온의 전하', ['양(+)전하', '음(−)전하'], '음(−)전하', '(+)극으로 끌려가는 이온은 어떤 전하일까요?'),
            choiceField('ion', '푸른색을 만든 이온', ['Na⁺ (나트륨 이온)', 'OH⁻ (수산화 이온)', 'K⁺ (칼륨 이온)', 'NO₃⁻ (질산 이온)'], 'OH⁻ (수산화 이온)', 'K⁺·NO₃⁻는 종이 전체에 있었어요. 수산화 나트륨에만 있는 음이온은?')
        ];
    }

    /* ── 이온화 모형 조립(산·염기 공용) ───────────────── */
    function modelInit(list) {
        const counts = {};
        for (const k of list)
            for (const [sp] of M.models[k].parts) counts[k + ':' + sp] = 0;
        return {
            list,
            pick: list[0],
            counts
        };
    }

    function modelScene(sim) {
        const md = sim.model,
            m = M.models[md.pick];
        const parts = m.parts.map(([sp]) => [sp, md.counts[md.pick + ':' + sp] || 0]);
        const listed = parts.flatMap(([sp, n]) => Array(n).fill(sp));
        const total = listed.length,
            r = total > 14 ? 16 : total > 8 ? 19 : 23;
        const charge = parts.reduce((a, [sp, n]) => a + PT[sp].charge * n, 0);
        return `${title(m.label + ' 수용액 모형 만들기', m.label + ' ' + m.dissolved + '개 입자를 물에 녹였어요 · 입자 수를 맞춰 보세요')}${beaker(120,150,420,300,'#d9eef6',.86)}${scatter(listed,{x:140,y:205,w:380,h:230},r)}<g transform="translate(600 150)"><rect width="340" height="300" rx="20" fill="#ffffff" stroke="#e2dccb" stroke-width="2"/><text x="24" y="44" class="t-label">녹인 것</text><text x="24" y="78" class="t-big">${esc(m.formula)} × ${m.dissolved}</text><text x="24" y="130" class="t-label">지금 모형</text>${parts.map(([sp,n],i)=>`<text x="24" y="${166+i*34}" class="t-small">${esc(PT[sp].text)} ${n}개 <tspan fill="#8a9a8c">· ${esc(PT[sp].name)}</tspan></text>`).join('')}<text x="24" y="276" class="t-small" fill="${charge===0?'#3f8f5a':'#c0503a'}">전하의 합: ${charge>0?'+':''}${charge} ${charge===0?'✓ 균형':'— 0이 되어야 해요'}</text></g><g transform="translate(120 490)">${['cation','anion','molecule'].map((t,i)=>`<g transform="translate(${i*190} 0)">${particle(16,0,{cation:'Na+',anion:'Cl-',molecule:'HCl'}[t],12).replace(/>[^<]*<\/text>/,'></text>')}<text x="40" y="6" class="t-small">${['양이온','음이온','녹기만 한 분자'][i]}</text></g>`).join('')}</g>`;
    }

    function modelControls(sim) {
        const md = sim.model,
            m = M.models[md.pick];
        const built = sim.built || {};
        return `<div class="model-picker" role="group" aria-label="모형을 만들 물질">${md.list.map(k=>`<button type="button" data-lab="pick-model" data-model="${k}" aria-pressed="${md.pick===k}">${esc(M.models[k].label)}${built[k]?' ✓':''}</button>`).join('')}</div><div class="counter-list">${m.parts.map(([sp])=>{const key=md.pick+':'+sp,n=md.counts[key]||0;return `<div class="counter-row"><span class="counter-name">${esc(PT[sp].text)}<small>${esc(PT[sp].name)}</small></span><button type="button" data-lab="count" data-key="${esc(key)}" data-delta="-1" aria-label="${esc(PT[sp].text)} 하나 빼기" ${n?'':'disabled'}>−</button><output>${n}</output><button type="button" data-lab="count" data-key="${esc(key)}" data-delta="1" aria-label="${esc(PT[sp].text)} 하나 더하기" ${n>=8?'disabled':''}>+</button></div>`;}).join('')}</div><p class="compact-rule">${m.strength==='weak'?'힌트: 녹은 입자 중 대부분은 분자 그대로 남아요.':'모형이 맞으면 ‘증거 남기기’로 반응식을 골라 기록해요.'}</p>`;
    }

    function modelAct(sim, a, d) {
        const md = sim.model;
        if (a === 'pick-model' && M.models[d.model]) md.pick = d.model;
        if (a === 'count') {
            const k = d.key;
            if (k in md.counts) md.counts[k] = Math.max(0, Math.min(8, (md.counts[k] || 0) + Number(d.delta)));
            return {
                sound: 'click'
            };
        }
    }

    function modelCheck(sim) {
        const md = sim.model,
            m = M.models[md.pick];
        const wrong = m.parts.filter(([sp, n]) => (md.counts[md.pick + ':' + sp] || 0) !== n);
        if (!wrong.length) return null;
        const charge = m.parts.reduce((a, [sp]) => a + PT[sp].charge * (md.counts[md.pick + ':' + sp] || 0), 0);
        if (charge !== 0) return '전하의 합이 0이 아니에요. 양이온과 음이온의 수를 다시 세어 보세요.';
        if (m.strength === 'weak') return `${m.label}은(는) 물에 녹아도 일부만 이온화해요. ${m.dissolved}개 중 1개만 이온이 되고, 나머지는 분자 그대로 남는다고 표현해 보세요.`;
        return `${m.formula} ${m.dissolved}개가 모두 이온으로 나뉘면 각 이온이 몇 개씩 생길까요? 화학식의 숫자(아래 첨자)도 확인해요.`;
    }

    function modelCapture(sim) {
        const err = modelCheck(sim);
        if (err) return {
            error: err
        };
        const md = sim.model,
            m = M.models[md.pick];
        const eqs = {
            HCl: ['HCl → H⁺ + Cl⁻', 'HCl → H₂ + Cl₂', 'HCl → H⁻ + Cl⁺'],
            H2SO4: ['H₂SO₄ → 2H⁺ + SO₄²⁻', 'H₂SO₄ → H₂⁺ + SO₄⁻', 'H₂SO₄ → H⁺ + SO₄⁻'],
            HNO3: ['HNO₃ → H⁺ + NO₃⁻', 'HNO₃ → H + NO₃', 'HNO₃ → N⁺ + HO₃⁻'],
            CH3COOH: ['CH₃COOH ⇄ H⁺ + CH₃COO⁻', 'CH₃COOH → 4H⁺ + C₂O₂⁴⁻', 'CH₃COOH → CH₃⁺ + COOH⁻'],
            NaOH: ['NaOH → Na⁺ + OH⁻', 'NaOH → Na⁻ + OH⁺', 'NaOH → NaO⁻ + H⁺'],
            KOH: ['KOH → K⁺ + OH⁻', 'KOH → K⁻ + OH⁺', 'KOH → KO⁻ + H⁺'],
            CaOH2: ['Ca(OH)₂ → Ca²⁺ + 2OH⁻', 'Ca(OH)₂ → Ca⁺ + OH⁻', 'Ca(OH)₂ → Ca²⁺ + O₂²⁻ + H₂'],
            NH3: ['NH₃ + H₂O ⇄ NH₄⁺ + OH⁻', 'NH₃ → N³⁻ + 3H⁺', 'NH₃ → NH₂⁻ + H⁺']
        } [md.pick];
        const order = [eqs[1], eqs[0], eqs[2]];
        return {
            tag: 'model-' + md.pick,
            label: `${m.label} 이온화 모형 (${m.formula} × ${m.dissolved})`,
            fields: [choiceField('eq', `${m.label}의 이온화 반응식`, order, eqs[0], '내가 만든 모형의 입자와 개수가 그대로 들어간 식을 골라요.'), choiceField('strength', `${m.label}은(는)`, m.kind === 'acid' ? ['강산 — 대부분 이온화', '약산 — 일부만 이온화'] : ['강염기 — 대부분 이온화', '약염기 — 일부만 이온화'], m.kind === 'acid' ? (m.strength === 'strong' ? '강산 — 대부분 이온화' : '약산 — 일부만 이온화') : (m.strength === 'strong' ? '강염기 — 대부분 이온화' : '약염기 — 일부만 이온화'), '모형에서 분자로 남은 입자가 있었나요?')],
            snap: {
                model: md.pick,
                parts: m.parts
            }
        };
    }

    function modelFigure(e) {
        const m = M.models[e.snap?.model];
        if (!m) return '';
        const listed = m.parts.flatMap(([sp, n]) => Array(n).fill(sp));
        return `<svg class="lab-svg" viewBox="0 0 420 240" role="img" aria-label="${esc(m.label)} 모형"><rect width="420" height="240" rx="18" fill="#fbf7ea"/><rect x="20" y="30" width="380" height="180" rx="18" fill="#d9eef6" stroke="#7d93a0" stroke-width="3"/>${scatter(listed,{x:30,y:40,w:360,h:160},listed.length>6?20:24)}<text x="210" y="232" class="t-small" text-anchor="middle">${esc(m.equation)}</text></svg>`;
    }

    /* ── 지시약 검사대(조수 시험·염기·표 공용) ─────────── */
    function indicatorResult(tool, sol) {
        return {
            color: C[I[tool].color(S[sol].pH)],
            word: I[tool].word(S[sol].pH)
        };
    }

    function stripOrDrop(x, y, tool, sol, tested) {
        if (!tested) return '';
        const r = indicatorResult(tool, sol);
        if (tool === 'blueLitmus' || tool === 'redLitmus') return strip(x, y, r.color, true, 30, 96);
        return spot(x + 15, y + 70, r.color);
    }

    const Labs = {};

    /* ═══ 0. 새콤의 즙 — 푸른 리트머스 ═══ */
    Labs[0] = {
        title: '레몬 성 의무실 · 즙 비교대',
        steps: ['세 가지 즙에 푸른 리트머스 종이를 대 보고, 색의 변화를 직접 기록해요.'],
        prediction: ['새콤의 즙에 푸른 리트머스 종이를 대면?', ['건강한 레몬 즙처럼 붉게 변할 것 같아', '색이 변하지 않을 것 같아', '실험으로 확인해 볼래']],
        principle: '푸른 리트머스 종이는 산성 용액에 닿으면 붉게 변해요. 중성이나 염기성 용액에서는 푸른색 그대로예요. 기준이 되는 샘물과 함께 비교하면 차이가 분명해져요.',
        safety: '실험실의 용액은 맛보거나 맨손으로 만지지 않아요. 여기서는 스포이트와 종이로만 살펴봐요.',
        samples: ['lemonJuice', 'sickJuice', 'spring'],
        init() {
            return {
                tested: {}
            };
        },
        checks: tags => [has(tags, 'juice')],
        hint(sim, tags) {
            const next = this.samples.find(s => !sim.tested[s]);
            if (next) return {
                selector: `[data-lab="dip"][data-sample="${next}"]`,
                copy: `${S[next].name} 컵을 눌러 푸른 리트머스 종이를 담가 보세요.`
            };
            if (!has(tags, 'juice')) return {
                selector: '[data-action="capture"]',
                copy: '세 종이의 색을 확인했으면 ‘증거 남기기’로 직접 기록해요.'
            };
            return {
                selector: '[data-action="complete"]',
                copy: '기록을 마쳤어요! ‘부탁 해결하기’를 눌러 레몬 백작에게 알려요.'
            };
        },
        scene(sim) {
            const xs = [140, 425, 710],
                liquids = ['#f6d95a', '#e6e1b9', '#d4ecf6'];
            return svg(`${title('푸른 리트머스 종이로 세 가지 즙 비교','컵을 누르면 새 종이를 한 장씩 담가요')}${this.samples.map((s,i)=>{const x=xs[i],t=!!sim.tested[s];const r=indicatorResult('blueLitmus',s);return hit(`${beaker(x,250,150,190,liquids[i],.55,{label:S[s].name})}${t?strip(x+58,228,r.color,true):slot(x+18,150,114,86,'눌러서 담그기')}${t?tag(x+75,212,r.word.startsWith('붉은')?'붉은색':'푸른색',r.word.startsWith('붉은')?'#c0414a':'#4d73b3'):''}`,'dip',{sample:s},S[s].name+'에 푸른 리트머스 종이 담그기',t?'is-done':'');}).join('')}`, '세 가지 즙과 푸른 리트머스 종이');
        },
        readings: () => '',
        note: () => '푸른 리트머스 종이: 산성이면 붉은색, 중성·염기성이면 그대로 푸른색이에요.',
        controls(sim) {
            const left = this.samples.filter(s => !sim.tested[s]).length;
            return `<div class="tool-tray"><span class="tool-btn" aria-pressed="true"><span aria-hidden="true">📄</span>푸른 리트머스 종이 · 남은 ${left}장</span><button type="button" data-lab="reset">↺ 새 종이로 다시 하기</button></div><p class="compact-rule">그림의 컵을 누르면 종이를 담가요.</p>`;
        },
        act(sim, a, d) {
            if (a === 'dip' && this.samples.includes(d.sample)) {
                sim.tested[d.sample] = true;
                return {
                    sound: 'place'
                };
            }
            if (a === 'reset') sim.tested = {};
        },
        capture(sim) {
            if (this.samples.some(s => !sim.tested[s])) return {
                error: '세 가지 즙에 모두 리트머스 종이를 대 본 뒤 기록해요.'
            };
            return {
                tag: 'juice',
                label: '푸른 리트머스로 세 가지 즙 비교',
                fields: this.samples.map(s => choiceField(s, S[s].name + '에 댄 푸른 리트머스', I.blueLitmus.options, I.blueLitmus.word(S[s].pH), '그림 속 종이 아랫부분의 색을 봐요.')),
                snap: {
                    samples: this.samples
                }
            };
        },
        after() {},
        figure(e) {
            const xs = [60, 190, 320];
            return `<svg class="lab-svg" viewBox="0 0 440 220" role="img" aria-label="리트머스 비교"><rect width="440" height="220" rx="18" fill="#fbf7ea"/>${this.samples.map((s,i)=>`${strip(xs[i]+20,30,indicatorResult('blueLitmus',s).color,true)}<text x="${xs[i]+37}" y="185" class="t-small" text-anchor="middle">${esc(S[s].short)}</text>`).join('')}</svg>`;
        }
    };

    /* ═══ 1. 조수 시험 — 지시약 + 마그네슘 ═══ */
    const L1 = ['A', 'B', 'C', 'D'],
        L1SOL = {
            A: 'HCl',
            B: 'H2SO4',
            C: 'CH3COOH',
            D: 'sugar'
        };
    Labs[1] = {
        title: '에시드 연구실 · 조수 시험대',
        steps: ['푸른 리트머스 종이로 용액 A~D를 검사하고 색을 기록해요.', 'BTB 용액으로 다시 확인하고 색을 기록해요.', '용액에 마그네슘 조각을 넣고, 나오는 기체에 성냥불을 대어 확인해요.'],
        prediction: ['네 용액 중 산을 가려내는 가장 믿을 만한 방법은?', ['지시약의 색 변화로 알 수 있을 것 같아', '용액의 겉모습만 봐도 알 수 있을 것 같아', '실험으로 확인해 볼래']],
        principle: '산 수용액은 푸른 리트머스를 붉게, 초록색 BTB 용액을 노랗게 바꿔요. 마그네슘 같은 금속과 반응해 수소 기체(H₂)를 내놓는데, 성냥불을 대면 ‘펑’ 소리를 내며 타요. 모든 금속이 산과 반응하는 것은 아니에요.',
        safety: '성냥불은 시험관 입구에 잠깐만 대요. 산 수용액이 손에 묻으면 흐르는 물에 씻어요.',
        init(tags) {
            const phase = has(tags, 'btb') ? 2 : has(tags, 'litmus') ? 1 : 0;
            return {
                phase,
                tool: ['blueLitmus', 'btb', 'mg'][phase],
                litmus: {},
                btb: {},
                mg: {},
                match: {}
            };
        },
        checks: tags => [has(tags, 'litmus'), has(tags, 'btb'), has(tags, 'mg')],
        hint(sim, tags) {
            if (sim.phase < 2) {
                const map = sim.phase === 0 ? sim.litmus : sim.btb,
                    next = L1.find(k => !map[k]);
                if (next) return {
                    selector: `[data-lab="apply"][data-cup="${next}"]`,
                    copy: `용액 ${next}의 ${sim.phase===0?'종이 자리':'시험판'}를 눌러 ${sim.phase===0?'푸른 리트머스를 대요':'BTB를 한 방울 떨어뜨려요'}.`
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: '네 용액의 색을 모두 봤어요. ‘증거 남기기’로 기록해요.'
                };
            }
            const noMg = L1.find(k => !sim.mg[k]);
            if (noMg) return {
                selector: sim.tool === 'mg' ? `[data-lab="apply"][data-cup="${noMg}"]` : '[data-lab="tool"][data-tool="mg"]',
                copy: sim.tool === 'mg' ? `시험관 ${noMg}을 눌러 마그네슘 조각을 넣어요.` : '먼저 ‘마그네슘 조각’을 골라요.'
            };
            if (!L1.some(k => sim.match[k] && S[L1SOL[k]].mg !== 'none')) return {
                selector: sim.tool === 'match' ? '[data-lab="apply"][data-cup="A"]' : '[data-lab="tool"][data-tool="match"]',
                copy: sim.tool === 'match' ? '기포가 나오는 시험관 입구에 성냥불을 대 봐요.' : '‘성냥불’을 골라 기포가 나오는 시험관에 대 봐요.'
            };
            if (!has(tags, 'mg')) return {
                selector: '[data-action="capture"]',
                copy: '기포와 성냥불 결과를 ‘증거 남기기’로 기록해요.'
            };
            return {
                selector: '[data-action="complete"]',
                copy: '세 가지 시험을 모두 통과했어요! ‘부탁 해결하기’를 눌러요.'
            };
        },
        name(k, sim) {
            return sim.reveal || sim.phase === 2 ? `${S[L1SOL[k]].name}` : '';
        },
        scene(sim) {
            if (sim.phase < 2) {
                const tool = sim.phase === 0 ? 'blueLitmus' : 'btb',
                    map = sim.phase === 0 ? sim.litmus : sim.btb;
                const xs = [70, 300, 530, 760];
                return svg(`${title(sim.phase===0?'Step 1 · 푸른 리트머스로 산 가려내기':'Step 2 · BTB 용액으로 다시 확인하기',sim.phase===0?'종이 자리를 누르면 그 용액에 종이를 대요':'시험판을 누르면 그 용액과 BTB 한 방울을 섞어요')}${L1.map((k,i)=>{const x=xs[i],t=!!map[k],sol=L1SOL[k],r=indicatorResult(tool,sol);return hit(`${beaker(x,300,150,150,'#dcecf2',.6,{label:'용액 '+k,sub:this.name(k,sim)})}${t?stripOrDrop(x+60,150,tool,sol,true):slot(x+14,150,122,100,sim.phase===0?'종이 대기':'BTB 떨어뜨리기')}${t?tag(x+75,140,r.word,'#4c5a52'):''}`,'apply',{cup:k},`용액 ${k}에 ${I[tool].short} 쓰기`,t?'is-done':'');}).join('')}`, '네 용액과 지시약');
            }
            const xs = [150, 350, 550, 750];
            return svg(`${title('Step 3 · 마그네슘 조각과 성냥불','도구를 고른 뒤 시험관을 눌러요')}<rect x="110" y="420" width="760" height="26" rx="8" fill="#b88a5c"/>${L1.map((k,i)=>{const x=xs[i],sol=L1SOL[k],mg=!!sim.mg[k],rate=mg?S[sol].mg:'none',lit=!!sim.match[k];const inner=`${mg?`<rect x="${x+14}" y="${388}" width="30" height="12" rx="3" fill="#b9c2c8" stroke="#8a949c"/>`:''}${bubbleSet(x+6,392,46,rate)}${lit&&rate!=='none'?`<g class="pop"><path d="M${x+29} 196 l12 -30 l8 22 l20 -12 l-8 24 l24 4 l-24 10 l10 22 l-24 -12 l-10 22 l-6 -24 l-24 8 l14 -20 l-20 -14 z" fill="#ffd34d" stroke="#e39a2b" stroke-width="3"/><text x="${x+29}" y="150" class="t-pop" text-anchor="middle">펑!</text></g>`:lit?`<text x="${x+29}" y="170" class="t-small" text-anchor="middle">변화 없음</text>`:''}`;return hit(tube(x,220,'#dcecf2',.5,{label:'용액 '+k,inner}),'apply',{cup:k},`시험관 ${k}에 ${sim.tool==='match'?'성냥불 대기':'마그네슘 넣기'}`);}).join('')}<text x="490" y="500" class="t-small" text-anchor="middle">A 묽은 염산 · B 묽은 황산 · C 아세트산 수용액 · D 설탕물</text>`, '시험관 네 개와 마그네슘');
        },
        readings: () => '',
        note(sim) {
            return sim.phase < 2 ? (sim.phase === 0 ? '푸른 리트머스: 산성에서 붉은색으로 변해요.' : 'BTB: 산성 노란색 · 중성 초록색 · 염기성 파란색') : '산 수용액 + 마그네슘 → 수소 기체(H₂). 성냥불을 대면 ‘펑’ 소리를 내며 타요.';
        },
        controls(sim) {
            if (sim.phase < 2) return `<div class="tool-tray">${toolButton(sim,sim.phase===0?'blueLitmus':'btb',sim.phase===0?'푸른 리트머스 종이':'BTB 용액',sim.phase===0?'📄':'💧')}<button type="button" data-lab="reset">↺ 다시 하기</button></div><p class="compact-rule">그림의 노란 자리를 눌러요.</p>`;
            return `<div class="tool-tray">${toolButton(sim,'mg','마그네슘 조각','🪨')}${toolButton(sim,'match','성냥불','🔥')}<button type="button" data-lab="reset">↺ 다시 하기</button></div><p class="compact-rule">도구를 고른 뒤 시험관을 눌러요.</p>`;
        },
        act(sim, a, d) {
            if (a === 'tool') sim.tool = d.tool;
            if (a === 'reset') {
                if (sim.phase === 0) sim.litmus = {};
                else if (sim.phase === 1) sim.btb = {};
                else {
                    sim.mg = {};
                    sim.match = {};
                }
            }
            if (a === 'apply' && L1.includes(d.cup)) {
                const k = d.cup;
                if (sim.phase === 0) sim.litmus[k] = true;
                else if (sim.phase === 1) sim.btb[k] = true;
                else if (sim.tool === 'mg') sim.mg[k] = true;
                else if (sim.tool === 'match') {
                    if (!sim.mg[k]) return {
                        msg: '먼저 마그네슘 조각을 넣어야 기체가 생겨요.'
                    };
                    sim.match[k] = true;
                    return {
                        sound: S[L1SOL[k]].mg !== 'none' ? 'success' : 'click'
                    };
                }
                return {
                    sound: 'place'
                };
            }
        },
        capture(sim) {
            if (sim.phase < 2) {
                const map = sim.phase === 0 ? sim.litmus : sim.btb,
                    tool = sim.phase === 0 ? 'blueLitmus' : 'btb';
                if (L1.some(k => !map[k])) return {
                    error: '네 용액을 모두 검사한 뒤 기록해요.'
                };
                return {
                    tag: sim.phase === 0 ? 'litmus' : 'btb',
                    label: sim.phase === 0 ? '푸른 리트머스로 네 용액 검사' : 'BTB 용액으로 네 용액 검사',
                    fields: L1.map(k => choiceField(k, `용액 ${k}`, I[tool].options, I[tool].word(S[L1SOL[k]].pH), '그림에 보이는 색을 골라요.')),
                    snap: {
                        tool
                    }
                };
            }
            if (L1.some(k => !sim.mg[k])) return {
                error: '네 시험관 모두에 마그네슘 조각을 넣어 비교해요. D도 빼놓지 말아요.'
            };
            if (!L1.some(k => sim.match[k] && S[L1SOL[k]].mg !== 'none')) return {
                error: '기포가 나오는 시험관에 성냥불을 대 본 뒤 기록해요.'
            };
            return {
                tag: 'mg',
                label: '산 수용액과 마그네슘의 반응',
                fields: [choiceField('bubbles', '기포가 생긴 용액', ['A·B·C', 'A·B만', 'D만', '모두'], 'A·B·C', '시험관 속 기포를 봐요.'), choiceField('slow', '기포가 가장 느리게 생긴 용액', ['A', 'B', 'C'], 'C', '기포가 드문드문 올라오는 시험관은?'), choiceField('pop', '성냥불을 대었을 때', ['‘펑’ 소리를 내며 탔다', '불꽃이 꺼졌다', '아무 변화가 없었다'], '‘펑’ 소리를 내며 탔다'), choiceField('gas', '나온 기체', ['수소 기체(H₂)', '산소 기체(O₂)', '이산화 탄소(CO₂)'], '수소 기체(H₂)', '‘펑’ 소리를 내며 타는 기체는?')],
                snap: {}
            };
        },
        after(sim, tags) {
            if (sim.phase === 0 && has(tags, 'litmus')) {
                sim.phase = 1;
                sim.tool = 'btb';
            } else if (sim.phase === 1 && has(tags, 'btb')) {
                sim.phase = 2;
                sim.tool = 'mg';
                sim.reveal = true;
            }
        },
        figure(e) {
            if (e.tag === 'mg') return '';
            const tool = e.snap?.tool || 'blueLitmus';
            return `<svg class="lab-svg" viewBox="0 0 480 200" role="img" aria-label="${esc(I[tool].short)} 결과"><rect width="480" height="200" rx="18" fill="#fbf7ea"/>${L1.map((k,i)=>`${stripOrDrop(40+i*110,20,tool,L1SOL[k],true)}<text x="${55+i*110}" y="185" class="t-small" text-anchor="middle">${k}</text>`).join('')}</svg>`;
        }
    };

    /* ═══ 2. 산의 정체 — 전도성 · 이온 이동 · 이온화 모형 ═══ */
    const CONDUCT = ['HCl', 'H2SO4', 'CH3COOH', 'sugar', 'water'],
        CONDUCT_NEED = ['HCl', 'H2SO4', 'CH3COOH', 'sugar'];
    const LED_WORD = {
        bright: '밝게 켜짐',
        dim: '희미하게 켜짐',
        off: '켜지지 않음'
    };
    Labs[2] = {
        title: '에시드의 전기 실험대',
        steps: ['간이 전기 전도 장치로 산 수용액과 설탕물의 전구 밝기를 비교해 기록해요.', '리트머스 종이 위에서 전류를 흘려, 붉은색을 만든 이온을 찾아 기록해요.', '염산·황산·아세트산의 이온화 모형을 만들어 기록해요.'],
        prediction: ['산 수용액에 전류를 흘리면 전구는?', ['켜질 것 같아', '켜지지 않을 것 같아', '산마다 다를 것 같아']],
        principle: '물에 녹아 이온으로 나뉘는 물질(전해질)의 수용액에는 전류가 흘러요. 전류를 흘리면 양이온은 (−)극으로, 음이온은 (+)극으로 움직여요. 산은 물에 녹아 수소 이온(H⁺)을 내놓아요. 대부분 이온화하면 강산, 일부만 이온화하면 약산이에요.',
        safety: '전원은 낮은 전압을 써요. 전극을 바꿀 때는 전류를 끈 상태에서 바꿔요.',
        init(tags) {
            const phase = has(tags, 'migrate-acid') ? 2 : has(tags, 'conduct') ? 1 : 0;
            const built = {};
            for (const k of ['HCl', 'H2SO4', 'CH3COOH', 'HNO3']) built[k] = has(tags, 'model-' + k);
            return {
                phase,
                tested: {},
                cell: null,
                migration: {
                    polarity: 'left-neg',
                    ran: false,
                    ranAt: 0
                },
                model: modelInit(['HCl', 'H2SO4', 'CH3COOH', 'HNO3']),
                built
            };
        },
        checks: tags => [has(tags, 'conduct'), has(tags, 'migrate-acid'), ['HCl', 'H2SO4', 'CH3COOH'].every(k => has(tags, 'model-' + k))],
        hint(sim, tags) {
            if (sim.phase === 0) {
                const next = CONDUCT_NEED.find(k => !sim.tested[k]);
                if (next) return {
                    selector: `[data-lab="pour"][data-sol="${next}"]`,
                    copy: `‘${S[next].name}’ 병을 눌러 전도 장치에 담아 봐요.`
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: '네 용액의 전구 밝기를 봤어요. ‘증거 남기기’로 기록해요.'
                };
            }
            if (sim.phase === 1) {
                if (!sim.migration.ran) return {
                    selector: '[data-lab="run"]',
                    copy: '‘전류 흘리기’를 눌러 붉은색이 어느 쪽으로 넓어지는지 봐요.'
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: '붉은 띠가 넓어진 쪽을 확인했어요. ‘증거 남기기’로 기록해요.'
                };
            }
            const next = ['HCl', 'H2SO4', 'CH3COOH'].find(k => !has(tags, 'model-' + k));
            if (next && sim.model.pick !== next) return {
                selector: `[data-lab="pick-model"][data-model="${next}"]`,
                copy: `${M.models[next].label} 모형을 골라 입자 수를 맞춰 봐요.`
            };
            if (next) {
                const err = modelCheck(sim);
                return err ? {
                    selector: '.counter-list',
                    copy: err
                } : {
                    selector: '[data-action="capture"]',
                    copy: '모형이 맞아요! ‘증거 남기기’로 반응식을 기록해요.'
                };
            }
            return {
                selector: '[data-action="complete"]',
                copy: '산의 정체를 밝힐 증거가 모였어요. ‘부탁 해결하기’를 눌러요.'
            };
        },
        scene(sim) {
            if (sim.phase === 0) {
                const s = sim.cell,
                    led = s ? S[s].conduct : null;
                const glow = led === 'bright' ? '<circle cx="300" cy="150" r="70" fill="url(#glowG)"/>' : led === 'dim' ? '<circle cx="300" cy="150" r="34" fill="url(#glowG)" opacity=".7"/>' : '';
                const table = CONDUCT.map((k, i) => `<text x="640" y="${196+i*44}" class="t-small">${esc(S[k].name)}</text><text x="930" y="${196+i*44}" class="t-small" text-anchor="end" fill="${sim.tested[k]?'#3d5d4a':'#a3ab9f'}">${sim.tested[k]?LED_WORD[S[k].conduct]:'—'}</text>`).join('');
                return svg(`${title('Step 1 · 간이 전기 전도 장치','아래 병을 누르면 그 용액을 전도 장치에 담아요 (농도 1 M)')}${glow}<rect x="248" y="170" width="104" height="54" rx="12" fill="#3b4b5a"/><circle cx="300" cy="150" r="22" fill="${led==='bright'?'#ffe066':led==='dim'?'#f3e3a0':'#d9dde0'}" stroke="#8a949c" stroke-width="3"/><line x1="280" y1="224" x2="280" y2="380" stroke="#8a949c" stroke-width="8"/><line x1="320" y1="224" x2="320" y2="380" stroke="#8a949c" stroke-width="8"/>${beaker(200,300,200,150,s?'#dcecf2':'#f3f6f7',s?.6:0,{label:s?S[s].name:'비어 있음'})}<rect x="610" y="150" width="340" height="250" rx="18" fill="#ffffff" stroke="#e2dccb" stroke-width="2"/><text x="640" y="176" class="t-label">내가 본 전구</text>${table}${CONDUCT.map((k,i)=>hit(`<rect x="${60+i*112}" y="486" width="100" height="44" rx="12" fill="${sim.cell===k?'#fff0b8':'#ffffff'}" stroke="#d8c9a4" stroke-width="2"/><text x="${110+i*112}" y="514" class="t-small" text-anchor="middle">${esc(S[k].short||S[k].name.replace(' 수용액',''))}</text>`,'pour',{sol:k},S[k].name+' 담기')).join('')}`, '간이 전기 전도 장치');
            }
            if (sim.phase === 1) return svg(`${title('Step 2 · 전류를 흘려 움직이는 이온 찾기','전류를 흘리면 이온이 반대 전하의 전극 쪽으로 끌려가요')}${migrationScene(sim,'acid')}`, '리트머스 종이 위 이온의 이동');
            return svg(modelScene(sim), '이온화 모형');
        },
        readings(sim) {
            if (sim.phase !== 0 || !sim.cell) return '';
            const w = LED_WORD[S[sim.cell].conduct];
            return `<div class="reading-row"><div class="reading current"><small>담은 용액</small><b style="font-size:1.1rem">${esc(S[sim.cell].name)}</b></div><div class="reading voltage"><small>전구</small><b style="font-size:1.1rem">${esc(w)}</b></div></div>`;
        },
        note(sim) {
            return ['전구가 켜지면 수용액 속에 움직일 수 있는 이온이 있다는 뜻이에요. 설탕처럼 이온으로 나뉘지 않는 물질의 수용액은 전류가 흐르지 않아요.', '종이 전체에는 질산 칼륨의 K⁺와 NO₃⁻가 있지만 색을 바꾸지 않아요. 색이 바뀐 곳은 실에서 나온 이온이 움직인 자리예요.', '입자 모형: 초록 = 양이온, 주황 = 음이온, 노랑 = 녹기만 하고 이온화하지 않은 분자.'][sim.phase];
        },
        controls(sim) {
            if (sim.phase === 0) return `<p class="compact-rule">그림 아래의 병을 눌러 한 가지씩 담아 봐요. 네 가지(염산·황산·아세트산·설탕물)는 꼭 확인해요.</p><button type="button" data-lab="empty">↺ 장치 비우기</button>`;
            if (sim.phase === 1) return migrationControls(sim);
            return modelControls(sim);
        },
        act(sim, a, d) {
            if (sim.phase === 0) {
                if (a === 'pour' && S[d.sol]) {
                    sim.cell = d.sol;
                    sim.tested[d.sol] = true;
                    return {
                        sound: S[d.sol].conduct === 'off' ? 'click' : 'switch-close'
                    };
                }
                if (a === 'empty') sim.cell = null;
                return;
            }
            if (sim.phase === 1) return migrationAct(sim, a);
            return modelAct(sim, a, d);
        },
        capture(sim) {
            if (sim.phase === 0) {
                const miss = CONDUCT_NEED.filter(k => !sim.tested[k]);
                if (miss.length) return {
                    error: `${miss.map(k=>S[k].name).join(', ')}도 담아 본 뒤 기록해요.`
                };
                const list = CONDUCT.filter(k => sim.tested[k]);
                return {
                    tag: 'conduct',
                    label: '간이 전기 전도 장치로 전구 밝기 비교',
                    fields: list.map(k => choiceField(k, S[k].name + ' (1 M)', ['밝게 켜짐', '희미하게 켜짐', '켜지지 않음'], LED_WORD[S[k].conduct], '오른쪽 표에 적힌 내 관찰을 옮겨 적어요.')),
                    snap: {
                        list
                    }
                };
            }
            if (sim.phase === 1) {
                if (!sim.migration.ran) return {
                    error: '먼저 ‘전류 흘리기’를 눌러 붉은색의 움직임을 관찰해요.'
                };
                return {
                    tag: 'migrate-acid',
                    label: '염산 속 이온의 이동',
                    fields: migrationFields('acid'),
                    snap: {
                        polarity: sim.migration.polarity
                    }
                };
            }
            return modelCapture(sim);
        },
        after(sim, tags) {
            if (sim.phase === 0 && has(tags, 'conduct')) sim.phase = 1;
            else if (sim.phase === 1 && has(tags, 'migrate-acid')) sim.phase = 2;
            for (const k of Object.keys(sim.built)) sim.built[k] = has(tags, 'model-' + k);
            if (sim.phase === 2) {
                const next = ['HCl', 'H2SO4', 'CH3COOH'].find(k => !has(tags, 'model-' + k));
                if (next) sim.model.pick = next;
            }
        },
        figure(e) {
            if (e.tag.startsWith('model-')) return modelFigure(e);
            return '';
        }
    };

    /* ═══ 3. 비눗방울 속 수상한 물질 — 염기 ═══ */
    const L3 = ['A', 'B', 'C', 'D'],
        L3SOL = {
            A: 'NaOH',
            B: 'KOH',
            C: 'CaOH2',
            D: 'sugar'
        };
    const BASE_TOOLS = ['blueLitmus', 'redLitmus', 'btb', 'pp'];
    Labs[3] = {
        title: '베이스 연구실 · 염기 실험대',
        steps: ['염기를 알려 주는 지시약 두 가지를 골라 용액 A~D를 검사하고 기록해요.', '리트머스 종이 위에서 전류를 흘려, 푸른색을 만든 이온을 찾아 기록해요.', '수산화 나트륨·수산화 칼슘·암모니아의 이온화 모형을 만들어 기록해요.'],
        prediction: ['비눗방울 물질 같은 염기에 BTB를 떨어뜨리면?', ['노란색', '초록색', '파란색']],
        principle: '염기 수용액은 붉은 리트머스를 푸르게, BTB를 파랗게, 페놀프탈레인을 붉게 바꿔요. 염기는 물에 녹아 수산화 이온(OH⁻)을 내놓아요. 푸른 리트머스는 염기에서 변하지 않아서 염기를 찾는 데는 쓸모가 적어요.',
        safety: '염기 수용액은 단백질을 녹여 미끌거려요. 그래서 맨손으로 만지지 않고 장갑과 보안경을 써요.',
        init(tags) {
            const phase = has(tags, 'migrate-base') ? 2 : this.indicatorDone(tags) ? 1 : 0;
            const built = {};
            for (const k of ['NaOH', 'CaOH2', 'NH3', 'KOH']) built[k] = has(tags, 'model-' + k);
            return {
                phase,
                tool: 'redLitmus',
                tests: {
                    blueLitmus: {},
                    redLitmus: {},
                    btb: {},
                    pp: {}
                },
                migration: {
                    polarity: 'left-neg',
                    ran: false,
                    ranAt: 0
                },
                model: modelInit(['NaOH', 'CaOH2', 'NH3', 'KOH']),
                built
            };
        },
        indicatorDone: tags => ['ind-redLitmus', 'ind-btb', 'ind-pp'].filter(t => tags.includes(t)).length >= 2,
        checks(tags) {
            return [this.indicatorDone(tags), has(tags, 'migrate-base'), ['NaOH', 'CaOH2', 'NH3'].every(k => has(tags, 'model-' + k))];
        },
        hint(sim, tags) {
            if (sim.phase === 0) {
                if (has(tags, 'ind-blueLitmus') && !this.indicatorDone(tags) && sim.tool === 'blueLitmus') return {
                    selector: '[data-lab="tool"][data-tool="redLitmus"]',
                    copy: '푸른 리트머스는 염기에서 변하지 않았죠? 염기를 알려 주는 다른 지시약을 골라 봐요.'
                };
                const map = sim.tests[sim.tool],
                    next = L3.find(k => !map[k]);
                if (next) return {
                    selector: `[data-lab="apply"][data-cup="${next}"]`,
                    copy: `용액 ${next}의 자리를 눌러 ${I[sim.tool].short}(으)로 검사해요.`
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: `${I[sim.tool].short} 결과를 ‘증거 남기기’로 기록해요. 염기를 알려 주는 지시약 두 가지가 필요해요.`
                };
            }
            if (sim.phase === 1) return !sim.migration.ran ? {
                selector: '[data-lab="run"]',
                copy: '‘전류 흘리기’를 눌러 푸른색이 어느 쪽으로 넓어지는지 봐요.'
            } : {
                selector: '[data-action="capture"]',
                copy: '푸른 띠가 넓어진 쪽을 확인했어요. ‘증거 남기기’로 기록해요.'
            };
            const next = ['NaOH', 'CaOH2', 'NH3'].find(k => !has(tags, 'model-' + k));
            if (next && sim.model.pick !== next) return {
                selector: `[data-lab="pick-model"][data-model="${next}"]`,
                copy: `${M.models[next].label} 모형을 골라 입자 수를 맞춰 봐요.`
            };
            if (next) {
                const err = modelCheck(sim);
                return err ? {
                    selector: '.counter-list',
                    copy: err
                } : {
                    selector: '[data-action="capture"]',
                    copy: '모형이 맞아요! ‘증거 남기기’로 기록해요.'
                };
            }
            return {
                selector: '[data-action="complete"]',
                copy: '염기의 정체를 밝혔어요! ‘부탁 해결하기’를 눌러요.'
            };
        },
        scene(sim) {
            if (sim.phase === 0) {
                const xs = [70, 300, 530, 760],
                    tool = sim.tool,
                    map = sim.tests[tool];
                const badges = k => BASE_TOOLS.filter(t => sim.tests[t][k]).map((t, i) => {
                    const r = indicatorResult(t, L3SOL[k]);
                    return `<g transform="translate(${i*36} 0)"><circle r="14" fill="${r.color}" stroke="#ffffff" stroke-width="3"/><text y="34" class="t-mini" text-anchor="middle">${{blueLitmus:'푸리',redLitmus:'붉리',btb:'BTB',pp:'페놀'}[t]}</text></g>`;
                }).join('');
                return svg(`${title('Step 1 · 염기를 알려 주는 지시약 고르기','오른쪽에서 지시약을 고르고 용액 자리를 눌러요')}${L3.map((k,i)=>{const x=xs[i],t=!!map[k],r=indicatorResult(tool,L3SOL[k]);return hit(`${beaker(x,300,150,150,k==='C'?'#e6f0f0':'#dcecf2',.6,{label:'용액 '+k,sub:S[L3SOL[k]].short||S[L3SOL[k]].name})}${t?stripOrDrop(x+60,150,tool,L3SOL[k],true):slot(x+14,150,122,100,I[tool].short)}${t?tag(x+75,140,r.word,'#4c5a52'):''}<g transform="translate(${x+22} 270)">${badges(k)}</g>`,'apply',{cup:k},`용액 ${k}를 ${I[tool].short}(으)로 검사`,t?'is-done':'');}).join('')}`, '네 용액과 여러 지시약');
            }
            if (sim.phase === 1) return svg(`${title('Step 2 · 전류를 흘려 움직이는 이온 찾기','이번엔 붉은 리트머스 종이 위에 수산화 나트륨 수용액을 적신 실을 올렸어요')}${migrationScene(sim,'base')}`, '리트머스 종이 위 이온의 이동');
            return svg(modelScene(sim), '이온화 모형');
        },
        readings: () => '',
        note(sim) {
            return ['지시약마다 알려 주는 것이 달라요. 염기에서 색이 변하는 지시약을 찾아 보세요.', '종이 전체의 K⁺와 NO₃⁻는 색을 바꾸지 않아요. 색이 바뀐 곳은 실에서 나온 이온이 움직인 자리예요.', '암모니아는 물과 반응해 OH⁻를 조금만 내놓아요(약염기). 입자 모형에서는 대부분 NH₃ 분자로 남겨요.'][sim.phase];
        },
        controls(sim) {
            if (sim.phase === 0) return `<div class="tool-tray">${toolButton(sim,'blueLitmus','푸른 리트머스','📘')}${toolButton(sim,'redLitmus','붉은 리트머스','📕')}${toolButton(sim,'btb','BTB 용액','💧')}${toolButton(sim,'pp','페놀프탈레인','🧴')}</div><p class="compact-rule">지금 고른 지시약: <b>${esc(I[sim.tool].name)}</b> · 한 지시약으로 네 용액을 다 검사하면 기록할 수 있어요.</p>`;
            if (sim.phase === 1) return migrationControls(sim);
            return modelControls(sim);
        },
        act(sim, a, d) {
            if (sim.phase === 0) {
                if (a === 'tool' && BASE_TOOLS.includes(d.tool)) sim.tool = d.tool;
                if (a === 'apply' && L3.includes(d.cup)) {
                    sim.tests[sim.tool][d.cup] = true;
                    return {
                        sound: 'place'
                    };
                }
                return;
            }
            if (sim.phase === 1) return migrationAct(sim, a);
            return modelAct(sim, a, d);
        },
        capture(sim, tags) {
            if (sim.phase === 0) {
                const tool = sim.tool,
                    map = sim.tests[tool];
                if (L3.some(k => !map[k])) return {
                    error: `${I[tool].short}(으)로 네 용액을 모두 검사한 뒤 기록해요.`
                };
                return {
                    tag: 'ind-' + tool,
                    label: `${I[tool].name}로 네 용액 검사`,
                    fields: L3.map(k => choiceField(k, `용액 ${k} (${S[L3SOL[k]].short||S[L3SOL[k]].name})`, I[tool].options, I[tool].word(S[L3SOL[k]].pH), '그림에 보이는 색을 골라요.')),
                    snap: {
                        tool
                    }
                };
            }
            if (sim.phase === 1) {
                if (!sim.migration.ran) return {
                    error: '먼저 ‘전류 흘리기’를 눌러 푸른색의 움직임을 관찰해요.'
                };
                return {
                    tag: 'migrate-base',
                    label: '수산화 나트륨 수용액 속 이온의 이동',
                    fields: migrationFields('base'),
                    snap: {
                        polarity: sim.migration.polarity
                    }
                };
            }
            return modelCapture(sim);
        },
        after(sim, tags) {
            if (sim.phase === 0 && this.indicatorDone(tags)) sim.phase = 1;
            else if (sim.phase === 1 && has(tags, 'migrate-base')) sim.phase = 2;
            for (const k of Object.keys(sim.built)) sim.built[k] = has(tags, 'model-' + k);
            if (sim.phase === 2) {
                const next = ['NaOH', 'CaOH2', 'NH3'].find(k => !has(tags, 'model-' + k));
                if (next) sim.model.pick = next;
            }
        },
        figure(e) {
            if (e.tag.startsWith('model-')) return modelFigure(e);
            if (e.tag.startsWith('ind-')) {
                const tool = e.snap?.tool;
                if (!I[tool]) return '';
                return `<svg class="lab-svg" viewBox="0 0 480 200" role="img" aria-label="${esc(I[tool].short)} 결과"><rect width="480" height="200" rx="18" fill="#fbf7ea"/>${L3.map((k,i)=>`${stripOrDrop(40+i*110,20,tool,L3SOL[k],true)}<text x="${55+i*110}" y="185" class="t-small" text-anchor="middle">${k}</text>`).join('')}</svg>`;
            }
            return '';
        }
    };

    /* ═══ 4. 중화병의 원인 — 혼합 실험 ★ ═══ */
    Labs[4] = {
        title: '베이스의 혼합 실험대',
        steps: ['염산을 넣기 전(0 mL)과 10 mL 넣었을 때의 색·온도·입자를 기록해요.', '용액이 초록색이 되는 순간을 기록해요.', '염산을 더 넣어 40 mL가 되었을 때를 기록해요.'],
        prediction: ['염기성 용액에 산을 계속 넣으면 BTB 색은?', ['계속 파란색일 것 같아', '초록색을 거쳐 노란색이 될 것 같아', '바로 노란색이 될 것 같아']],
        principle: '산의 H⁺와 염기의 OH⁻가 만나면 물(H₂O)이 돼요(중화 반응: H⁺ + OH⁻ → H₂O). 이때 열이 나와 온도가 올라가요. 같은 수만큼 만나면 중성, H⁺가 남으면 산성, OH⁻가 남으면 염기성이에요. Na⁺와 Cl⁻는 반응하지 않고 물속에 그대로 있어요.',
        safety: '두 용액은 같은 농도로 맞췄어요. 온도는 손으로 만지지 않고 온도계로 재요.',
        init(tags) {
            return {
                hcl: has(tags, 'mix-0') && has(tags, 'mix-10') ? (has(tags, 'mix-20') ? 20 : 10) : 0
            };
        },
        checks: tags => [has(tags, 'mix-0') && has(tags, 'mix-10'), has(tags, 'mix-20'), has(tags, 'mix-40')],
        hint(sim, tags) {
            const want = !has(tags, 'mix-0') ? 0 : !has(tags, 'mix-10') ? 10 : !has(tags, 'mix-20') ? 20 : !has(tags, 'mix-40') ? 40 : null;
            if (want === null) return {
                selector: '[data-action="complete"]',
                copy: '세 구간을 모두 기록했어요! ‘부탁 해결하기’를 눌러요.'
            };
            if (sim.hcl < want) return {
                selector: '[data-lab="add"]',
                copy: `염산을 ${want} mL까지 넣어 봐요. (지금 ${sim.hcl} mL)`
            };
            if (sim.hcl > want) return {
                selector: '[data-lab="undo"]',
                copy: `${want} mL 때를 기록해야 해요. ‘10 mL 되돌리기’로 돌아가요.`
            };
            return {
                selector: '[data-action="capture"]',
                copy: `지금 ${want} mL예요. 색·온도·입자 수를 보고 ‘증거 남기기’로 기록해요.`
            };
        },
        scene(sim) {
            const m = M.mix(sim.hcl);
            const listed = [...Array(m.Na).fill('Na+'), ...Array(m.Cl).fill('Cl-'), ...Array(m.H).fill('H+'), ...Array(m.OH).fill('OH-'), ...Array(m.water).fill('H2O')];
            const level = .3 + (20 + sim.hcl) / 60 * .55;
            const temp = m.temp,
                tH = Math.max(0, Math.min(1, (temp - 15) / 15));
            return svg(`${title('수산화 나트륨 수용액 20 mL + BTB','묽은 염산을 10 mL씩 넣어요 · 두 용액의 농도는 같아요')}<g transform="translate(0 0)"><rect x="186" y="96" width="30" height="120" rx="8" fill="#eef6f8" stroke="#7d93a0" stroke-width="3"/><rect x="190" y="${100+ (1-(40-sim.hcl)/40)*112}" width="22" height="${(40-sim.hcl)/40*112}" rx="5" fill="#dcecf2"/><path d="M193 216 L209 216 L203 238 L199 238 Z" fill="#7d93a0"/><text x="232" y="140" class="t-small">묽은 염산</text><text x="232" y="164" class="t-small">남은 양 ${40-sim.hcl} mL</text></g>${beaker(90,250,280,200,C[m.color],level)}<text x="230" y="498" class="t-label" text-anchor="middle">넣은 염산 ${sim.hcl} mL · ${m.colorWord}</text><g transform="translate(410 250)"><rect x="-10" y="0" width="20" height="170" rx="10" fill="#ffffff" stroke="#7d93a0" stroke-width="3"/><rect x="-5" y="${160-tH*150}" width="10" height="${tH*150+4}" rx="5" fill="#e0555a"/><circle cy="182" r="18" fill="#e0555a" stroke="#7d93a0" stroke-width="3"/><text x="0" y="-12" class="t-small" text-anchor="middle">${temp.toFixed(1)} °C</text></g><g transform="translate(470 110)"><rect width="500" height="340" rx="22" fill="#ffffff" stroke="#e2dccb" stroke-width="2"/><text x="24" y="40" class="t-label">비커 속 입자 (10 mL에 이온 한 쌍)</text>${scatter(listed,{x:20,y:60,w:460,h:260},listed.length>8?26:30)}</g>`, '중화 반응 실험');
        },
        readings(sim) {
            const m = M.mix(sim.hcl);
            return `<div class="reading-row"><div class="reading current"><small>넣은 염산</small><b>${sim.hcl}</b><em>mL</em></div><div class="reading voltage"><small>BTB 색</small><b style="font-size:1.1rem">${m.colorWord}</b></div><div class="reading resistance"><small>온도</small><b>${m.temp.toFixed(1)}</b><em>°C</em></div></div>`;
        },
        note: () => '입자 모형: 초록 = 양이온, 주황 = 음이온, 파랑 = 물 분자. H⁺와 OH⁻가 만나면 물이 되고, Na⁺와 Cl⁻는 물속에 그대로 남아요.',
        controls(sim) {
            return `<div class="tool-tray"><button type="button" class="primary" data-lab="add" ${sim.hcl>=40?'disabled':''}>💧 염산 10 mL 넣기</button><button type="button" data-lab="undo" ${sim.hcl<=0?'disabled':''}>↶ 10 mL 되돌리기</button><button type="button" data-lab="restart">↺ 처음부터</button></div><p class="compact-rule">기록할 때: 0·10·20·40 mL. 30 mL도 관찰해 볼 수 있어요.</p>`;
        },
        act(sim, a) {
            if (a === 'add' && sim.hcl < 40) {
                sim.hcl += 10;
                return {
                    sound: 'place'
                };
            }
            if (a === 'undo' && sim.hcl > 0) sim.hcl -= 10;
            if (a === 'restart') sim.hcl = 0;
        },
        capture(sim) {
            const m = M.mix(sim.hcl);
            return {
                tag: 'mix-' + sim.hcl,
                label: `수산화 나트륨 수용액 20 mL + 염산 ${sim.hcl} mL`,
                fields: [choiceField('color', 'BTB 색', I.btb.options, m.colorWord, '비커 속 용액의 색을 봐요.'), numberField('temp', '온도', '°C', m.temp, '온도계 위에 적힌 값을 옮겨 적어요.', .05), numberField('water', '만들어진 물 분자(H₂O) 수', '개', m.water, '파란 물 분자를 세어요.'), numberField('H', '남은 H⁺ 수', '개', m.H, '초록 H⁺ 입자를 세어요.'), numberField('OH', '남은 OH⁻ 수', '개', m.OH, '주황 OH⁻ 입자를 세어요.')],
                snap: {
                    hcl: sim.hcl
                }
            };
        },
        after(sim, tags) {},
        figure(e) {
            const h = e.snap?.hcl;
            if (!Number.isFinite(h)) return '';
            const m = M.mix(h);
            const listed = [...Array(m.Na).fill('Na+'), ...Array(m.Cl).fill('Cl-'), ...Array(m.H).fill('H+'), ...Array(m.OH).fill('OH-'), ...Array(m.water).fill('H2O')];
            return `<svg class="lab-svg" viewBox="0 0 460 250" role="img" aria-label="염산 ${h} mL 입자 모형"><rect width="460" height="250" rx="18" fill="#fbf7ea"/><rect x="20" y="20" width="120" height="190" rx="14" fill="${C[m.color]}" opacity=".85" stroke="#7d93a0" stroke-width="3"/><text x="80" y="238" class="t-small" text-anchor="middle">염산 ${h} mL</text>${scatter(listed,{x:160,y:24,w:280,h:200},22)}</svg>`;
        }
    };

    /* ═══ 5. 경계 마을을 지켜라 — 치료 · 지시약 표 · 미지 시료 ═══ */
    const ROWS = [
            ['acid', 'HCl', '산성 · 묽은 염산'],
            ['neutral', 'water', '중성 · 증류수'],
            ['base', 'NaOH', '염기성 · 수산화 나트륨 수용액']
        ],
        TABLE_TOOLS = ['mo', 'btb', 'pp'];
    const UNKNOWN = [
            ['u1', 'vinegar', '시료 ①'],
            ['u2', 'well', '시료 ②'],
            ['u3', 'bubble', '시료 ③']
        ],
        UNKNOWN_TOOLS = ['mo', 'pp'];
    Labs[5] = {
        title: '경계 마을 광장 · 치료와 안내 실험대',
        steps: ['새콤의 체액 모형에 산성 치료제를 넣어, 레몬 종족의 건강 범위(pH 2.5~3.5)에 맞춰 기록해요.', '메틸 오렌지·BTB·페놀프탈레인으로 산성·중성·염기성 용액의 색을 표로 정리해요.', '마을 창고의 시료 ①②③을 남은 두 지시약으로 검사해 산성·중성·염기성을 가려내요.'],
        prediction: ['새콤을 치료하려면 몸을 어느 상태로 되돌려야 할까?', ['중성(pH 7)', '레몬 종족에게 알맞은 산성', '더 강한 염기성']],
        principle: 'pH는 산성·염기성의 세기를 나타내요. 7이 중성이고, 7보다 작을수록 산성, 클수록 염기성이 강해요. 치료제의 H⁺는 몸속에 남은 OH⁻와 먼저 중화된 뒤에야 산성을 만들어요. 레몬 종족은 알맞은 산성일 때 건강해요 — 중성이 언제나 좋은 상태인 것은 아니에요.',
        safety: '치료제는 한 방울씩 넣고 pH를 확인해요. 너무 많이 넣으면 지나치게 강한 산성이 돼요.',
        init(tags) {
            const phase = has(tags, 'unknown') || TABLE_TOOLS.every(t => has(tags, 'table-' + t)) ? 2 : has(tags, 'cure') ? 1 : 0;
            return {
                phase,
                drops: 0,
                tool: 'mo',
                table: {
                    mo: {},
                    btb: {},
                    pp: {}
                },
                unknown: {
                    mo: {},
                    pp: {}
                }
            };
        },
        checks: tags => [has(tags, 'cure'), TABLE_TOOLS.every(t => has(tags, 'table-' + t)), has(tags, 'unknown')],
        hint(sim, tags) {
            if (sim.phase === 0) {
                const c = M.cure(sim.drops);
                if (c.tooAcid) return {
                    selector: '[data-lab="restart"]',
                    copy: '너무 강한 산성이 됐어요. ‘처음부터 다시’를 눌러 한 방울씩 넣어 봐요.'
                };
                if (!c.inBand) return {
                    selector: '[data-lab="drop"]',
                    copy: `지금 pH ${c.pH} — 치료제를 한 방울 더 넣고 다시 확인해요.`
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: `pH ${c.pH} — 건강 범위에 들어왔어요! ‘증거 남기기’로 기록해요.`
                };
            }
            if (sim.phase === 1) {
                const tool = TABLE_TOOLS.find(t => !has(tags, 'table-' + t));
                if (tool && sim.tool !== tool) return {
                    selector: `[data-lab="tool"][data-tool="${tool}"]`,
                    copy: `${I[tool].short}을(를) 골라 세 용액에 떨어뜨려 봐요.`
                };
                const row = ROWS.find(([r]) => !sim.table[sim.tool][r]);
                if (row) return {
                    selector: `[data-lab="cell"][data-row="${row[0]}"]`,
                    copy: `${row[2]} 칸을 눌러 ${I[sim.tool].short}을(를) 떨어뜨려요.`
                };
                return {
                    selector: '[data-action="capture"]',
                    copy: `${I[sim.tool].short} 줄을 ‘증거 남기기’로 기록해요.`
                };
            }
            const miss = UNKNOWN_TOOLS.flatMap(t => UNKNOWN.filter(([u]) => !sim.unknown[t][u]).map(([u]) => [t, u]));
            if (miss.length) {
                const [t, u] = miss[0];
                return sim.tool !== t ? {
                    selector: `[data-lab="tool"][data-tool="${t}"]`,
                    copy: `${I[t].short}을(를) 골라요.`
                } : {
                    selector: `[data-lab="sample"][data-u="${u}"]`,
                    copy: `${UNKNOWN.find(x=>x[0]===u)[2]}을 눌러 ${I[t].short}을(를) 떨어뜨려요.`
                };
            }
            if (!has(tags, 'unknown')) return {
                selector: '[data-action="capture"]',
                copy: '두 지시약의 결과를 함께 보고 ‘증거 남기기’로 판정을 기록해요.'
            };
            return {
                selector: '[data-action="complete"]',
                copy: '마을을 지킬 준비가 끝났어요! ‘부탁 해결하기’를 눌러요.'
            };
        },
        scene(sim) {
            if (sim.phase === 0) {
                const c = M.cure(sim.drops),
                    healthy = c.inBand,
                    skin = healthy ? '#f7d23a' : c.tooAcid ? '#f0c64a' : '#d8d3a6';
                const gx = x => 560 + x / 14 * 380;
                return svg(`${title('새콤의 체액 모형에 산성 치료제 넣기','한 방울씩 넣고 pH를 확인해요 · 목표: 레몬 종족의 건강 범위')}<g transform="translate(150 270)"><ellipse cx="0" cy="190" rx="90" ry="12" fill="#000" opacity=".08"/><rect x="-44" y="70" width="88" height="96" rx="36" fill="#f2a54a"/><ellipse cx="0" cy="10" rx="74" ry="90" fill="${skin}" stroke="#c9b45a" stroke-width="3"/><path d="M0 -80 L-10 -104 L10 -104 Z" fill="${skin}"/><ellipse cx="26" cy="-92" rx="24" ry="8" fill="#5fa54a" transform="rotate(-20 26 -92)"/><circle cx="-24" cy="0" r="7" fill="#2f332c"/><circle cx="24" cy="0" r="7" fill="#2f332c"/><path d="M-16 30 Q0 ${healthy?44:24} 16 30" fill="none" stroke="#6d3b2f" stroke-width="4" stroke-linecap="round"/><text x="0" y="214" class="t-label" text-anchor="middle">새콤 ${healthy?'· 기운이 돌아와요!':c.tooAcid?'· 너무 시큼해요!':'· 기운이 없어요'}</text></g><g transform="translate(330 260)">${beaker(0,40,110,150,C[c.btbColor],.62,{label:'체액 모형 + BTB'})}</g><g transform="translate(360 150)"><rect x="0" y="0" width="54" height="120" rx="12" fill="#f5e7b0" stroke="#c9a74a" stroke-width="3"/><text x="27" y="-10" class="t-small" text-anchor="middle">산성 치료제</text><path d="M18 120 L36 120 L30 150 L24 150 Z" fill="#c9a74a"/><text x="27" y="70" class="t-small" text-anchor="middle">${c.drops}방울</text></g><g><rect x="540" y="140" width="420" height="250" rx="22" fill="#ffffff" stroke="#e2dccb" stroke-width="2"/><text x="566" y="182" class="t-label">pH 측정기</text><text x="936" y="186" class="t-big" text-anchor="end" fill="${healthy?'#3f8f5a':c.tooAcid?'#c0503a':'#4d5b52'}">pH ${c.pH.toFixed(1)}</text><rect x="560" y="236" width="380" height="26" rx="13" fill="url(#phG)"/><rect x="${gx(M.cureBand[0])}" y="226" width="${gx(M.cureBand[1])-gx(M.cureBand[0])}" height="46" rx="10" fill="none" stroke="#3f8f5a" stroke-width="4"/><text x="${(gx(M.cureBand[0])+gx(M.cureBand[1]))/2}" y="296" class="t-mini" text-anchor="middle" fill="#3f8f5a">건강 범위</text><path d="M${gx(c.pH)} 222 l-10 -18 h20 z" fill="#3b4b5a"/>${[0,7,14].map(v=>`<text x="${gx(v)}" y="330" class="t-mini" text-anchor="middle">${v}</text>`).join('')}<text x="${gx(0)}" y="352" class="t-mini">산성</text><text x="${gx(7)}" y="352" class="t-mini" text-anchor="middle">중성</text><text x="${gx(14)}" y="352" class="t-mini" text-anchor="end">염기성</text></g>`, '새콤의 치료');
            }
            if (sim.phase === 1) {
                const cols = [{
                    key: 'litmus',
                    name: '리트머스 종이',
                    known: true
                }, ...TABLE_TOOLS.map(t => ({
                    key: t,
                    name: I[t].short
                }))];
                const cx = i => 330 + i * 160;
                return svg(`${title('마을 사람을 위한 지시약 사용법 표','지시약을 고르고 표의 칸을 누르면 그 용액에 떨어뜨려요')}${cols.map((c,i)=>`<text x="${cx(i)}" y="130" class="t-label" text-anchor="middle" fill="${c.key===sim.tool?'#2f6f55':'#4a5a50'}">${esc(c.name)}</text>${c.key===sim.tool?`<rect x="${cx(i)-70}" y="100" width="140" height="${360}" rx="16" fill="#fff7cf" opacity=".6"/>`:''}`).join('')}${ROWS.map(([r,sol,label],j)=>{const y=190+j*110;return `<text x="40" y="${y+8}" class="t-small">${esc(label)}</text>${cols.map((c,i)=>{if(c.known){const w=S[sol].pH<7?'푸른 → 붉은색':S[sol].pH>7?'붉은 → 푸른색':'변화 없음';return `<text x="${cx(i)}" y="${y+8}" class="t-mini" text-anchor="middle" fill="#7c8a80">${w}</text>`;}const t=!!sim.table[c.key][r];const res=indicatorResult(c.key,sol);const cell=t?`${spot(cx(i),y-6,res.color)}<text x="${cx(i)}" y="${y+34}" class="t-mini" text-anchor="middle">${esc(res.word)}</text>`:`<rect x="${cx(i)-50}" y="${y-30}" width="100" height="56" rx="12" fill="#fffdf4" stroke="${c.key===sim.tool?'#dbb444':'#e2dccb'}" stroke-width="2.5" stroke-dasharray="7 5"/><text x="${cx(i)}" y="${y+4}" class="t-mini" text-anchor="middle" fill="#a0977c">${c.key===sim.tool?'눌러서 떨어뜨리기':''}</text>`;return c.key===sim.tool&&!t?hit(cell,'cell',{row:r},`${label}에 ${I[c.key].short} 떨어뜨리기`):cell;}).join('')}`;}).join('')}`, '지시약 사용법 표');
            }
            const xs = [180, 460, 740];
            return svg(`${title('마을 창고의 수상한 시료','남은 지시약은 메틸 오렌지와 페놀프탈레인뿐이에요')}${UNKNOWN.map(([u,sol,label],i)=>{const x=xs[i];const res=UNKNOWN_TOOLS.map(t=>sim.unknown[t][u]?indicatorResult(t,sol):null);const card = `<rect x="${x-118}" y="118" width="236" height="120" rx="16" fill="#ffffff" stroke="#e2dccb" stroke-width="2"/>${UNKNOWN_TOOLS.map((t,k)=>{const y=150+k*54;return `<text x="${x-104}" y="${y+6}" class="t-mini">${esc(I[t].short)}</text>${res[k]?`<circle cx="${x+36}" cy="${y}" r="14" fill="${res[k].color}" stroke="#c2b797" stroke-width="2"/><text x="${x+58}" y="${y+6}" class="t-mini">${esc(res[k].word)}</text>`:`<text x="${x+36}" y="${y+6}" class="t-mini" text-anchor="middle" fill="#a0977c">?</text>`}`;}).join('')}`;return hit(`${beaker(x-70,270,140,170,'#e9eef0',.6,{label})}${card}`,'sample',{u},`${label}에 ${I[sim.tool].short} 떨어뜨리기`);}).join('')}`, '정체 모를 시료 세 가지');
        },
        readings(sim) {
            if (sim.phase !== 0) return '';
            const c = M.cure(sim.drops);
            return `<div class="reading-row"><div class="reading current"><small>넣은 치료제</small><b>${c.drops}</b><em>방울</em></div><div class="reading voltage"><small>pH</small><b>${c.pH.toFixed(1)}</b><em></em></div><div class="reading resistance"><small>BTB</small><b style="font-size:1.1rem">${c.btb}</b></div></div>`;
        },
        note(sim) {
            return ['첫 방울의 H⁺는 몸속에 남은 OH⁻와 먼저 만나 물이 돼요. 그래서 pH가 7 근처까지만 내려가요.', '리트머스 줄은 앞에서 이미 알아낸 결과예요. 나머지 세 지시약을 채워요.', '페놀프탈레인이 무색이면 산성일 수도, 중성일 수도 있어요. 메틸 오렌지와 함께 보면 가려낼 수 있어요.'][sim.phase];
        },
        controls(sim) {
            if (sim.phase === 0) {
                const c = M.cure(sim.drops);
                return `<div class="tool-tray"><button type="button" class="primary" data-lab="drop" ${c.drops>=M.curePH.length-1?'disabled':''}>💧 치료제 한 방울</button><button type="button" data-lab="restart">↺ 처음부터 다시</button></div><p class="compact-rule">건강 범위: pH ${M.cureBand[0]} ~ ${M.cureBand[1]}</p>`;
            }
            const tools = sim.phase === 1 ? TABLE_TOOLS : UNKNOWN_TOOLS;
            return `<div class="tool-tray">${tools.map(t=>toolButton(sim,t,I[t].short,t==='mo'?'🟠':t==='btb'?'💧':'🧴')).join('')}</div><p class="compact-rule">지금 고른 지시약: <b>${esc(I[sim.tool].name)}</b></p>`;
        },
        act(sim, a, d) {
            if (sim.phase === 0) {
                if (a === 'drop' && sim.drops < M.curePH.length - 1) {
                    sim.drops++;
                    const c = M.cure(sim.drops);
                    return c.tooAcid ? {
                        msg: '너무 강한 산성이 됐어요! 새콤이 너무 시큼해해요. 처음부터 다시 해 봐요.',
                        sound: 'switch-open'
                    } : {
                        sound: 'place'
                    };
                }
                if (a === 'restart') sim.drops = 0;
                return;
            }
            if (a === 'tool') {
                const tools = sim.phase === 1 ? TABLE_TOOLS : UNKNOWN_TOOLS;
                if (tools.includes(d.tool)) sim.tool = d.tool;
                return;
            }
            if (sim.phase === 1 && a === 'cell' && ROWS.some(([r]) => r === d.row)) {
                sim.table[sim.tool][d.row] = true;
                return {
                    sound: 'place'
                };
            }
            if (sim.phase === 2 && a === 'sample' && UNKNOWN_TOOLS.includes(sim.tool) && UNKNOWN.some(([u]) => u === d.u)) {
                sim.unknown[sim.tool][d.u] = true;
                return {
                    sound: 'place'
                };
            }
        },
        capture(sim) {
            if (sim.phase === 0) {
                const c = M.cure(sim.drops);
                if (c.tooAcid) return {
                    error: '너무 강한 산성이에요. 처음부터 다시 해서 건강 범위에 맞춰요.'
                };
                if (!c.inBand) return {
                    error: `아직 건강 범위(pH ${M.cureBand[0]}~${M.cureBand[1]})가 아니에요. 지금 pH: ${c.pH}`
                };
                return {
                    tag: 'cure',
                    label: `새콤의 체액 모형 치료 · 치료제 ${c.drops}방울`,
                    fields: [numberField('drops', '넣은 치료제', '방울', c.drops, '넣은 방울 수를 적어요.'), numberField('pH', 'pH', '', c.pH, 'pH 측정기의 값을 적어요.', .05), choiceField('btb', 'BTB 색', I.btb.options, c.btb, '비커 속 색을 봐요.')],
                    snap: {
                        drops: c.drops
                    }
                };
            }
            if (sim.phase === 1) {
                const t = sim.tool;
                if (ROWS.some(([r]) => !sim.table[t][r])) return {
                    error: `${I[t].short}을(를) 세 용액 모두에 떨어뜨린 뒤 기록해요.`
                };
                return {
                    tag: 'table-' + t,
                    label: `지시약 사용법 표 · ${I[t].short}`,
                    fields: ROWS.map(([r, sol, label]) => choiceField(r, label, I[t].options, I[t].word(S[sol].pH), '표에 나타난 색을 봐요.')),
                    snap: {
                        tool: t
                    }
                };
            }
            if (UNKNOWN_TOOLS.some(t => UNKNOWN.some(([u]) => !sim.unknown[t][u]))) return {
                error: '세 시료 모두에 두 지시약을 떨어뜨려 본 뒤 판정해요.'
            };
            const kindWord = sol => S[sol].pH < 7 ? '산성' : S[sol].pH > 7 ? '염기성' : '중성';
            return {
                tag: 'unknown',
                label: '마을 창고의 수상한 시료 판정',
                fields: UNKNOWN.map(([u, sol, label]) => choiceField(u, label, ['산성', '중성', '염기성'], kindWord(sol), '메틸 오렌지와 페놀프탈레인의 결과를 함께 봐요.')),
                snap: {}
            };
        },
        after(sim, tags) {
            if (sim.phase === 0 && has(tags, 'cure')) sim.phase = 1;
            else if (sim.phase === 1 && TABLE_TOOLS.every(t => has(tags, 'table-' + t))) {
                sim.phase = 2;
                sim.tool = 'mo';
            } else if (sim.phase === 1) {
                const next = TABLE_TOOLS.find(t => !has(tags, 'table-' + t));
                if (next) sim.tool = next;
            }
        },
        figure(e) {
            return '';
        }
    };

    root.IslandLabs = Labs;
})(window);
