(function(root) {
    'use strict';
    let serial = 0;
    const SIZE = {
        width: 1000,
        height: 520
    };
    const INK = '#56735c',
        CURRENT = '#a05c2c',
        VOLTAGE = '#7d5ba6',
        PAPER = '#fffdf4';
    const pointKey = p => p.join(',');
    const escape = s => String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]));
    const pathOf = points => points.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');

    /* Geometry and electrical terminals share one plan. Meter leads are real branches;
       the ideal voltmeter is excluded from the conducting network, never drawn as a bypass. */
    function plan(p, o = {}) {
        const M = root.IslandModel,
            values = M.circuit(p),
            f = M.fmt;
        const parallel = p.type === 'parallel',
            two = p.count === 2,
            festival = o.final || p.layout === 'festival';
        const vertical = parallel && festival,
            items = [],
            edges = [],
            labels = [],
            arrows = [],
            leaders = [];
        const sourceA = [130, 220],
            sourceB = [130, 280];
        let sequence = 0;
        const wire = (points, flow = 0, probe = false) => {
            const id = 'wire-' + (++sequence);
            items.push({
                id,
                kind: probe ? 'probe-wire' : 'wire',
                points,
                flow
            });
            for (let i = 1; i < points.length; i++) edges.push({
                id: id + '-' + i,
                kind: probe ? 'probe-wire' : 'wire',
                a: points[i - 1],
                b: points[i]
            });
        };
        const component = (kind, id, a, b, props = {}) => {
            const item = {
                kind,
                id,
                a,
                b,
                ...props
            };
            items.push(item);
            edges.push(item);
            return item;
        };
        const label = (x, y, text, color = INK, anchor = 'middle', size = 22) => labels.push({
            x,
            y,
            text,
            color,
            anchor,
            size
        });
        const ammeter = (id, a, b, value, role, labelText, labelAt, mark) => {
            const item = component('ammeter', id, a, b, {
                value,
                role,
                mark
            });
            label(...labelAt, labelText + ' ' + f(value) + ' A', CURRENT, 'middle', 23);
            /* 이름표가 계기에서 멀면 점선 안내선으로 이어 준다(직렬 두 장치의 앞·뒤 전류계) */
            const cy = (a[1] + b[1]) / 2,
                cx = (a[0] + b[0]) / 2;
            if (Math.abs(labelAt[1] - cy) > 45) leaders.push([
                [cx, cy + 27],
                [labelAt[0], labelAt[1] - 22]
            ]);
            return item;
        };
        const resistor = (id, a, b, r, name, labelAt, anchor = 'middle') => {
            const item = component('resistor', id, a, b, {
                resistance: Number(r),
                name
            });
            label(...labelAt, (two ? (id === 'r2' ? '② ' : '① ') : '') + name + ' · ' + f(Number(r)) + ' Ω', '#8a5f24', anchor);
            return item;
        };
        const switchPart = (id, a, b, on, name, labelAt, anchor = 'middle') => {
            const item = component('switch', id, a, b, {
                on: !!on
            });
            label(...labelAt, name, '#536e57', anchor, 21);
            return item;
        };
        component('source', 'source', sourceA, sourceB, {
            value: values.source
        });
        label(150, 337, f(values.source) + ' V 전원', VOLTAGE, 'start', 22);
        let resistors = [],
            branchEnds = [];

        if (parallel && !vertical) {
            const ys = two ? [140, 320] : [140];
            wire([sourceA, [130, 140],
                [280, 140]
            ], values.total);
            if (two) wire([
                [280, 140],
                [280, 320]
            ], values.i2);
            if (two) {
                wire([
                    [940, 140],
                    [940, 320]
                ], values.i1);
                wire([
                    [940, 320],
                    [940, 408],
                    [940, 440]
                ], values.total);
            } else wire([
                [940, 140],
                [940, 440]
            ], values.total);
            wire([
                [940, 440],
                [549, 440]
            ], values.total);
            ammeter('a-total', [501, 440], [549, 440], values.total, 'total', '전체 I', [525, 495]);
            wire([
                [501, 440],
                [130, 440], sourceB
            ], values.total);
            ys.forEach((y, i) => {
                const number = i + 1,
                    current = i ? values.i2 : values.i1,
                    on = i ? p.on2 !== false : p.on1 !== false;
                const name = o.names?.[i] || (two ? (i ? '테라스' : '실내') : '저항 장치');
                const a = [280, y],
                    b = [940, y];
                branchEnds.push([a, b]);
                wire([a, [350, y]], current);
                resistors.push(resistor('r' + number, [350, y], [430, y], i ? p.r2 : p.r1, name, [390, y + 53]));
                wire([
                    [430, y],
                    [560, y]
                ], current);
                switchPart('s' + number, [560, y], [610, y], on, '스위치 ' + number, [585, y + 53]);
                wire([
                    [610, y],
                    [751, y]
                ], current);
                ammeter('a' + number, [751, y], [799, y], current, 'branch-' + number, 'I' + (i ? '₂' : '₁'), [775, y + 53], i ? 'A₂' : 'A₁');
                wire([
                    [799, y], b
                ], current);
                if (current > 0) arrows.push([
                    [305, y - 23],
                    [336, y - 23]
                ]);
            });
        } else if (vertical) {
            const xs = two ? [420, 775] : [600],
                first = xs[0],
                last = xs[xs.length - 1];
            wire([sourceA, [130, 100],
                [first, 100]
            ], values.total);
            if (two) wire([
                [first, 100],
                [last, 100]
            ], values.i2);
            if (two) wire([
                [last, 440],
                [first, 440]
            ], values.i2);
            wire([
                [first, 440],
                [249, 440]
            ], values.total);
            ammeter('a-total', [201, 440], [249, 440], values.total, 'total', '전체 I', [225, 495]);
            wire([
                [201, 440],
                [130, 440], sourceB
            ], values.total);
            xs.forEach((x, i) => {
                const number = i + 1,
                    current = i ? values.i2 : values.i1,
                    on = i ? p.on2 !== false : p.on1 !== false;
                const name = o.names?.[i] || (two ? (i ? '부스' : '안내등') : '안내등'),
                    anchor = 'end',
                    tx = x - 70;
                const a = [x, 100],
                    b = [x, 440];
                branchEnds.push([a, b]);
                wire([a, [x, 150]], current);
                resistors.push(resistor('r' + number, [x, 150], [x, 230], i ? p.r2 : p.r1, name, [tx, 182], anchor));
                wire([
                    [x, 230],
                    [x, 285]
                ], current);
                switchPart('s' + number, [x, 285], [x, 330], on, '스위치 ' + number, [tx, 313], anchor);
                wire([
                    [x, 330],
                    [x, 356]
                ], current);
                component('ammeter', 'a' + number, [x, 356], [x, 404], {
                    value: current,
                    role: 'branch-' + number,
                    mark: i ? 'A₂' : 'A₁'
                });
                label(tx, 387, 'I' + (i ? '₂' : '₁') + ' ' + f(current) + ' A', CURRENT, anchor, 23);
                wire([
                    [x, 404], b
                ], current);
                if (current > 0) arrows.push([
                    [x - 23, 111],
                    [x - 23, 137]
                ]);
            });
        } else {
            const closed = p.on1 !== false && (!two || p.on2 !== false);
            wire([sourceA, [130, 140],
                [221, 140]
            ], values.total);
            ammeter('a-total', [221, 140], [269, 140], values.total, 'total', two ? '앞쪽 전류 I₁' : '전체 I', [245, 238], two ? 'A₁' : 'A');
            wire([
                [269, 140],
                [350, 140]
            ], values.total);
            resistors.push(resistor('r1', [350, 140], [430, 140], p.r1, o.names?.[0] || (festival ? '안내등' : two ? '장치 1' : '저항 장치'), [390, 193]));
            if (two) {
                wire([
                    [430, 140],
                    [560, 140]
                ], values.total);
                resistors.push(resistor('r2', [560, 140], [640, 140], p.r2, o.names?.[1] || (festival ? '부스' : '장치 2'), [600, 193]));
                wire([
                    [640, 140],
                    [661, 140]
                ], values.total);
                ammeter('a-after', [661, 140], [709, 140], values.total, 'after', '뒤쪽 전류 I₂', [685, 265], 'A₂');
                wire([
                    [709, 140],
                    [760, 140]
                ], values.total);
            } else wire([
                [430, 140],
                [760, 140]
            ], values.total);
            switchPart('s-series', [760, 140], [810, 140], closed, '스위치', [785, 193]);
            wire([
                [810, 140],
                [940, 140],
                [940, 440]
            ], values.total);
            wire([
                [940, 440],
                [130, 440], sourceB
            ], values.total);
            if (values.total > 0) arrows.push([
                [147, 116],
                [190, 116]
            ]);
        }

        /* Missing/removed second devices cannot leave a voltmeter attached in mid-air. */
        const probe = ['source', 'r1', 'r2'].includes(o.probe) ? o.probe : 'source';
        const effectiveProbe = probe === 'r2' && !two ? 'source' : probe;
        let selected = [sourceA, sourceB],
            scope = '전원 양 끝',
            voltage = values.source,
            meterA, meterB;
        if (effectiveProbe === 'source') {
            meterA = [55, 226];
            meterB = [55, 274];
            wire([sourceA, [55, 220], meterA], 0, true);
            wire([meterB, [55, 280], sourceB], 0, true);
        } else {
            const n = effectiveProbe === 'r2' ? 1 : 0;
            if (parallel) {
                /* 전압계는 등(저항) 양 끝만 잰다 — 스위치가 열린 가지는 0 V. 스위치까지 묶어 재면 열린 스위치의 6 V가 보여 헷갈린다. */
                const r = resistors[n];
                selected = [r.a, r.b];
                scope = '가지 ' + (n + 1) + ' · ' + (o.names?.[n] || (festival ? (n ? '부스' : '안내등') : (n ? '테라스등' : '실내등'))) + ' 양 끝';
                voltage = n ? values.branch2 : values.branch1;
                if (vertical) {
                    /* 세로 가지: 전압계를 저항 바로 옆(두 가지 사이)에 둔다 */
                    const mx = r.a[0] + (n ? 76 : 56);
                    meterA = [mx, 166];
                    meterB = [mx, 214];
                    wire([r.a, [mx, r.a[1]], meterA], 0, true);
                    wire([meterB, [mx, r.b[1]], r.b], 0, true);
                } else {
                    /* 가로 가지: 전압계를 저항 바로 위에 둔다(가지 1은 y=80, 가지 2는 두 가지 사이 y=258) */
                    const y = n ? 258 : 80,
                        x = (r.a[0] + r.b[0]) / 2;
                    meterA = [x - 24, y];
                    meterB = [x + 24, y];
                    wire([r.a, [r.a[0], y], meterA], 0, true);
                    wire([meterB, [r.b[0], y], r.b], 0, true);
                }
            } else {
                const r = resistors[n],
                    x = (r.a[0] + r.b[0]) / 2;
                selected = [r.a, r.b];
                scope = '장치 ' + (n + 1) + ' 양 끝';
                voltage = n ? values.v2 : values.v1;
                meterA = [x - 24, 80];
                meterB = [x + 24, 80];
                wire([r.a, [r.a[0], 80], meterA], 0, true);
                wire([meterB, [r.b[0], 80], r.b], 0, true);
            }
        }
        component('voltmeter', 'voltmeter', meterA, meterB, {
            value: voltage,
            selected,
            scope
        });
        label(605, 29, '전압계 · ' + scope + ' : ' + f(voltage) + ' V', VOLTAGE, 'middle', 23);
        return {
            size: SIZE,
            parallel,
            two,
            vertical,
            items,
            edges,
            labels,
            arrows,
            leaders,
            source: [sourceA, sourceB],
            selected,
            probe: effectiveProbe,
            voltage,
            scope,
            values
        };
    }

    /* 상황 그림의 장치 그림 — 장면·장치마다 다른 모양. (cx,cy)는 도선 위 장치의 중심, 아래 이름표(y+53)를 가리지 않게 cy+34 안에 둔다. */
    function deviceGlyph(scene, id, cx, cy, lit) {
        const kinds = [
            ['postoffice', 'streetlamp'],
            ['machine', 'machine'],
            ['streetlamp', 'streetlamp'],
            ['cafe', 'terrace'],
            ['stagelamp', 'booth']
        ][scene] || ['streetlamp', 'streetlamp'];
        const kind = id === 'r2' ? kinds[1] : kinds[0],
            L = lit ? '#ffe689' : '#52636c',
            B = lit ? '#fff7c2' : '#8a949c',
            glow = lit ? `<ellipse cx="${cx}" cy="${cy-6}" rx="70" ry="54" fill="#ffe689" opacity=".13"/>` : '';
        const cone = lit ? `<path d="M${cx-22} ${cy-14}L${cx-58} ${cy+34}H${cx+58}L${cx+22} ${cy-14}Z" fill="#ffe689" opacity=".16"/>` : '';
        switch (kind) {
            case 'streetlamp':
                return glow + cone + `<rect x="${cx-18}" y="${cy+26}" width="36" height="8" rx="4" fill="#8a6a4c"/><path d="M${cx} ${cy+26}V${cx?cy-20:cy-20}" stroke="#d3ae75" stroke-width="8" stroke-linecap="round"/><path d="M${cx-28} ${cy-20}h56l-9 -20h-38z" fill="#5b7f73"/><circle cx="${cx}" cy="${cy-16}" r="13" fill="${L}"/>`;
            case 'postoffice':
                return glow + `<rect x="${cx-70}" y="${cy+10}" width="14" height="24" rx="4" fill="#c0433a"/><rect x="${cx-52}" y="${cy-24}" width="104" height="58" rx="8" fill="#e3cbaa"/><path d="M${cx-60} ${cy-24}L${cx} ${cy-60}L${cx+60} ${cy-24}Z" fill="#c0685a"/><rect x="${cx-26}" y="${cy-42}" width="52" height="15" rx="4" fill="#fff4d6"/><text x="${cx}" y="${cy-30}" text-anchor="middle" font-size="12" font-weight="700" fill="#4a3a2a">우체국</text><rect x="${cx-44}" y="${cy-12}" width="22" height="20" rx="2" fill="${L}"/><rect x="${cx+22}" y="${cy-12}" width="22" height="20" rx="2" fill="${L}"/><rect x="${cx-11}" y="${cy+4}" width="22" height="30" rx="3" fill="#8a6a4c"/><path d="M${cx+52} ${cy-30}h12" stroke="#74694f" stroke-width="4"/><circle cx="${cx+66}" cy="${cy-30}" r="9" fill="${L}"/>`;
            case 'machine':
                return glow + `<rect x="${cx-70}" y="${cy+26}" width="140" height="10" rx="3" fill="#b88656"/><rect x="${cx-42}" y="${cy-20}" width="84" height="46" rx="10" fill="#7a8f9c"/><circle cx="${cx-18}" cy="${cy+3}" r="11" fill="#dfe6ea"/><path d="M${cx-18} ${cy+3}l6 -7" stroke="#3a4a52" stroke-width="3" stroke-linecap="round"/><rect x="${cx+6}" y="${cy-4}" width="26" height="9" rx="4" fill="${lit?'#ffe689':'#3a4a52'}"/><path d="M${cx+19} ${cy+12}h0" stroke="#3a4a52"/><path d="M${cx} ${cy-20}v-9" stroke="#74694f" stroke-width="4"/><circle cx="${cx}" cy="${cy-42}" r="13" fill="${L}"/>`;
            case 'cafe':
                return glow + `<rect x="${cx-54}" y="${cy-22}" width="108" height="56" rx="8" fill="#e8d5b8"/><path d="M${cx-62} ${cy-22}L${cx} ${cy-56}L${cx+62} ${cy-22}Z" fill="#709a8e"/><rect x="${cx-42}" y="${cy-8}" width="50" height="34" rx="4" fill="${L}"/><path d="M${cx-17} ${cy-8}v34M${cx-42} ${cy+9}h50" stroke="#a88a66" stroke-width="3"/><path d="M${cx-30} ${cy-8}v8" stroke="#74694f" stroke-width="3"/><circle cx="${cx-30}" cy="${cy+4}" r="6" fill="${B}"/><rect x="${cx+16}" y="${cy+6}" width="22" height="28" rx="3" fill="#8a6a4c"/><path d="M${cx-58} ${cy-22}h58v9h-58z" fill="#d9776e"/><path d="M${cx-46} ${cy-22}v9M${cx-34} ${cy-22}v9M${cx-22} ${cy-22}v9M${cx-10} ${cy-22}v9" stroke="#fff4d6" stroke-width="3"/><rect x="${cx+14}" y="${cy-40}" width="34" height="14" rx="3" fill="#fff4d6"/><text x="${cx+31}" y="${cy-29}" text-anchor="middle" font-size="11" font-weight="700" fill="#4a3a2a">찻집</text>`;
            case 'terrace':
                return glow + `<rect x="${cx-70}" y="${cy+28}" width="140" height="8" rx="2" fill="#b88656"/><path d="M${cx+8} ${cy+6}q36 -30 72 0z" fill="#e0a1a1"/><path d="M${cx+44} ${cy+6}v22" stroke="#8a6a4c" stroke-width="4"/><rect x="${cx+26}" y="${cy+14}" width="36" height="5" fill="#b88656"/><path d="M${cx-62} ${cy-44}q40 22 80 0" stroke="#74694f" stroke-width="2" fill="none"/><circle cx="${cx-48}" cy="${cy-38}" r="4" fill="${L}"/><circle cx="${cx-30}" cy="${cy-33}" r="4" fill="${L}"/><circle cx="${cx-8}" cy="${cy-33}" r="4" fill="${L}"/><circle cx="${cx+10}" cy="${cy-38}" r="4" fill="${L}"/><path d="M${cx-24} ${cy+28}V${cy-14}" stroke="#d3ae75" stroke-width="7" stroke-linecap="round"/><path d="M${cx-24} ${cy-14}v-6" stroke="#74694f" stroke-width="3"/><rect x="${cx-40}" y="${cy-48}" width="32" height="30" rx="8" fill="${L}" stroke="#74694f" stroke-width="3"/>`;
            case 'stagelamp':
                return glow + cone + `<rect x="${cx-18}" y="${cy+26}" width="36" height="8" rx="4" fill="#8a6a4c"/><path d="M${cx} ${cy+26}V${cy-30}" stroke="#d3ae75" stroke-width="8" stroke-linecap="round"/><path d="M${cx-4} ${cy-12}h-44l-10 8l10 8h44z" fill="#fff4d6" stroke="#74694f" stroke-width="2"/><text x="${cx-27}" y="${cy}" text-anchor="middle" font-size="11" font-weight="700" fill="#4a3a2a">공연장</text><path d="M${cx-24} ${cy-30}h48l-7 -17h-34z" fill="#5b7f73"/><circle cx="${cx}" cy="${cy-27}" r="12" fill="${L}"/>`;
            case 'booth':
                return glow + `<path d="M${cx-52} ${cy-4}v36M${cx+52} ${cy-4}v36" stroke="#8a6a4c" stroke-width="5"/><path d="M${cx-62} ${cy-4}L${cx} ${cy-52}L${cx+62} ${cy-4}Z" fill="#d9776e"/><path d="M${cx-31} ${cy-4}L${cx} ${cy-52}L${cx+31} ${cy-4}Z" fill="#fff4d6"/><rect x="${cx-56}" y="${cy+14}" width="112" height="20" rx="5" fill="#e3cbaa"/><path d="M${cx} ${cy-30}v12" stroke="#74694f" stroke-width="3"/><circle cx="${cx}" cy="${cy-8}" r="11" fill="${L}"/>`;
        }
        return '';
    }

    function svg(p, o = {}) {
        const d = plan(p, o),
            id = 'circuit-' + (++serial),
            f = root.IslandModel.fmt;
        const attrs = (a, b) => `data-from="${pointKey(a)}" data-to="${pointKey(b)}"`;
        const dot = (a, color = INK, r = 5) => `<circle cx="${a[0]}" cy="${a[1]}" r="${r}" fill="${color}"/>`;
        const label = (x, y, copy, color = INK, anchor = 'middle', size = 22) => `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" style="font-size:${size}px;font-family:'Malgun Gothic',sans-serif">${escape(copy)}</text>`;
        let body = o.picture ? `<rect width="1000" height="520" rx="24" fill="#162d42"/><path d="M0 365 Q240 310 490 390T1000 340V520H0Z" fill="#294b49"/><circle cx="930" cy="53" r="20" fill="#fff0be"/><text x="500" y="65" text-anchor="middle" fill="#d3e8d8" font-size="22">${escape(o.sceneTitle||'주민의 전기 장치')}</text>` : '',
            flow = '';
        if (d.parallel && d.two && !o.preview) {
            for (let n = 0; n < 2; n++) {
                const chosen = d.probe === 'r' + (n + 1),
                    color = n ? '#d38c29' : '#2480a5';
                body += d.vertical ? `<rect data-branch="${n+1}" x="${(n?775:420)-32}" y="92" width="64" height="356" rx="18" fill="${color}" fill-opacity="${chosen?.2:.08}" stroke="${color}" stroke-width="${chosen?4:2}" stroke-dasharray="8 5" pointer-events="none"/>` : `<rect data-branch="${n+1}" x="273" y="${(n?320:140)-37}" width="674" height="111" rx="18" fill="${color}" fill-opacity="${chosen?.2:.08}" stroke="${color}" stroke-width="${chosen?4:2}" stroke-dasharray="8 5" pointer-events="none"/>`;
            }
        }
        for (const item of d.items) {
            if (item.kind === 'wire' || item.kind === 'probe-wire') {
                const probe = item.kind === 'probe-wire';
                body += `<path data-kind="${item.kind}" data-wire="${item.id}" d="${pathOf(item.points)}" fill="none" stroke="${probe?VOLTAGE:o.picture?'#9bbbac':INK}" stroke-width="${probe?3.5:5}" stroke-linejoin="round" stroke-linecap="round"/>`;
                if (o.electrons && !probe && item.flow > 0) {
                    const ed = pathOf([...item.points].reverse());
                    flow += `<path data-decoration="electron-halo" class="pulse-flow" d="${ed}" fill="none" stroke="${o.picture?'#0b1a26':'#ffffff'}" stroke-width="13" stroke-linecap="round" pointer-events="none"/><path data-decoration="electron" class="pulse-flow" d="${ed}" fill="none" stroke="${o.picture?'#5fe3ff':'#1f6fe8'}" stroke-width="7" stroke-linecap="round" pointer-events="none"/>`;
                }
                continue;
            }
            const [x, y] = item.a, vertical = item.a[0] === item.b[0], cx = (x + item.b[0]) / 2, cy = (y + item.b[1]) / 2;
            const common = `data-kind="${item.kind}" data-component="${item.id}" ${attrs(item.a,item.b)}`;
            if (item.kind === 'source') {
                body += `<g ${common}><path d="M130 220V242M130 258V280" fill="none" stroke="${INK}" stroke-width="5"/><path d="M107 242H153" stroke="#74694f" stroke-width="3"/><path d="M117 258H143" stroke="#74694f" stroke-width="7"/>${label(98,239,'+','#b23a30','middle',23)}${label(98,275,'−','#2e5f8f','middle',23)}</g>`;
            } else if (item.kind === 'resistor') {
                if (o.picture) {
                    const lit = (item.id === 'r2' ? d.values.i2 : d.values.i1) > 0;
                    body += `<g ${common} data-resistor="${item.id}">${deviceGlyph(o.sceneId,item.id,cx,cy,lit)}</g>`;
                    continue;
                }
                body += `<path ${common} data-resistor="${item.id}" d="M0 0L8 0L14 -10L26 10L38 -10L50 10L62 -10L72 0L80 0" transform="translate(${x} ${y})${vertical?' rotate(90)':''}" fill="none" stroke="#8a5f24" stroke-width="4" stroke-linejoin="round"/>`;
            } else if (item.kind === 'switch') {
                const length = Math.hypot(item.b[0] - x, item.b[1] - y);
                const key = item.id === 's-series' ? (o.switchKey || 'on1') : item.id === 's2' ? 'on2' : 'on1';
                const hit = o.interactive ? `role="button" tabindex="0" aria-label="${escape(o.names?.[key==='on2'?1:0]||'회로')} 스위치 ${item.on?'열기':'닫기'}" data-action="switch" data-key="${key}" class="circuit-switch"` : '';
                body += `<g ${common} ${hit} data-switch="${item.on?'closed':'open'}"><path d="M0 0L${length} ${item.on?0:-25}" transform="translate(${x} ${y})${vertical?' rotate(90)':''}" fill="none" stroke="#74694f" stroke-width="4" stroke-linecap="round"/>${dot(item.a,'#74694f',4)}${dot(item.b,'#74694f',4)}${o.interactive?`<rect x="${cx-60}" y="${cy-50}" width="120" height="100" rx="18" fill="#ffda61" fill-opacity=".12" stroke="#eaba3b" stroke-width="3"/>`:""}</g>`;
            } else {
                const volt = item.kind === 'voltmeter',
                    color = volt ? VOLTAGE : CURRENT;
                body += `<g ${common} data-meter="${volt?'V':'A'}" data-value="${item.value}"${item.role?' data-role="'+item.role+'"':''}><circle cx="${cx}" cy="${cy}" r="24" fill="${PAPER}" stroke="${color}" stroke-width="4"/>${label(cx,cy+9,volt?'V':(item.mark||'A'),color,'middle',item.mark&&item.mark.length>1?24:28)}</g>`;
            }
        }
        /* Dots identify actual junctions only. Crossing or nearby wires never imply a node. */
        const counts = new Map();
        for (const edge of d.edges)
            for (const point of [edge.a, edge.b]) counts.set(pointKey(point), (counts.get(pointKey(point)) || 0) + 1);
        for (const [key, count] of counts)
            if (count >= 3 && !d.selected.some(p => pointKey(p) === key)) body += dot(key.split(',').map(Number));
        for (const a of d.selected) body += dot(a, VOLTAGE, 6);
        for (const line of d.leaders || []) body += `<path data-decoration="leader" d="${pathOf(line)}" fill="none" stroke="${CURRENT}" stroke-width="2.5" stroke-dasharray="6 5" opacity=".85"/>`;
        for (const line of d.arrows) body += `<path data-decoration="current" d="${pathOf(line)}" fill="none" stroke="${CURRENT}" stroke-width="3" marker-end="url(#${id}-arrow)"/>`;
        body += flow;
        body += d.labels.filter(x => !o.preview || x.text.includes('Ω') || x.text.startsWith('스위치')).map(x => label(x.x, x.y, o.preview ? x.text.split(' · ')[0] : x.text, o.picture ? '#f3e5bc' : x.color, x.anchor, x.size)).join('');
        const description = `${d.parallel?'병렬':'직렬'} 회로, 장치 ${d.two?2:1}개. 전체 전류 ${f(d.values.total)} 암페어. ${d.scope}의 전압 ${f(d.voltage)} 볼트. 전류계 A는 도선의 중간에 직렬로, 전압계 V는 선택한 두 지점에 병렬로 연결되어 있습니다.`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE.width} ${SIZE.height}" width="${SIZE.width}" height="${SIZE.height}" role="${o.interactive?'group':'img'}" aria-label="${escape(o.preview?o.sceneTitle:description)}" data-circuit="${d.parallel?'parallel':'series'}" data-layout="${d.vertical?'festival':'standard'}" data-probe="${d.probe}"><defs><marker id="${id}-arrow" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="${CURRENT}"/></marker></defs>${body}</svg>`;
    }
    const api = {
        svg,
        plan
    };
    root.IslandCircuit = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);