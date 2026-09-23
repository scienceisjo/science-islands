(function(root) {
    'use strict';
    const KEY = 'sparkle-island-journal-v1';
    const quests = [{
            id: 0,
            name: '첫 번째 불빛',
            place: '우체국 앞',
            npc: '두리',
            animal: '🐧',
            color: '#cf9166',
            x: -9,
            z: -1.5,
            story: '축제 초대장을 나눠 줘야 하는데 우체국 등이 꺼졌어. 전지는 연결돼 있어. 전류가 흐를 길을 살펴줄래?',
            goal: '스위치를 열고 닫으며 전류와 전압을 비교해요.',
            reward: '작은 캠프 등',
            concept: '닫힌 회로 · 전류 · 전압'
        },
        {
            id: 1,
            name: '공방의 알맞은 흐름',
            place: '모아의 공방',
            npc: '모아',
            animal: '🦊',
            color: '#d89551',
            x: -9,
            z: 9,
            story: '축제 장치에는 0.3 A가 필요해. 전압과 저항을 한꺼번에 바꾸니 무엇 때문인지 모르겠어. 하나씩 비교해서 방법을 찾아 줄래?',
            goal: '한 조건씩 바꿔 보고, 6 V에서 0.3 A를 만들어요.',
            reward: '꽃 화분',
            concept: '전압 · 저항 · 옴의 법칙'
        },
        {
            id: 2,
            name: '함께 꺼진 숲길',
            place: '직렬 숲길',
            npc: '토리',
            animal: '🐻',
            color: '#b39571',
            x: 0,
            z: -9,
            story: '앞쪽 안내등을 수리하려고 회로를 끊었더니 뒤쪽도 꺼졌어. 전류가 앞에서 다 쓰인 걸까? 숲길의 연결을 조사해 줘.',
            goal: '장치를 추가하고, 회로를 끊어 앞뒤의 흐름을 비교해요.',
            reward: '숲길 깃발',
            concept: '직렬 · 같은 전류 · 나뉘는 전압'
        },
        {
            id: 3,
            name: '테라스의 작은 부탁',
            place: '소담의 해변 찻집',
            npc: '소담',
            animal: '🐰',
            color: '#d8acae',
            x: 12,
            z: 4,
            story: '낮에는 테라스 등을 끄고 싶어. 실내에서는 손님이 책을 읽고 있으니 실내등은 계속 켜져야 해. 따로 켤 수 있게 해 줄래?',
            goal: '가지를 나누고 테라스만 꺼서 실내의 변화를 확인해요.',
            reward: '바다빛 조명',
            concept: '병렬 · 같은 전압 · 나뉘는 전류'
        },
        {
            id: 4,
            name: '빛 축제를 부탁해',
            place: '바다 건너 축제 광장',
            npc: '해온',
            animal: '🐤',
            color: '#e6bd57',
            x: 13,
            z: -7,
            story: '공연장 안내등은 계속 켜 두고 체험 부스만 잠깐 끄고 싶어. 건물 배치는 카페와 다르지만 네가 알아낸 방법을 쓸 수 있을까?',
            goal: '새 배치의 회로를 고르고 부스만 꺼 보세요.',
            reward: '전기의 숲 탐험가 도장',
            concept: '문제 해결 · 증거 · 새로운 상황'
        }
    ];
    const entries = [{
            "title": "모아에게 남긴 작업 메모",
            "quests": [
                1
            ],
            "icon": "🛠",
            "story": "모아가 다음에도 장치에 필요한 0.3 A를 만들 수 있도록 작업 메모를 남겨 주세요.",
            "labels": [
                "6 V에서 0.3 A를 만든 방법",
                "내 측정값으로 모아에게 설명하기",
                "전원이 12 V로 바뀐다면?"
            ],
            "questions": [
                "전원을 6 V로 맞춘 뒤 저항을 몇 Ω으로 정했나요? 그때 측정한 전류는 몇 A였나요? 모아가 따라 할 수 있도록 조절한 순서와 값을 적어 주세요.",
                "전압을 6 V로 같게 두고 저항만 바꾼 기록 두 개를 골라, 각각의 저항(Ω)과 전류(A)를 적어 주세요. 저항이 몇 배가 되었을 때 전류는 어떻게 달라졌나요? 이 비교를 근거로 내가 고른 저항에서 0.3 A가 흐른 이유를 설명해 주세요.",
                "모아가 전원을 6 V에서 12 V로 바꾸려고 해요. 내가 고른 저항을 그대로 쓰면 전류는 몇 A가 될까요? 다시 0.3 A가 흐르게 하려면 저항을 몇 Ω으로 바꿔야 할까요? 전압·전류·저항의 관계로 예상한 이유를 적어 주세요."
            ],
            "starts": [
                "모아야, 전원을 6 V로 맞추고 저항을 … Ω으로 정했어. 전류계는 … A였어.",
                "6 V에서 저항이 … Ω일 때 … A, … Ω일 때 … A였어. 저항이 …배가 되면 전류는 …",
                "12 V에서 저항을 그대로 두면 … A로 예상해. 0.3 A를 유지하려면 … Ω이 필요해. 왜냐하면 …"
            ]
        },
        {
            "title": "토리와 소담에게 보내는 편지",
            "quests": [
                2,
                3
            ],
            "icon": "✉",
            "story": "함께 꺼진 숲길을 조사한 경험으로, 테라스만 끄고 싶은 소담의 부탁을 해결했어요.",
            "labels": [
                "테라스만 끄도록 연결한 방법",
                "두 장소에서 스위치를 열었더니",
                "교실 조명에 내 방법 적용하기"
            ],
            "questions": [
                "실내등과 테라스등을 직렬과 병렬 중 어떻게 연결했나요? 실내등을 켜 둔 채 테라스등만 끄려면 스위치를 어느 도선에 두어야 하나요? 소담이 따라 할 수 있게 연결과 스위치 위치를 설명해 주세요.",
                "토리의 숲길에서 스위치를 열었을 때 장치 앞·뒤 전류는 각각 몇 A였나요? 소담의 카페에서 테라스 스위치를 열기 전과 후, 실내와 테라스 전류는 각각 어떻게 달라졌나요? 기록의 값을 적고, 스위치를 연 뒤에도 전원으로 이어지는 닫힌 경로가 남는지로 차이를 설명해 주세요.",
                "교실에서 칠판 쪽 조명만 끄고 학생 자리의 조명은 켜 두고 싶어요. 두 조명과 스위치를 어떻게 연결할까요? 스위치를 두 갈래로 나뉘기 전 공통 도선에 두면 어떤 문제가 생길지, 카페에서 관찰한 결과를 근거로 설명해 주세요."
            ],
            "starts": [
                "소담아, 두 등을 …로 연결했어. 스위치는 … 도선에 두었어.",
                "토리의 숲길은 스위치를 열자 앞 … A, 뒤 … A였어. 카페의 실내는 … A에서 … A, 테라스는 … A에서 … A였어. 이 차이는 …",
                "칠판 쪽과 학생 자리 조명을 …로 연결하고 스위치는 …에 둘 거야. 공통 도선에 두면 …"
            ]
        },
        {
            "title": "다음 탐험가에게",
            "quests": [
                4
            ],
            "icon": "✦",
            "story": "카페와 다른 모양의 축제 회로에서도 안내등을 유지하며 부스만 껐어요. 다음 탐험가에게 확인 방법과 새 질문을 남겨 주세요.",
            "labels": [
                "안내등을 지킨 실험 증거",
                "배치가 달라도 같은 해결책인 이유",
                "새 부스를 더 연결하면?"
            ],
            "questions": [
                "축제에서 어떤 연결을 고르고 어느 스위치를 열었나요? 부스를 끄기 전과 후의 안내등 전류, 부스 전류를 각각 몇 A로 기록했나요? 그 값 중 무엇이 “안내등은 켜 두고 부스만 끈다”는 부탁을 해결했다는 증거인가요?",
                "카페 회로와 축제 회로에서, 부스나 테라스로 가는 길이 끊겨도 다른 장치의 전류가 흐를 수 있는 길을 찾아 설명해 주세요. 다음 탐험가가 회로를 그릴 때 건물의 위아래 배치보다 어떤 연결을 확인해야 할까요?",
                "안내등과 기존 부스를 모두 켠 상태에서 새 부스를 병렬로 하나 더 연결하고 켠다고 해요. 전원 전압과 기존 장치의 저항은 그대로일 때, 안내등 전류와 전원에서 나오는 전체 전류는 각각 어떻게 달라질까요? 가지의 전압과 전류가 나뉘고 합쳐지는 관계로 이유를 쓰고, 예상을 확인하려면 전류계를 어디에 두고 무엇을 비교할지도 적어 주세요."
            ],
            "starts": [
                "나는 … 연결에서 … 스위치를 열었어. 안내등 전류는 … A에서 … A, 부스 전류는 … A에서 … A였어. 그래서 …",
                "스위치를 연 뒤에도 전원에서 …를 지나 다시 전원으로 이어지는 길이 남아 있어. 확인해야 할 연결은 …",
                "새 부스를 켜면 안내등 전류는 …, 전체 전류는 …로 예상해. 왜냐하면 … 확인하려면 전류계를 …에 연결해 전후 값을 비교할 거야."
            ]
        }
    ];

    function circuit(p) {
        const V = Number(p.v),
            r1 = Number(p.r1),
            r2 = Number(p.r2 || 10);
        if (!Number.isFinite(V) || V < 0 || !Number.isFinite(r1) || r1 <= 0 || !Number.isFinite(r2) || r2 <= 0) throw new Error('전압과 저항 설정을 확인해 주세요.');
        const n = p.count === 1 ? 1 : 2,
            a = p.on1 !== false,
            b = p.on2 !== false;
        if (p.type === 'parallel') {
            const i1 = a ? V / r1 : 0,
                i2 = n === 2 && b ? V / r2 : 0;
            return {
                total: i1 + i2,
                i1,
                i2,
                v1: a ? V : 0,
                v2: n === 2 && b ? V : 0,
                branch1: a ? V : 0,
                branch2: n === 2 && b ? V : 0,
                source: V,
                on1: a,
                on2: n === 2 && b
            };
        }
        const closed = a && (n === 1 || b),
            i = closed ? V / (r1 + (n === 2 ? r2 : 0)) : 0;
        return {
            total: i,
            i1: i,
            i2: n === 2 ? i : 0,
            v1: i * r1,
            v2: n === 2 ? i * r2 : 0,
            branch1: i * r1,
            branch2: n === 2 ? i * r2 : 0,
            source: V,
            on1: closed,
            on2: n === 2 && closed
        };
    }

    function fresh() {
        return {
            version: 1,
            nickname: '새싹',
            classCode: '',
            number: '',
            mode: 'review',
            started: false,
            introSeen: false,
            sealedEntries: [false, false, false],
            completed: [],
            evidence: [
                [],
                [],
                [],
                [],
                []
            ],
            notes: entries.map(() => ['', '', '']),
            predictions: {},
            pos: {
                x: -3,
                z: 6
            },
            festival: false,
            visited: [],
            sound: false,
            effects: true,
            voice: true,
            voiceVolume: 0.45,
            musicVolume: 0.3,
            imeOriginals: [],
            calm: false,
            camp: 'mint',
            updatedAt: null
        };
    }

    function sanitize(raw) {
        if (!raw || raw.version !== 1 || !Array.isArray(raw.evidence) || !Array.isArray(raw.notes)) throw new Error('전기의 숲 탐험일지 파일이 아니에요.');
        const s = fresh(),
            short = (v, n = 5000) => typeof v === 'string' ? v.slice(0, n) : '';
        for (const k of ['nickname', 'classCode', 'number']) s[k] = short(raw[k], 40);
        s.nickname = s.nickname || '새싹';
        s.mode = raw.mode === 'beginner' ? 'beginner' : 'review';
        s.completed = [...new Set((raw.completed || []).filter(x => Number.isInteger(x) && x >= 0 && x < 5))];
        s.started = !!raw.started;
        s.introSeen = !!raw.introSeen;
        s.festival = !!raw.festival && s.completed.length === 5;
        s.sound = !!raw.sound;
        s.effects = raw.effects !== false;
        s.voice = raw.voice !== false;
        for (const k of ['voiceVolume', 'musicVolume'])
            if (typeof raw[k] === 'number' && Number.isFinite(raw[k])) s[k] = Math.max(0, Math.min(1, raw[k]));
        s.imeOriginals = (Array.isArray(raw.imeOriginals) ? raw.imeOriginals : []).slice(-30).filter(x => x && typeof x === 'object').map(x => ({
            field: short(x.field, 60),
            original: short(x.original),
            corrected: short(x.corrected),
            time: short(x.time, 50)
        }));
        s.calm = !!raw.calm;
        s.camp = ['mint', 'peach', 'lemon'].includes(raw.camp) ? raw.camp : 'mint';
        s.notes = entries.map((_, i) => [0, 1, 2].map(j => short(raw.notes[i]?.[j])));
        s.sealedEntries = [0, 1, 2].map(i => Array.isArray(raw.sealedEntries) ? !!raw.sealedEntries[i] : false);
        s.predictions = Object.fromEntries(Object.entries(raw.predictions || {}).filter(([k, v]) => /^\d$/.test(k) && typeof v === 'string').map(([k, v]) => [k, short(v, 300)]));
        s.visited = (raw.visited || []).filter(x => Number.isInteger(x) && x >= 0 && x < 5);
        if (raw.pos && Number.isFinite(raw.pos.x) && Number.isFinite(raw.pos.z)) s.pos = {
            x: Math.max(-19, Math.min(19, raw.pos.x)),
            z: Math.max(-15, Math.min(15, raw.pos.z))
        };
        s.evidence = quests.map((q, i) => (Array.isArray(raw.evidence[i]) ? raw.evidence[i] : []).slice(0, 20).flatMap(e => {
            try {
                const p = {
                    type: e.p.type === 'parallel' ? 'parallel' : 'series',
                    v: Number(e.p.v),
                    r1: Number(e.p.r1),
                    r2: Number(e.p.r2),
                    count: e.p.count === 1 ? 1 : 2,
                    on1: e.p.on1 !== false,
                    on2: e.p.on2 !== false,
                    layout: e.p.layout === 'festival' ? 'festival' : 'standard'
                };
                const values = circuit(p);
                if (p.v > 24 || p.r1 > 1000 || p.r2 > 1000) return [];
                const checked = validateMeasurements(p, e.entered || {});
                return [{
                    tag: short(e.tag, 50),
                    label: short(e.label, 100),
                    p,
                    values,
                    time: short(e.time, 50),
                    manual: e.manual === true && checked.ok,
                    entered: checked.entered,
                    enteredRaw: Object.fromEntries(Object.entries(checked.entered).map(([key, n]) => [key, typeof e.enteredRaw?.[key] === 'string' && e.enteredRaw[key].length <= 32 && Number(e.enteredRaw[key]) === n ? e.enteredRaw[key] : String(n)]))
                }];
            } catch {
                return [];
            }
        }));
        return s;
    }

    function measurementSpec(p) {
        const v = circuit(p),
            make = (key, label, unit) => ({
                key,
                label,
                unit,
                value: Number(v[key].toFixed(2))
            });
        if (p.count === 1) return [make('source', '전원 전압', 'V'), make('total', '전체 전류', 'A')];
        if (p.type === 'parallel') return [make('total', '전체 전류 I', 'A'), make('i1', '가지 1 전류 I₁', 'A'), make('i2', '가지 2 전류 I₂', 'A'), make('branch1', '가지 1 양 끝 전압 V₁', 'V'), make('branch2', '가지 2 양 끝 전압 V₂', 'V')];
        return [make('i1', '장치 앞 전류', 'A'), make('i2', '장치 뒤 전류', 'A'), make('v1', '장치 1 전압', 'V'), make('v2', '장치 2 전압', 'V')];
    }

    function validateMeasurements(p, raw) {
        const entered = {},
            errors = [];
        for (const item of measurementSpec(p)) {
            const value = raw?.[item.key],
                n = Number(value);
            if (value == null || String(value).trim() === '' || !Number.isFinite(n) || n < 0 || Math.abs(n - item.value) > .005) errors.push(item.key);
            else entered[item.key] = n;
        }
        return {
            ok: errors.length === 0,
            entered,
            errors
        };
    }

    function entryWritten(s, i) {
        return s.notes[i].every(t => t.trim().length > 0);
    }

    function entryDone(s, i) {
        return entryWritten(s, i) && s.sealedEntries[i];
    }

    function pendingEntry(s) {
        return [1, 3, 4].findIndex((q, i) => s.completed.includes(q) && !entryDone(s, i));
    }

    function load() {
        try {
            const text = localStorage.getItem(KEY);
            return text ? sanitize(JSON.parse(text)) : fresh();
        } catch {
            return fresh();
        }
    }

    function save(s) {
        s.updatedAt = new Date().toISOString();
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
            return true;
        } catch {
            return false;
        }
    }

    function ready(s) {
        return s.completed.length === 5 && [0, 1, 2].every(i => entryDone(s, i));
    }

    function fmt(n) {
        return Number(n.toFixed(2)).toString();
    }
    const api = {
        KEY,
        quests,
        entries,
        circuit,
        fresh,
        sanitize,
        load,
        save,
        ready,
        fmt,
        measurementSpec,
        validateMeasurements,
        entryWritten,
        entryDone,
        pendingEntry
    };
    root.IslandModel = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);