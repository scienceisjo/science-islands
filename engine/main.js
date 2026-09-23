(function() {
    'use strict';
    const M = IslandModel,
        $ = id => document.getElementById(id),
        esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        } [c])),
        f = M.fmt;
    const disp = x => esc(__ime.disp(x));
    let comfort;
    let festivalRunning = false;
    let suspendSave = false;
    let state = M.load(),
        world, sim = null,
        journalTab = -1,
        toastTimer, saveTimer, demo = false,
        interacting = null;
    const dlgIds = ['welcome', 'dialogue', 'lab', 'journal', 'map', 'settings', 'ending', 'story', 'inventory', 'concept'];
    const labels = ['내가 선택한 해결책', '증거와 과학적 이유', '다음 부탁에 적용하기'];

    function toast(t) {
        $('toast').textContent = t;
        $('toast').classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3400);
    }

    function save() {
        if (suspendSave) return;
        if (world) {
            state.pos = {
                x: world.player.position.x,
                z: world.player.position.z
            };
        }
        const ok = M.save(state);
        $('saveStatus').textContent = ok ? '기기에 저장됨' : '기기 저장이 막혀 있어요 · 일지 파일을 저장해 주세요';
        if (!ok) $('saveStatus').style.color = '#9d4a31';
    }

    function deferSave() {
        clearTimeout(saveTimer);
        $('saveStatus').textContent = '기록하는 중…';
        saveTimer = setTimeout(save, 450);
    }

    function beep() {
        try {
            comfort?.audio.chime();
        } catch {}
    }

    function sound(kind) {
        try {
            comfort?.audio.effect(kind);
        } catch {}
    }

    function labMessage(message) {
        const box = $('labFeedback');
        if (box) {
            box.textContent = message;
            box.hidden = false;
        } else toast(message);
    }

    function pause() {
        if (world) {
            world.paused = festivalRunning || dlgIds.some(id => $(id).open) || !state.started;
            world.keys.clear();
            world.joy = {
                x: 0,
                z: 0
            };
        }
    }

    function show(id) {
        if (id !== 'dialogue') comfort?.stopTalk(true);
        dlgIds.forEach(d => {
            if (d !== id && $(d).open) $(d).close();
        });
        if (!$(id).open) $(id).showModal();
        pause();
    }

    function close(id) {
        if (id === 'dialogue') comfort?.stopTalk(true);
        $(id).close();
        pause();
    }
    dlgIds.forEach(id => $(id).addEventListener('close', () => {
        if (id === 'lab') demo = false;
        pause();
    }));
    $('journal').addEventListener('cancel', e => {
        if (!comfort.confirmJournal()) e.preventDefault();
    });

    function next() {
        return M.quests.find(q => !state.completed.includes(q.id));
    }

    function accessible(id) {
        const entry = pendingEntry();
        return (entry < 0 || id <= [1, 3, 4][entry]) && (id === 0 || state.completed.includes(id - 1) || state.completed.includes(id));
    }

    function updateHud() {
        const q = next(),
            done = state.completed.length,
            pending = pendingEntry();
        $('questHud').hidden = !state.started;
        $('questHud').innerHTML = `<div class="eyebrow">${state.festival?'우리 전기의 숲':state.mode==='beginner'?'함께 알아가는 첫 탐험':'오늘의 작은 부탁'}</div><h2>${q?esc(q.name):state.festival?'축제가 시작됐어요!':'마지막 편지를 남겨요'}</h2><p>${q?esc(q.npc+'에게 가서 이야기를 들어요.'):state.festival?'주민을 만나고 내 캠프를 둘러보세요.':'해결 기록을 완성하고 축제를 열어요.'}</p><button data-action="${q?'navigate':'journal'}" ${q?'data-id="'+q.id+'"':''}>${q?'⌖ '+esc(q.place)+' 길 안내':'▤ 탐험일지 펼치기'}</button><div class="progress"><span style="width:${done*20}%"></span></div><div class="small-row"><span>${done} / 5 부탁 해결</span><span>${state.nickname?disp(state.nickname)+'의 섬':''}</span></div>`;
        if (pending >= 0) $('questHud').innerHTML = `<div class="eyebrow">다음 여정 전에 · 필수 기록</div><h2>${['공방의 작업 메모','두 주민에게 편지','다음 탐험가에게'][pending]}</h2><p>내 해결책·과학적 이유·다음 적용을 적고 서명해요.</p><button data-action="journal" data-tab="${pending}">✎ 기록 완성하기</button><div class="small-row">부탁 ${done}/5 · 필수 일지 ${[0,1,2].filter(i=>M.entryDone(state,i)).length}/3</div>`;
        if (!q && !state.festival && M.ready(state)) {
            const hud = $('questHud');
            hud.querySelector('h2').textContent = '빛 축제를 열 준비 완료!';
            hud.querySelector('p').textContent = '세 기록을 모두 완성했어요. 축제를 열고 제출할 파일을 준비해요.';
            const button = hud.querySelector('button');
            button.textContent = '✦ 축제와 제출 준비';
            button.dataset.tab = '4';
        }
        $('noteBadge').textContent = [0, 1, 2].filter(i => M.entryDone(state, i)).length;
        $('dayLabel').textContent = state.festival ? '반짝이는 축제의 저녁' : '불빛을 되찾는 밤';
        for (const q of M.quests) {
            const l = $('npc-' + q.id);
            if (l) {
                l.classList.toggle('done', state.completed.includes(q.id));
                l.classList.toggle('locked', !accessible(q.id));
                l.innerHTML = `${esc(q.npc)} <span>${state.completed.includes(q.id)?'✓':accessible(q.id)?'!':'·'}</span>`;
            }
        }
        document.body.classList.toggle('calm', state.calm);
    }

    function interact(id) {
        if (!state.started) return;
        interacting = id;
        const q = M.quests[id];
        if (!state.visited.includes(id)) {
            state.visited.push(id);
            save();
        }
        let message = q.story,
            button = `<button class="primary" data-action="lab" data-id="${id}">${state.completed.includes(id)?'다시 살펴보기':'같이 살펴볼게!'}</button>`;
        if (!accessible(id)) {
            message = `반가워! 먼저 ${M.quests[id-1].npc}의 부탁을 도와줄래? 그곳에서 알아낸 것이 여기에서도 도움이 될 거야.`;
            button = `<button class="primary" data-action="navigate" data-id="${id-1}">그곳으로 가기</button>`;
        } else if (state.completed.includes(id)) message = ['네가 연결해 준 덕분에 축제 초대장을 모두 보냈어! 스위치를 열어도 전원의 양 끝에는 전압이 있다는 것도 발견했지?', '네 작업 메모가 있으면 다음에 전원이 바뀌어도 어떤 조건부터 비교할지 알 수 있겠어. 고마워!', '전류가 앞에서 다 쓰인 게 아니었구나. 어느 곳에서 측정해도 같았어. 이번에는 다른 연결도 비교해 볼까?', '이제 테라스 등을 꺼도 실내에서 책을 읽을 수 있어! 어떤 경로가 계속 연결되어 있는지 네 편지에 남겨 줘.', '부스만 쉬는 동안에도 안내등이 켜져 있어! 일지를 마치면 다 같이 빛 축제를 시작하자.'][id];
        $('dialogueContent').innerHTML = `<div class="dialogue-name" id="npcName"><span>${q.animal}</span>${esc(q.npc)}</div><p class="dialogue-text">${esc(message)}</p><div class="dialogue-footer"><small>${esc(q.place)}<br>${esc(q.concept)}</small>${button}</div>`;
        show('dialogue');
        comfort.startTalk(id);
    }
    const predictions = [
        ['스위치를 열면 전원 양 끝의 전압도 0이 될까?', ['전압도 0이 될 것 같아', '전압은 남아 있을 것 같아', '실험으로 확인해 볼래']],
        ['같은 전압에서 저항을 크게 하면 전류는?', ['더 커질 것 같아', '더 작아질 것 같아', '달라지지 않을 것 같아']],
        ['저항 장치를 지난 뒤의 전류는 앞보다 작을까?', ['앞보다 작을 것 같아', '앞과 같을 것 같아', '위치에 따라 다를 것 같아']],
        ['두 가지 중 테라스만 끊으면 실내 전류는?', ['실내도 0이 될 것 같아', '실내는 그대로일 것 같아', '실험으로 확인해 볼래']],
        ['배치가 다른 축제 회로에도 카페의 방법이 통할까?', ['연결 관계가 같으면 통할 것 같아', '모양이 달라서 다른 원리가 필요해', '직접 연결해 보고 판단할래']]
    ];

    function beginLab(id, teacher = false) {
        if (!teacher && !accessible(id)) {
            openJournal(pendingEntry());
            toast('주민에게 남길 필수 기록을 먼저 완성해 주세요.');
            return;
        }
        demo = teacher;
        sim = {
            id,
            phase: 0,
            type: 'series',
            v: id === 1 ? 3 : 6,
            r1: 10,
            r2: 20,
            count: id < 2 ? 1 : 2,
            on1: id !== 0,
            on2: true,
            probe: 'source',
            electrons: false,
            hint: false,
            localEvidence: [],
            view: 'picture',
            length: 1,
            area: 1,
            selectedPart: null
        };
        if (id === 2) sim.count = 1;
        if (id === 3 || id === 4) sim.type = 'series';
        /* 공방: 이미 모은 증거만큼 단계를 복원(다시 열었을 때 첫 기록이 곧바로 Step 완료처럼 보이던 것 방지) */
        if (id === 1) {
            const cs = IslandMissions.checks(sim, tags());
            if (cs[0]) {
                sim.phase = 1;
                sim.v = 6;
                sim.length = 1;
                sim.area = 1;
                sim.r1 = 10;
            }
            if (cs[0] && cs[1]) sim.phase = 2;
        }
        renderLab();
        show('lab');
        demo = teacher;
        pause();
    }

    function evid() {
        return demo ? sim.localEvidence : state.evidence[sim.id];
    }

    function tags() {
        return evid().filter(e => e.manual).map(e => e.tag);
    }

    function checks() {
        return IslandMissions.checks(sim, tags()).map((ok, i) => [ok, IslandMissions.steps(sim.id)[i]]);
    }

    function doneChecks() {
        return checks().every(c => c[0]);
    }

    function circuitSvg(p, options = {}) {
        return IslandCircuit.svg(p, options);
    }

    function simData() {
        return {
            type: sim.type,
            v: sim.v,
            r1: sim.r1,
            r2: sim.r2,
            count: sim.count,
            on1: sim.on1,
            on2: sim.on2,
            layout: sim.id === 4 ? 'festival' : 'standard'
        };
    }

    function hintText() {
        return [
            '전압은 두 지점 사이에서 측정해요. 스위치를 열고 닫아도 전원의 두 단자는 그대로예요. 전류는 한 지점을 1초 동안 통과하는 전하량이며, 1 A는 1 C/s예요.',
            '처음에는 저항을 10 Ω으로 고정하고 전압만 바꿔요. 다음에는 전압을 6 V로 고정하고 저항만 바꿔요. 전압이 일정할 때 전류를 줄이려면 저항을 어떻게 해야 할까요?',
            '갈림길이 없는 회로예요. 장치 하나와 두 개일 때를 비교하고, 두 장치의 저항이 다를 때 앞뒤 전류와 각각의 전압을 살펴봐요. 스위치를 열면 돌아오는 길이 이어질까요?',
            '각 장치가 전원의 두 단자에 연결되도록 가지를 나누어 보세요. 테라스 스위치는 테라스 가지에 있어야 해요. 실내 10 Ω, 테라스 20 Ω일 때도 가지 전류가 같은지 확인해요.',
            '새 장소에서도 전류가 흐를 경로를 따라가 보세요. 부스의 경로를 끊었을 때 안내등에는 전원으로 이어지는 닫힌 경로가 남아 있어야 해요.'
        ][sim.id];
    }

    function renderLab() {
        const q = M.quests[sim.id],
            cs = checks(),
            can = demo || state.predictions[q.id],
            current = cs.findIndex(c => !c[0]);
        $('labContent').innerHTML = `<header class="modal-head"><div class="eyebrow">${demo?'교사 시연 · 학생 기록에 저장되지 않아요':esc(q.place)+' · 탐험 '+(q.id+1)}</div><h2 id="labTitle">${esc(q.name)}</h2><button class="close" data-close aria-label="실험 닫기">×</button><p>${esc(q.goal)}</p></header><div class="lab-layout"><aside class="lab-side"><div class="lab-task-head"><h3 class="task-heading">${q.npc}의 부탁을 들어주기 위해 할 일</h3><details class="lab-guide"><summary>부탁·원리 다시 보기</summary><div class="lab-guide-content"><b>${q.animal} ${q.npc}의 부탁</b><p>${esc(q.story)}</p><h4>원리 다시 살펴보기</h4><p>${hintText()}</p><p class="science-note">전압이 일정한 전원과 저항값이 일정한 장치의 모형이에요. 저항에서 전자가 사라지는 것은 아니에요.</p><p class="science-note">A 전류계는 전류가 흐르는 길에 직렬로, V 전압계는 측정할 두 지점에 병렬로 연결해요. 이상적인 계기를 사용한 모형이에요.</p></div></details><button class="hint-button" data-action="next-hint">💡 다음에 무엇을 하지?</button></div><ol class="mission-steps">${cs.map((c,i)=>`<li class="${c[0]?'done':i===current?'current':''}"><span class="step-number">Step ${i+1}${c[0]?' ✓':''}</span><div><b>${c[0]?'해냈어요':i===current?'지금 할 일':'다음 할 일'}</b><p>${esc(c[1])}</p></div></li>`).join('')}</ol><p id="nextHint" class="hint-message" role="status"></p></aside><section class="lab-main">${!can?`<div class="prediction"><div class="prediction-scene">${circuitSvg(simData(),{picture:true,preview:true,names:IslandPlay.names(q.id),sceneTitle:IslandPlay.titles[q.id],sceneId:q.id})}</div><div class="prediction-choices"><p><b>먼저 나의 예상</b><br>${esc(predictions[q.id][0])}</p><div class="choices">${predictions[q.id][1].map((t,i)=>`<button data-action="predict" data-value="${i}">${esc(t)}</button>`).join('')}</div><p class="muted">예상은 틀려도 괜찮아요. 실험 뒤 생각을 바꿀 수 있어요.</p></div></div>`:renderExperiment()}</section></div>`;

    }

    function nextHint() {
        document.querySelectorAll('.hint-target').forEach(el => el.classList.remove('hint-target'));
        const hint = sim.record ? {
            selector: '#recordForm input[aria-invalid="true"], #recordForm input:invalid',
            copy: '회로 그림과 계기에서 읽은 수치를 적고 ‘기록 확인’을 눌러요.'
        } : IslandMissions.hint(sim, tags(), demo || !!state.predictions[sim.id]);
        const target = $('lab').querySelector(hint.selector) || $('recordForm')?.querySelector('button[type=submit]');
        $('nextHint').textContent = hint.copy;
        if (target) {
            target.classList.add('hint-target');
            target.scrollIntoView({
                block: 'nearest',
                behavior: state.calm ? 'auto' : 'smooth'
            });
            setTimeout(() => target.classList.remove('hint-target'), 6500);
        }
    }

    function renderExperiment() {
        const p = simData(),
            v = M.circuit(p),
            id = sim.id;
        let controls = '';
        controls = IslandPlay.controls(sim);
        let phaseBtn = '';
        return `<div class="experiment-workbench ${sim.record?'is-recording':''}"><section class="circuit-pane" aria-label="회로와 측정값"><div class="sim-badges"><button data-action="lab-view" data-view="picture" aria-pressed="${sim.view==='picture'}">상황 그림</button><button data-action="lab-view" data-view="circuit" aria-pressed="${sim.view==='circuit'}">회로</button><span class="pill amber">A 전류계 · 직렬</span><span class="pill purple">V 전압계 · 병렬</span></div><div id="probeToolbar">${probeToolbar()}</div><div id="diagram" class="circuit-wrap">${IslandPlay.svg(sim,p)}${IslandPlay.zones(sim)}</div><div id="readings">${readingHtml(v)}</div><p id="meterExplanation" class="circuit-note">${meterExplanation()}${sim.electrons?' 움직이는 파란 점은 전자 이동 모형이에요(전자는 전류의 반대 방향으로 움직여요). 실제 축척이 아니에요.':''}</p></section><section class="lab-tools" aria-label="회로 조작과 직접 기록"><fieldset class="experiment-controls" ${sim.record?'disabled':''}><legend>회로 조건 바꾸기</legend><p id="labFeedback" class="lab-feedback" role="alert" hidden></p>${controls}${sim.id===1&&checks()[0][0]&&checks()[1][0]?'<div class="compact-rule">I = V ÷ R · 같은 저항이면 전압이 커질수록 전류가 커져요.</div>':''}<div class="action-row"><button class="secondary" data-action="capture">▣ 증거 남기기</button>${phaseBtn}<button class="primary" data-action="complete" ${doneChecks()?'':'disabled'}>${state.completed.includes(id)?'조사 마치기':'부탁 해결하기 ✓'}</button></div><p class="record-invite">회로를 바꿔 관찰한 뒤 ‘증거 남기기’를 누르면 이 자리에서 값을 기록해요.</p></fieldset>${recorderHTML()}${evid().length?`<details class="evidence-list"><summary>내가 남긴 증거 ${evid().length}개 보기</summary><div class="evidence-history">${evid().slice(-3).map(e=>`<div class="evidence-item">${e.manual?'✎ 직접 기록':'이전 자동 기록'} · ${esc(e.label)} · 전체 전류 ${f(e.values.total)} A</div>`).join('')}</div></details>`:''}</section></div>`;

    }

    function refreshDiagram() {
        if (!sim || !$('diagram')) return;
        $('diagram').innerHTML = IslandPlay.svg(sim, simData()) + IslandPlay.zones(sim);
        $('readings').innerHTML = readingHtml(M.circuit(simData()));
        $('meterExplanation').textContent = meterExplanation();
        if ($('probeToolbar')) $('probeToolbar').innerHTML = probeToolbar();
    }

    function placePart(place) {
        if (!sim || sim.record) return;
        if (place === 'device') {
            sim.count = 2;
            sim.r2 = 10;
            sim.on1 = true;
        } else sim.type = place;
        sim.selectedPart = null;
        sound('place');
        renderLab();
    }

    function probeToolbar() {
        const names = IslandPlay.names(sim.id);
        return '<div class="probe-toolbar" role="group" aria-label="전압계 측정 위치"><b>전압계 · 어디를 잴까요?</b><small class="probe-help">V 전압계는 두 지점 사이의 전압을 재요. 버튼을 누르면 전압계가 그 장치의 양 끝으로 옮겨 붙어요(보라 점 두 개가 연결한 곳).</small><div>' + ['source', 'r1', ...(sim.count === 2 ? ['r2'] : [])].map((key, i) => '<button type="button" class="probe-pick probe-' + i + '" data-action="probe" data-probe="' + key + '" aria-pressed="' + (sim.probe === key) + '">' + (i === 0 ? '전원 양 끝' : (sim.type === 'parallel' ? '가지 ' + (i === 1 ? '①' : '②') + ' · ' : (i === 1 ? '①' : '②') + ' · ') + names[i - 1]) + '</button>').join('') + '</div></div>';
    }

    function measureHint(item, p) {
        const n = IslandPlay.names(sim?.id ?? (p.layout === 'festival' ? 4 : 3)),
            par = p.type === 'parallel',
            two = p.count === 2;
        const probeOf = (i, txt) => '전압계 버튼 「' + (par ? '가지 ' : '') + (i ? '② · ' : '① · ') + n[i] + '」을 누르면 전압계가 ' + n[i] + ' 양 끝에 연결돼요 → 그때 V 계기 값';
        return {
            source: '전압계 버튼 「전원 양 끝」을 누르고 V 계기 값을 읽어요',
            total: par ? '가지가 다시 합쳐진 뒤 전원 옆 전류계 A의 값' : (two ? '전류계의 값' : '전류계 A의 값'),
            i1: par ? '가지 ①에 있는 전류계 A₁의 값' : '① ' + n[0] + ' 앞에 있는 전류계 A₁의 값',
            i2: par ? '가지 ②에 있는 전류계 A₂의 값' : '② ' + n[1] + ' 뒤에 있는 전류계 A₂의 값',
            v1: probeOf(0),
            v2: probeOf(1),
            branch1: probeOf(0),
            branch2: probeOf(1)
        } [item.key] || '';
    }

    function measurementLabel(item, p, id = sim?.id) {
        const n = IslandPlay.names(id ?? (p.layout === 'festival' ? 4 : 3));
        return item.label.replace('가지 1', '가지 ① · ' + n[0]).replace('가지 2', '가지 ② · ' + n[1]).replace('장치 1', '① · ' + n[0]).replace('장치 2', '② · ' + n[1]);
    }

    function openConcept() {
        try {
            sim.concept = {
                data: IslandConcept.build(sim.id, evid()),
                index: 0,
                correct: false,
                passed: false
            };
            renderConcept();
            $('concept').showModal();
            pause();
        } catch (error) {
            labMessage(error.message);
        }
    }

    function renderConcept() {
        const c = sim.concept,
            d = c.data,
            q = d.questions[c.index];
        $('conceptContent').innerHTML = '<header class="modal-head"><h2 id="conceptTitle">' + esc(d.title) + '</h2><button class="close" data-close aria-label="실험으로 돌아가기">×</button></header><div class="concept-body"><p class="concept-evidence">' + esc(d.observation) + '</p>' + (c.passed ? '<h3>측정값으로 원리를 설명했어요!</h3><p class="concept-summary">' + esc(d.summary) + '</p><button class="primary" data-action="concept-finish">부탁 해결 · 주민에게 전하기</button>' : '<p>발견 확인 ' + (c.index + 1) + ' / ' + d.questions.length + '</p>' + (d.figure ? '<div class="concept-figure circuit-wrap">' + IslandCircuit.svg(d.figure.p, {
            probe: q.probe || 'source',
            names: d.figure.names,
            final: d.figure.final
        }) + '</div>' : '') + '<h3>' + esc(q.prompt) + '</h3><div class="concept-choices">' + q.choices.map((t, i) => '<button data-action="concept-answer" data-value="' + i + '" ' + (c.correct ? 'disabled' : '') + '>' + esc(t) + '</button>').join('') + '</div><p id="conceptFeedback" role="status">' + (c.correct ? esc(q.explanation) : '내 측정값과 회로를 떠올려 골라 주세요.') + '</p>' + (c.correct && q.analogy ? '<div class="concept-analogy">' + esc(q.analogy) + '</div>' : '') + (c.correct ? '<button class="primary" data-action="concept-next">' + (c.index + 1 === d.questions.length ? '발견 정리 보기' : '다음 확인 →') + '</button>' : '')) + '</div>';
    }

    function meterExplanation() {
        const v = M.circuit(simData());
        if (sim.probe === 'source') return '전원 양 끝을 측정해요. 스위치를 열어도 전원의 전압은 그대로예요.';
        if (sim.type === 'parallel') {
            const off = sim.probe === 'r1' ? !sim.on1 : !sim.on2,
                nm = IslandPlay.names(sim.id)[sim.probe === 'r1' ? 0 : 1];
            return off ? nm + ' 양 끝을 측정해요. 이 가지의 스위치가 열려 전류가 0 A이므로 등 양 끝 전압도 0 V예요. (전원의 전압은 열린 스위치 양 끝에 걸려 있어요.)' : nm + ' 양 끝을 측정해요. 이 가지는 전원의 두 단자에 바로 이어져 있어서 전원 전압과 같아요.';
        }
        return v.total === 0 ? '저항 장치 양 끝을 측정해요. 전류가 0 A이므로 장치에 걸리는 전압도 0 V예요.' : '저항 장치 양 끝을 측정해요. 장치에 걸리는 전압은 전류 × 저항이에요.';
    }

    function readingHtml(v) {
        const voltage = sim.probe === 'source' ? v.source : sim.probe === 'r1' ? v.branch1 : v.branch2;
        return `<div class="reading-row"><div class="reading current"><small>전체 전류</small><b>${f(v.total)}</b><em>A</em></div><div class="reading voltage"><small>${sim.probe==='source'?'전원 양 끝':(sim.type==='parallel'?'가지 ':'')+(sim.probe==='r1'?'① ':'② ')+IslandPlay.names(sim.id)[sim.probe==='r1'?0:1]}</small><b>${f(voltage)}</b><em>V</em></div><div class="reading resistance"><small>${sim.id===1&&sim.phase===2?'목표 전류':IslandPlay.names(sim.id)[0]+' 저항'}</small><b>${sim.id===1&&sim.phase===2?'0.3':sim.r1}</b><em>${sim.id===1&&sim.phase===2?'A':'Ω'}</em></div></div>`;
    }

    function capture() {
        if (sim.record) {
            $('recordForm')?.querySelector('input')?.focus();
            return;
        }
        if (sim.id === 1 && !sim.on1) {
            labMessage('공방 비교에서는 스위치를 닫아 전류가 흐르게 해요.');
            return;
        }
        if (sim.id === 3 && !sim.on1) {
            labMessage('실내등은 켜 두고 테라스만 비교해 주세요.');
            return;
        }
        const p = simData(),
            v = M.circuit(p);
        let tag, label;
        if (sim.id === 0) {
            tag = sim.on1 ? 'closed' : 'open';
            label = sim.on1 ? '스위치를 닫은 회로' : '스위치를 연 회로';
        }
        if (sim.id === 1) {
            if (sim.phase === 0 && Math.abs(p.r1 - 10) > .001) {
                labMessage('전압을 비교할 때는 저항을 10 Ω으로 맞춰 주세요.');
                return;
            }
            if (sim.phase > 0 && p.v !== 6) {
                labMessage('저항을 비교할 때는 전압을 6 V로 맞춰 주세요.');
                return;
            }
            if (sim.phase === 0) {
                tag = 'voltage-' + p.v;
                label = `저항 10 Ω 고정 · 전압 ${p.v} V`;
            } else if (sim.phase === 1) {
                tag = 'resistance-' + p.r1;
                label = `전압 6 V 고정 · 저항 ${p.r1} Ω`;
            } else {
                if (Math.abs(v.total - .3) > .001) {
                    labMessage('목표는 0.3 A예요. 힌트를 눌러 저항을 다시 골라 보세요.');
                    return;
                }
                tag = 'target';
                label = '공방 장치 목표 0.3 A 달성';
            }
        }
        if (sim.id === 2) {
            if (!sim.on1 && sim.count !== 2) {
                labMessage('Step 3에서는 두 안내등을 연결한 상태에서 회로를 끊어 주세요.');
                return;
            }
            tag = !sim.on1 ? 'broken' : sim.count === 1 ? 'single' : 'pair-' + sim.r2;
            label = !sim.on1 ? '직렬 두 장치의 회로 끊기' : sim.count === 1 ? '장치 하나 연결' : `직렬 · 10 Ω과 ${sim.r2} Ω 비교`;
        }
        if (sim.id === 3) {
            tag = p.type !== 'parallel' ? 'series' : (p.on2 ? 'both-' : 'one-') + p.r2;
            label = p.type !== 'parallel' ? '비교를 위한 직렬 연결' : `병렬 · ${p.r2} Ω 테라스 ${p.on2?'켜기':'끄기'}`;
        }
        if (sim.id === 4) {
            if (!(p.type === 'parallel' && p.on1 && !p.on2 && v.i1 > 0 && v.i2 === 0)) {
                labMessage('안내등은 켜고 부스만 꺼 주세요. 힌트 버튼이 다음 조작을 알려 줘요.');
                return;
            }
            tag = 'festival';
            label = '공연장 유지 · 부스만 끄기';
        }
        const previous = evid().find(e => e.tag === tag && e.manual);
        sim.view = 'circuit';
        sim.record = {
            tag,
            label,
            p,
            values: v,
            previous
        };
        renderLab();
        if (!matchMedia('(min-width:900px) and (orientation:landscape)').matches) $('recordForm')?.scrollIntoView({
            block: 'nearest'
        });
        $('recordForm')?.querySelector('input')?.focus({
            preventScroll: true
        });
    }

    function recorderHTML() {
        const r = sim.record;
        if (!r) return '';
        return `<form id="recordForm" class="record-form"><div class="eyebrow">나의 관찰을 증거로</div><h3>✎ 계기 값을 직접 기록해요</h3><p class="record-description">${esc(r.label)}<br>회로 조건은 고정돼요. 옆의 계기를 보고 적어요.</p><div class="measurement-fields">${M.measurementSpec(r.p).map(item=>`<label>${esc(measurementLabel(item,r.p))}<small class="measure-hint">${esc(measureHint(item,r.p))}</small><span><input id="measure-${item.key}" name="${item.key}" type="number" inputmode="decimal" min="0" step="any" required data-ime="off" value="${esc(r.previous?.enteredRaw?.[item.key]??'')}" aria-label="기록할 ${esc(measurementLabel(item,r.p))}"><b>${item.unit}</b></span><small id="error-${item.key}" class="measure-error"></small></label>`).join('')}</div><p class="record-error" id="recordError" role="alert"></p><div class="action-row"><button type="button" data-action="record-cancel">회로로 돌아가기</button><button type="submit" class="primary">✓ 기록 확인·일지에 붙이기</button></div></form>`;
    }

    function commitRecord(form) {
        const r = sim?.record;
        if (!r) return;
        const entered = Object.fromEntries(new FormData(form)),
            check = M.validateMeasurements(r.p, entered);
        form.classList.toggle('has-errors', !check.ok);
        M.measurementSpec(r.p).forEach(item => {
            const error = check.errors.includes(item.key);
            $('measure-' + item.key).setAttribute('aria-invalid', String(error));
            $('error-' + item.key).textContent = error ? '계기 값·단위를 확인해요.' : '';
        });
        if (!check.ok) {
            $('recordError').textContent = '표시된 칸의 계기 값과 단위를 다시 확인해요.';
            $('measure-' + check.errors[0]).focus();
            return;
        }
        const list = evid(),
            old = list.findIndex(e => e.tag === r.tag);
        const {
            previous,
            ...recordData
        } = r;
        const record = {
            ...recordData,
            entered: check.entered,
            enteredRaw: entered,
            manual: true,
            time: new Date().toISOString()
        };
        if (old >= 0) list[old] = record;
        else list.push(record);
        sim.record = null;
        if (sim.id === 1) {
            const cs = checks();
            if (sim.phase === 0 && cs[0][0]) {
                sim.phase = 1;
                sim.v = 6;
                sim.length = 1;
                sim.area = 1;
                sim.r1 = 10;
            } else if (sim.phase === 1 && cs[1][0]) sim.phase = 2;
        }
        if (!demo) save();
        beep();
        renderLab();
        toast('직접 적은 측정값을 탐험일지에 붙였어요.');
    }

    function completeQuest(approved = false) {
        if (!doneChecks()) return;
        if (sim.id >= 2 && !approved) {
            openConcept();
            return;
        }
        const id = sim.id,
            q = M.quests[id];
        if (demo) {
            close('lab');
            toast('시연을 마쳤어요. 학생 기록은 바뀌지 않았어요.');
            return;
        }
        const was = state.completed.includes(id);
        if (!was) state.completed.push(id);
        save();
        world?.applyProgress();
        updateHud();
        sound('success');
        close('lab');
        const entry = [1, 3, 4].indexOf(id),
            nextQ = M.quests[id + 1];
        $('dialogueContent').innerHTML = `<div class="dialogue-name" id="npcName"><span>${q.animal}</span>${q.npc}</div>${entry>=0?'<img class="story-strip" src="art/story-journal.png" alt="주민들과 탐험일지를 살펴보는 탐험가">':''}<p class="dialogue-text">${['불이 들어왔어! 네가 적어 준 측정값을 초대장과 함께 간직할게. 모아의 공방에도 가 볼래?','필요한 전류를 만들었어! 네 해결책과 과학적 이유를 작업 메모에 남겨 줘. 메모가 완성되면 토리에게 가 보자.','한 경로가 끊기면 모두 꺼지는 거였구나. 카페의 소담은 하나만 끄고 싶다던데 여기서 쓴 연결로도 될까?','이제 테라스만 꺼도 책을 읽을 수 있어! 숲길과 카페를 비교한 편지를 완성하고 축제 광장으로 가자.','새로운 회로에서도 통했어! 다음 탐험가에게 해결 방법과 새로운 예상까지 남기면 축제가 시작돼.'][id]}</p><div class="notice">${was?'다시 탐구했어요':'받은 선물 · '+q.reward}</div><div class="dialogue-footer">${entry>=0?`<button class="primary" data-action="journal" data-tab="${entry}">✎ ${['공방의 작업 메모','두 주민에게 편지','다음 탐험가에게'][entry]} 작성하기 · 필수</button>`:`<button class="primary" data-action="navigate" data-id="${nextQ.id}">다음 주민에게 →</button>`}</div>`;
        show('dialogue');
        comfort.startTalk(id);
        IslandCelebrate.burst($('dialogue'), state.calm, '부탁 해결!');
    }

    function evidenceText(e) {
        const v = e.values,
            p = e.p,
            manual = e.manual ? M.measurementSpec(p).map(item => item.label + ' ' + (e.enteredRaw?.[item.key] ?? f(e.entered[item.key])) + ' ' + item.unit).join(' · ') : '';
        return `${e.manual?'✎ 내가 직접 기록':'이전 자동 기록'} · ${e.label} · 전원 ${f(p.v)} V · ${manual||('전체 '+f(v.total)+' A'+(p.count===2?' · '+(p.type==='parallel'?'가지':'앞뒤')+' 전류 '+f(v.i1)+' / '+f(v.i2)+' A · 전압 '+f(v.branch1)+' / '+f(v.branch2)+' V':''))}`;
    }

    let peekOpen = false;
    /* 일지 질문 옆 「내 기록 보기」 — 그 기록장에 딸린 부탁들의 증거를 값 중심으로 펼쳐 보여 준다(질문이 "전압을 얼마로 했나요" 같이 물어서). */
    function peekPanel(ids) {
        const body = ids.map(qid => {
            const q = M.quests[qid],
                n = IslandPlay.names(qid),
                list = state.evidence[qid];
            const rows = list.map(e => {
                const p = e.p,
                    par = p.type === 'parallel',
                    two = p.count === 2;
                const sw = par && two ? `스위치 ①${p.on1?'닫힘':'열림'} ②${p.on2?'닫힘':'열림'}` : `스위치 ${p.on1&&(!two||p.on2)?'닫힘':'열림'}`;
                const cond = `${par?'병렬':'직렬'} · 전원 ${f(p.v)} V · ${n[0]} ${f(p.r1)} Ω${two?` · ${n[1]} ${f(p.r2)} Ω`:''} · ${sw}`;
                const vals = e.manual ? M.measurementSpec(p).map(item => `${esc(measurementLabel(item,p,qid))} <em class="${item.unit==='V'?'v':''}">${esc(e.enteredRaw?.[item.key]??f(e.entered[item.key]))} ${item.unit}</em>`).join(' · ') :
                    `전체 전류 <em>${f(e.values.total)} A</em>${two?` · ${par?'가지':'앞뒤'} 전류 <em>${f(e.values.i1)} / ${f(e.values.i2)} A</em> · 전압 <em class="v">${f(e.values.branch1)} / ${f(e.values.branch2)} V</em>`:''}`;
                return `<div class="peek-row"><b>${e.manual?'✎ ':''}${esc(e.label)}</b><div class="peek-cond">${esc(cond)}</div><div class="peek-vals">${vals}</div></div>`;
            }).join('');
            return `<h5>${q.animal} ${esc(q.npc)} · ${esc(q.name)}</h5>${rows||'<p class="peek-empty">아직 기록이 없어요. 주민의 부탁에서 ‘증거 남기기’로 값을 적으면 여기 나와요.</p>'}`;
        }).join('');
        return `<aside id="evidencePeek" class="evidence-peek" ${peekOpen?'':'hidden'} aria-label="내가 기록한 측정값"><h4>📋 내가 기록한 측정값 <button type="button" data-action="evidence-peek">닫기</button></h4>${body}</aside>`;
    }

    function journalEvidence(ids) {
        const list = ids.flatMap(i => state.evidence[i]);
        if (!list.length) return '<div class="notice">주민의 부탁을 살펴보고 ‘증거 남기기’를 누르면 여기에 실험 기록이 붙어요.</div>';
        return `<details class="journal-evidence"><summary>내가 남긴 실험 증거 ${list.length}개 펼치기</summary>${list.map(e=>`<div class="evidence-item">${esc(evidenceText(e))}</div>`).join('')}<div class="circuit-wrap">${circuitSvg(list[list.length-1].p)}</div></details>`;
    }

    function renderJournal(tab = journalTab) {
        journalTab = Number(tab);
        const finished = [0, 1, 2].filter(i => M.entryDone(state, i)).length;
        let body = '';
        if (journalTab === -1) {
            body = `<div class="journal-cover"><div class="eyebrow">놀러오세요 전기의 숲</div><div class="big-symbol">✦</div><h3>${disp(state.nickname)}의<br>전기의 숲 탐험일지</h3><p>작은 부탁에서 시작된, 나의 과학 이야기</p><div class="stamps">${M.quests.map(q=>`<span class="stamp ${state.completed.includes(q.id)?'done':''}" title="${q.name}">${q.animal}</span>`).join('')}</div></div><div class="identity-fields"><label>탐험가 별명<input data-ime="submit" data-identity="nickname" value="${esc(state.nickname)}" maxlength="20" aria-label="탐험가 별명"></label><label>학급<input data-ime="off" data-identity="classCode" value="${esc(state.classCode)}" maxlength="20" placeholder="예: 2-3" aria-label="학급"></label><label>번호<input data-ime="off" data-identity="number" value="${esc(state.number)}" maxlength="10" placeholder="번호" inputmode="numeric" aria-label="번호"></label></div>${IslandComfort.helpHTML}<p>주민의 부탁, 내가 바꾼 회로, 발견한 증거를 함께 모아요. 내 설명은 ‘어떻게 해결했는지 → 왜 통했는지 → 다음에는 어떻게 쓸지’를 담아요.</p><div class="journal-progress">부탁 ${state.completed.length}/5 · 해결 기록 ${finished}/3 완성</div>${journalEvidence([0])}<div class="action-row"><button data-action="journal-tab" data-tab="0" class="primary">첫 해결 기록 펼치기 →</button></div>`;
        } else if (journalTab >= 0 && journalTab <= 2) {
            const e = M.entries[journalTab];
            body = `<img class="journal-art" src="art/story-journal.png" alt="주민과 함께 완성하는 탐험일지"><div class="eyebrow">필수 탐험 기록 ${journalTab+1} / 3 · ${M.entryDone(state,journalTab)?'서명 완료 ✓':'작성 후 서명해요'}</div><h3>${esc(e.title)}</h3><p>${esc(e.story)}</p>${journalEvidence(e.quests)}${IslandComfort.helpHTML}${peekPanel(e.quests)}${e.questions.map((q,i)=>`<div class="field"><div class="field-head"><label for="note-${journalTab}-${i}"><span>${i+1}</span>${esc(e.labels?.[i]||labels[i])}</label><button type="button" class="peek-btn" data-action="evidence-peek" aria-pressed="${peekOpen}">📋 내 기록 보기</button></div><small>${esc(q)}</small><textarea id="note-${journalTab}-${i}" data-ime="submit" data-note="${journalTab},${i}" rows="3" required maxlength="5000" placeholder="${esc(state.mode==='beginner'?e.starts[i]:'내 실험과 이야기를 연결해 적어 주세요.')}" spellcheck="false">${esc(state.notes[journalTab][i])}</textarea></div>`).join('')}<button type="button" class="secondary ime-check" data-action="check-writing">✓ 기록 확인 · 한글 보정</button><p class="muted">작성 중인 글도 자동으로 저장돼요. 처음 예상과 달라졌어도 괜찮아요. 글의 길이보다 내 선택의 이유가 중요해요.</p><div class="action-row"><button class="secondary" data-action="journal-tab" data-tab="${journalTab===0?-1:journalTab-1}">← 이전</button><button class="primary" data-action="seal-entry">${M.entryDone(state,journalTab)?'✓ 서명한 기록 다시 확인':'✎ 기록에 서명하고 완성하기'}</button>${M.entryDone(state,journalTab)?(journalTab<2?`<button class="primary" data-action="navigate" data-id="${journalTab===0?2:4}">다음 주민에게 →</button>`:`<button class="primary" data-action="journal-tab" data-tab="4">축제와 제출 준비 →</button>`):''}</div>`;
        } else if (journalTab === 3) {
            body = `<div class="eyebrow">발견을 한눈에</div><h3>두 연결에서 무슨 일이 있었을까?</h3>${summaryTable()}<div class="note myth">저항은 전자를 없애지 않아요. 정상 상태의 직렬 회로에서는 저항 앞뒤 전류가 같아요. 병렬에서 가지 전류가 같은 것은 저항이 같을 때예요.</div><p class="muted">전압이 일정한 이상적 전원과 저항값이 일정한 장치를 비교한 결과예요. 합성 저항 계산과 혼합 연결은 다루지 않아요.</p><div class="action-row"><button class="primary" data-action="journal-tab" data-tab="4">제출 준비하기 →</button></div>`;
        } else {
            body = `<div class="eyebrow">나의 탐험을 한 권으로</div><h3>탐험일지 완성·제출 준비</h3><p>해결 기록과 실험 증거를 한 파일에 모아요. 선생님이 정한 과제 제출처에 이 파일을 올려 주세요.</p><ul class="quest-checks"><li class="${state.completed.length===5?'ok':''}"><span>${state.completed.length===5?'✓':'○'}</span>주민의 부탁 ${state.completed.length}/5 해결</li><li class="${finished===3?'ok':''}"><span>${finished===3?'✓':'○'}</span>해결책·과학적 이유·적용 기록 ${finished}/3 완성</li></ul><div class="notice">${M.ready(state)?'일지를 완성했어요! 축제를 열고 제출용 파일을 저장할 수 있어요.':'빈 기록을 채워 주세요. 작성 중인 일지도 파일로 보관할 수 있어요.'}</div><div class="end-actions"><button class="primary" data-action="finish">${state.festival?'축제 다시 보기':'빛 축제 열기'}</button><button data-action="print">인쇄 / PDF로 저장</button><button data-action="export-html">제출용 탐험일지 저장 (.html)</button><button data-action="export-json">이어서 쓸 기록 보관 (.json)</button><button data-action="import">저장한 기록 가져오기</button></div><p class="muted">이 화면은 파일을 준비하는 곳이에요. 온라인 제출함으로 전송하지 않아요. PDF는 인쇄 창에서 ‘PDF로 저장’을 선택하세요.</p>`;
        }
        $('journalContent').innerHTML = `<header class="modal-head"><div class="eyebrow">차곡차곡 쌓인 나의 발견</div><h2 id="journalTitle">탐험일지</h2><button class="close" data-close aria-label="일지 닫기">×</button></header><div class="journal-layout"><nav class="journal-nav" aria-label="일지 페이지">${[['-1','✦','나의 탐험일지'],['0','01','공방의 작업 메모'],['1','02','두 주민에게 편지'],['2','03','다음 탐험가에게'],['3','▦','발견 비교표'],['4','✓','완성·제출 준비']].map(([i,icon,l])=>`<button class="${+i===journalTab?'active':''}" data-action="journal-tab" data-tab="${i}"><b>${icon}</b>${l}</button>`).join('')}<small>실험 기록은 자동으로 붙어요.<br>해결의 이유는 내 말로 남겨요.<br><br>작성 내용은 이 기기에 저장돼요.</small></nav><section class="journal-page">${body}</section></div>`;
    }

    function openJournal(tab = -1) {
        renderJournal(tab);
        show('journal');
    }

    function summaryTable() {
        const s = state.completed.includes(2),
            p = state.completed.includes(3),
            pending = '탐험하고 발견해요';
        return `<table class="summary-table"><thead><tr><th>발견</th><th>직렬 숲길 ${s?'✓':''}</th><th>병렬 항구 ${p?'✓':''}</th></tr></thead><tbody><tr><td>전류</td><td>${s?'한 경로의 각 위치에서 같아요.<br>I = I₁ = I₂':pending}</td><td>${p?'가지로 나뉘고 다시 모여요.<br>I = I₁ + I₂':pending}</td></tr><tr><td>전압</td><td>${s?'닫힌 회로에서 각 저항의 전압을 더하면 전원 전압이에요.<br>V = V₁ + V₂':pending}</td><td>${p?'각 가지 양 끝 전압이 전원과 같아요.<br>V = V₁ = V₂':pending}</td></tr><tr><td>장치 추가</td><td>${s?'저항을 직렬로 추가하면 전체 저항은 커지고 전체 전류는 줄어요.':pending}</td><td>${p?'가지를 추가하면 전체 저항은 작아지고 전체 전류는 늘어요.':pending}</td></tr><tr><td>한 곳을 끊으면</td><td>${s?'회로 전체의 전류가 멈춰요.':pending}</td><td>${p?'끊지 않은 다른 가지는 계속 작동해요.':pending}</td></tr></tbody></table>`;
    }

    function drawMap(canvas, large = false) {
        const g = canvas.getContext('2d'),
            w = canvas.width,
            h = canvas.height,
            sx = w / 48,
            sy = h / 42,
            xx = x => (x + 24) * sx,
            zz = z => (z + 21) * sy;
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#8ac7cd';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#a4c989';
        g.beginPath();
        g.roundRect(xx(-21), zz(-18), 27 * sx, 36 * sy, 8);
        g.fill();
        g.beginPath();
        g.roundRect(xx(9), zz(-18), 13 * sx, 36 * sy, 8);
        g.fill();
        g.strokeStyle = '#e6d4a4';
        g.lineWidth = large ? 8 : 4;
        g.lineCap = 'round';
        for (const pts of [
                [
                    [-15, 14],
                    [-9, 8],
                    [-3, 5],
                    [3, 3],
                    [15, 3]
                ],
                [
                    [-3, 5],
                    [-5, 0],
                    [-10, -5]
                ],
                [
                    [-5, 0],
                    [0, -9],
                    [13, -9]
                ],
                [
                    [15, 3],
                    [16, -4],
                    [13, -9]
                ]
            ]) {
            g.beginPath();
            pts.forEach((p, i) => i ? g.lineTo(xx(p[0]), zz(p[1])) : g.moveTo(xx(p[0]), zz(p[1])));
            g.stroke();
        }
        for (const q of M.quests) {
            g.fillStyle = state.completed.includes(q.id) ? '#6d9c6b' : accessible(q.id) ? '#e1b875' : '#9ab393';
            g.beginPath();
            g.arc(xx(q.x), zz(q.z), large ? 8 : 4, 0, Math.PI * 2);
            g.fill();
            if (large) {
                g.font = 'bold 13px "Malgun Gothic"';
                g.textAlign = 'center';
                g.fillStyle = '#48654b';
                g.fillText(q.npc, xx(q.x), zz(q.z) - 13);
            }
        }
        const pos = world ? world.player.position : state.pos;
        g.fillStyle = '#fffaf0';
        g.beginPath();
        g.arc(xx(pos.x), zz(pos.z), large ? 7 : 4.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#468f85';
        g.beginPath();
        g.arc(xx(pos.x), zz(pos.z), large ? 4 : 2.5, 0, Math.PI * 2);
        g.fill();
    }

    function openMap() {
        const q = next();
        $('mapContent').innerHTML = `<header class="modal-head"><div class="eyebrow">한 걸음씩 넓어지는 나의 섬</div><h2 id="mapTitle">전기의 숲 지도</h2><button class="close" data-close aria-label="지도 닫기">×</button><p>주민을 고르면 그곳까지 길을 따라 걸어가요.</p></header><div class="map-body"><canvas id="largeMap" class="large-map" width="380" height="400" aria-label="전기의 숲의 다섯 지역과 현재 위치"></canvas><div class="map-list">${M.quests.map(q=>`<button data-action="navigate" data-id="${q.id}" ${accessible(q.id)?'':'disabled'} class="${accessible(q.id)?'':'locked'}">${q.animal} ${q.place}<small>${state.completed.includes(q.id)?'✓ 부탁 해결 · 다시 방문':accessible(q.id)?q.npc+'의 부탁을 들어요':'앞 지역의 부탁을 해결하면 열려요'}</small></button>`).join('')}<button data-action="camp">⛺ 내 캠프<small>탐험하며 받은 선물을 보러 가요</small></button></div></div>`;
        show('map');
        drawMap($('largeMap'), true);
    }

    function openSettings() {
        $('settingsContent').innerHTML = `<header class="modal-head"><h2 id="settingsTitle">탐험 설정</h2><button class="close" data-close aria-label="설정 닫기">×</button></header><div class="settings-body">${comfort.settingsHTML()}<label class="setting-row"><span>조작·성공 효과음<small>스위치, 버튼, 증거 수집과 부탁 해결 소리예요.</small></span><input type="checkbox" data-setting="effects" ${state.effects?'checked':''}></label><label class="setting-row"><span>움직임 줄이기<small>반복 움직임을 줄이고 대사는 한 번에 보여요.</small></span><input type="checkbox" data-setting="calm" ${state.calm?'checked':''}></label><label class="setting-row"><span>탐험 안내</span><select data-setting="mode"><option value="review" ${state.mode==='review'?'selected':''}>복습 · 1차시</option><option value="beginner" ${state.mode==='beginner'?'selected':''}>첫 탐험 · 2차시</option></select></label><label class="setting-row"><span>내 캠프 조명 색<small>해변 찻집의 선물을 받으면 보여요.</small></span><select data-setting="camp"><option value="mint" ${state.camp==='mint'?'selected':''}>바다 민트</option><option value="peach" ${state.camp==='peach'?'selected':''}>복숭아빛</option><option value="lemon" ${state.camp==='lemon'?'selected':''}>레몬빛</option></select></label><div class="notice">방향키·WASD로 걷기 / E로 대화 / J로 일지<br>길을 누르면 걸어가요. 화면 왼쪽 아래 조이스틱도 사용할 수 있어요.</div><details class="teacher-tools"><summary>🧑‍🏫 교사 도구</summary><div class="note class">시연은 학생 진행도와 증거에 저장되지 않아요. 서술형은 자동 채점하지 않아요. 증거의 적절성, 원리로 설명한 이유, 새 상황에 대한 판단을 함께 살펴봐 주세요.</div>${M.quests.map(q=>`<button data-action="demo" data-id="${q.id}">${q.id+1}. ${q.name}</button>`).join('')}<p class="muted">1차시 복습은 필수 부탁 5개와 해결 기록 3개를 완료해요. 첫 탐험은 공방까지 1차시, 숲길부터 2차시로 나눌 수 있어요.</p></details><div class="action-row"><button data-action="story-replay">초대장 이야기 다시 읽기</button><button data-action="export-json">진행 기록 보관</button><button class="danger" data-action="reset">새 탐험 시작</button></div></div>`;
        show('settings');
        comfort.updateAudioUI();
    }

    function showEnding() {
        $('endingContent').innerHTML = `<div class="eyebrow">다섯 개의 불빛, 한 권의 이야기</div><div class="ending-symbol">✦</div><h2 id="endingTitle">${disp(state.nickname)},<br>축제가 시작됐어!</h2><p>주민의 작은 부탁을 해결하며<br>네가 바꾼 회로와 발견한 이유가<br>한 권의 탐험일지가 되었어.</p><div class="stamps">${M.quests.map(q=>`<span class="stamp done">${q.animal}</span>`).join('')}</div><div class="end-actions"><button class="primary" data-action="export-html">제출용 탐험일지 저장</button><button data-action="print">인쇄 / PDF로 저장</button><button class="secondary" data-action="freeplay">내가 밝힌 섬 둘러보기 →</button></div><p class="muted">저장한 파일은 선생님이 정한 과제 제출처에 올려 주세요.</p>`;
        show('ending');
    }

    function festivalDone() {
        if (!festivalRunning) return;
        festivalRunning = false;
        IslandCelebrate.clear();
        document.body.classList.remove('festival-running');
        $('festivalScene').hidden = true;
        $('game').inert = false;
        updateHud();
        pause();
        showEnding();
    }

    function finish() {
        if (festivalRunning || !comfort.confirmJournal(true)) return;
        save();
        if (!M.ready(state)) {
            openJournal(4);
            toast('주민의 부탁과 세 가지 해결 기록을 먼저 완성해 주세요.');
            return;
        }
        state.festival = true;
        save();
        world?.applyProgress();
        updateHud();
        comfort.stopTalk(true);
        dlgIds.forEach(id => {
            if ($(id).open) $(id).close();
        });
        festivalRunning = true;
        pause();
        $('game').inert = true;
        document.body.classList.add('festival-running');
        $('festivalScene').hidden = false;
        $('festivalSkip').focus();
        if (!world?.playFestival) {
            festivalDone();
            return;
        }
        world.playFestival({
            calm: state.calm,
            onStage: info => {
                if (!festivalRunning) return;
                const line = info.stage === 'dim' ? '모두 준비됐나요? 잠시 불을 내려요.' : info.stage === 'relight' ? ['두리의 우체국에 첫 불빛이 들어와요!', '모아의 공방 창문이 환해져요!', '토리의 숲길을 따라 빛이 이어져요!', '소담의 찻집에도 불빛이 돌아왔어요!', '해온의 축제 광장까지, 모두 연결됐어요!'][info.region] : info.stage === 'finale' ? '우리가 밝힌 전기의 숲, 빛 축제 시작!' : '축제가 시작됐어요!';
                $('festivalMessage').textContent = line;
                if (info.stage === 'finale') {
                    IslandCelebrate.festival(document.body, state.calm);
                    beep();
                }
            },
            onComplete: festivalDone
        });
    }

    function skipFestival() {
        if (!festivalRunning) return;
        world?.cancelFestival({
            restore: true
        });
        festivalDone();
    }
    document.addEventListener('keydown', e => {
        if (festivalRunning && e.key === 'Escape') {
            e.preventDefault();
            skipFestival();
        }
    });

    function reportBody() {
        return `<section class="print-cover"><p>놀러오세요 전기의 숲 · 빛 축제를 부탁해</p><h1>${disp(state.nickname)}의<br>전기의 숲 탐험일지</h1><p>학급 ${esc(state.classCode)||'—'} · 번호 ${esc(state.number)||'—'}<br>${state.mode==='beginner'?'첫 탐험':'복습 탐험'} · 부탁 ${state.completed.length}/5 해결</p><p>문제 해결 → 실험 증거 → 과학적 이유 → 새로운 적용</p><p class="print-footer">${M.ready(state)?'완성한 탐험일지':'작성 중인 탐험일지'} · ${new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}<br>© 2026 조승재(과학이조선생) · 해누리중학교</p></section>${M.entries.map((e,i)=>{const records=e.quests.flatMap(q=>state.evidence[q]);return `<section class="print-page"><h2>${i+1}. ${esc(e.title)}</h2><p>${esc(e.story)}</p><div class="evidence"><b>내가 남긴 실험 증거</b>${records.length?records.map(r=>`<div>${esc(evidenceText(r))}</div>`).join(''):'<p>아직 기록하지 않았어요.</p>'}${records.length?circuitSvg(records[records.length-1].p):''}</div>${e.quests.filter(q=>state.predictions[q]).map(q=>`<p class="print-footer">처음 예상 · ${esc(state.predictions[q])}</p>`).join('')}${labels.map((l,j)=>`<article><h3>${esc(e.labels?.[j]||l)}</h3><p class="print-footer">${esc(e.questions[j])}</p><p>${disp(state.notes[i][j])||'아직 작성하지 않았어요.'}</p></article>`).join('')}</section>`;}).join('')}<section class="print-page"><h2>두 연결에서 발견한 것</h2>${summaryTable()}<p>전압이 일정한 전원과 저항값이 일정한 장치의 모형에서 비교했어요.</p>${state.evidence[0].length?`<h3>처음 켠 불빛</h3><div class="evidence">${state.evidence[0].map(e=>`<div>${esc(evidenceText(e))}</div>`).join('')}</div>`:''}<p class="print-footer">작성한 설명은 학생의 기록입니다. 자동 채점하거나 대신 작성하지 않았습니다.</p></section>`;
    }

    function download(name, data, mime) {
        const blob = new Blob([data], {
                type: mime
            }),
            url = URL.createObjectURL(blob),
            a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportHtml() {
        if (!comfort.confirmJournal(true)) return;
        save();
        const css = `body{max-width:820px;margin:40px auto;padding:24px;color:#304b41;font:16px/1.85 'Malgun Gothic',sans-serif;background:#fffdf4}h1,h2{color:#3d795c}h1{font-size:38px}h2{border-bottom:2px solid #b3c8a0;padding-bottom:12px}.print-cover{text-align:center;padding:45px 0}.print-page{margin:35px 0;padding:20px 0;border-top:1px solid #dfe4d0}.print-page p{white-space:pre-wrap}article{break-inside:avoid}.evidence{background:#f0f4e7;padding:20px;border-radius:16px;font-size:14px}.evidence svg{display:block;width:100%;height:auto;max-height:280px}.print-footer{font-size:13px;color:#819073}.summary-table{border-collapse:collapse;width:100%;font-size:14px}.summary-table th,.summary-table td{padding:12px;border:1px solid #dbe2ce;text-align:left}svg text{font-family:'Malgun Gothic',sans-serif}.pulse-flow{animation:none}@media print{@page{size:A4;margin:17mm}body{margin:0;padding:0;background:white;font-size:11pt}.print-cover,.print-page{break-after:page}.print-page{border:0;margin:0}.print-page:last-child{break-after:auto}.evidence{break-inside:avoid}}`;
        download('전기의숲_탐험일지.html', `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>놀러오세요 전기의 숲 · 탐험일지</title><style>${css}</style><body>${reportBody()}</body></html>`, 'text/html;charset=utf-8');
        toast('제출용 파일을 저장했어요. 선생님이 정한 제출처에 올려 주세요.');
    }

    function sealEntry() {
        if (journalTab < 0 || journalTab > 2 || !comfort.confirmJournal()) return;
        const i = journalTab;
        if (!M.entryWritten(state, i)) {
            toast('해결책·과학적 이유·다음 적용, 세 칸을 내 말로 남겨 주세요.');
            const j = state.notes[i].findIndex(t => !t.trim());
            $('note-' + i + '-' + j).focus();
            return;
        }
        if (!M.entries[i].quests.every(q => state.completed.includes(q))) {
            toast('관련 주민의 부탁을 해결하고 실험 증거를 모아 주세요.');
            return;
        }
        state.sealedEntries[i] = true;
        save();
        updateHud();
        IslandCelebrate.burst($('journal'), state.calm, '나의 기록 완성!');
        renderJournal(i);
        toast('내 해결 이야기에 서명했어요. 다음 여정을 이어 갈 수 있어요.');
    }

    function pendingEntry() {
        return M.pendingEntry(state);
    }
    let storyPage = 0,
        storyReplay = false;
    const storyPages = [{
            image: 'cover-island',
            tag: '전기의 숲에서 온 초대장',
            title: '오늘 밤, 빛 축제가 열려요',
            text: '두리, 모아, 토리, 소담, 해온은 축제를 준비하고 있어요. 초록 섬에 도착한 당신에게 작은 부탁들이 기다립니다.'
        },
        {
            image: 'cover-island',
            tag: '그런데… 불빛이 사라졌어요',
            title: '주민의 부탁을 해결해 줄래요?',
            text: '우체국 등이 꺼지고, 숲길 등이 함께 꺼졌어요. 카페에서는 테라스만 끄고 싶대요. 회로를 바꾸며 이유를 찾아 주세요.'
        },
        {
            image: 'story-journal',
            tag: '나의 발견을 남기는 방법',
            title: '예상하고, 바꾸고, 직접 기록해요',
            text: 'Step을 따라 실험한 뒤 ‘증거 남기기’에서 계기 값을 직접 적어요. 막히면 힌트를 눌러 보세요. 다음에 누를 버튼이 빛나요.'
        },
        {
            image: 'story-journal',
            tag: '주민에게 남길 세 가지 필수 기록',
            title: '탐험의 끝에는 한 권의 일지가',
            text: '공방의 작업 메모 → 두 주민에게 편지 → 다음 탐험가에게. 어떻게 해결했는지, 왜 통했는지, 다음 문제에는 어떻게 쓸지 적고 서명해요. 세 기록을 완성하면 축제가 열립니다.'
        }
    ];

    function startStory(replay = false) {
        storyPage = 0;
        storyReplay = replay;
        renderStory();
        show('story');
    }

    function renderStory() {
        const p = storyPages[storyPage];
        $('storyContent').innerHTML = `<img class="story-art" src="art/${p.image}.png" alt="${storyPage<2?'빛 축제를 준비하는 초록 섬과 주민들':'탐험가와 주민들이 함께 살펴보는 탐험일지'}"><section class="story-caption"><div class="eyebrow">${p.tag} · ${storyPage+1}/4</div><h2 id="storyTitle">${p.title}</h2><p>${p.text}</p><div class="story-dots" aria-label="이야기 ${storyPage+1}장">${storyPages.map((_,i)=>`<i class="${i===storyPage?'active':''}"></i>`).join('')}</div><div class="action-row"><button data-action="story-back" ${storyPage===0?'disabled':''}>← 이전</button><button class="primary" data-action="story-next">${storyPage===3?(storyReplay?'이야기 닫기':'나의 탐험 준비하기 →'):'다음 이야기 →'}</button></div></section>`;
    }

    function nextStory() {
        if (storyPage < 3) {
            storyPage++;
            renderStory();
            return;
        }
        if (storyReplay) {
            close('story');
            return;
        }
        state.introSeen = true;
        save();
        $('coverPanel').hidden = true;
        $('startForm').hidden = false;
        $('welcome').classList.add('prepare');
        show('welcome');
    }

    function navigate(id) {
        comfort.stopTalk(true);
        if (!accessible(id)) {
            const p = pendingEntry();
            if (p >= 0) {
                openJournal(p);
                toast('주민에게 남길 필수 기록을 먼저 완성해 주세요.');
            } else toast('앞 지역의 부탁을 먼저 해결해 주세요.');
            return;
        }
        dlgIds.forEach(d => $(d).open && $(d).close());
        pause();
        world?.go(M.quests[id]);
        toast(`${M.quests[id].npc}에게 가는 길이에요.`);
    }
    document.addEventListener('click', e => {
        if (e.target.closest('button') && !e.target.closest('[data-action="switch"]')) sound('click');
        const closeButton = e.target.closest('[data-close]');
        if (closeButton) {
            const d = closeButton.closest('dialog');
            if (d.id === 'journal' && !comfort.confirmJournal()) return;
            if (d.id === 'dialogue') comfort.stopTalk(true);
            d.close();
            updateHud();
            return;
        }
        const b = e.target.closest('[data-action]');
        if (!b) return;
        const a = b.dataset.action,
            id = Number(b.dataset.id);
        switch (a) {
            case 'probe':
                sim.probe = b.dataset.probe;
                refreshDiagram();
                document.querySelector('[data-action="probe"][data-probe="' + sim.probe + '"]')?.focus({
                    preventScroll: true
                });
                break;
            case 'concept-answer': {
                const c = sim.concept,
                    q = c.data.questions[c.index];
                if (Number(b.dataset.value) === q.correct) {
                    c.correct = true;
                    sound('place');
                    renderConcept();
                } else $('conceptFeedback').textContent = '다시 생각해 봐요. ' + q.explanation;
                break;
            }
            case 'concept-next':
                if (!sim.concept.correct) break;
                if (++sim.concept.index >= sim.concept.data.questions.length) sim.concept.passed = true;
                else sim.concept.correct = false;
                renderConcept();
                break;
            case 'concept-finish':
                if (!sim.concept?.passed) break;
                close('concept');
                completeQuest(true);
                break;
            case 'inventory':
                $('inventoryContent').innerHTML = IslandPlay.inventory(state);
                show('inventory');
                break;
            case 'lab-view':
                sim.view = b.dataset.view;
                refreshDiagram();
                document.querySelectorAll('[data-action="lab-view"]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.view === sim.view)));
                break;
            case 'pick-part':
                if (sim.record) break;
                sim.selectedPart = b.dataset.part;
                refreshDiagram();
                document.querySelectorAll('.part-card').forEach(el => el.classList.toggle('selected', el === b));
                labMessage('그림의 노란 자리를 누르면 연결돼요. 끌어다 놓아도 돼요.');
                break;
            case 'place-part':
                placePart(b.dataset.place);
                break;
            case 'festival-skip':
                skipFestival();
                break;
            case 'next-hint':
                nextHint();
                break;
            case 'record-cancel':
                sim.record = null;
                renderLab();
                break;
            case 'seal-entry':
                sealEntry();
                break;
            case 'story-begin':
                startStory(false);
                break;
            case 'story-replay':
                startStory(true);
                break;
            case 'story-next':
                nextStory();
                break;
            case 'story-back':
                storyPage = Math.max(0, storyPage - 1);
                renderStory();
                break;
            case 'music-default':
                comfort.cancelMusicPosition();
                comfort.audio.useDefault();
                break;
            case 'music-jump':
                comfort.commitMusicPosition(comfort.audio.info().currentTime + Number(b.dataset.jump));
                break;
            case 'journal':
                openJournal(b.dataset.tab ?? -1);
                break;
            case 'evidence-peek': {
                peekOpen = !peekOpen;
                const panel = $('evidencePeek');
                if (panel) {
                    panel.hidden = !peekOpen;
                    if (peekOpen) panel.scrollIntoView({
                        block: 'start',
                        behavior: state.calm ? 'auto' : 'smooth'
                    });
                }
                document.querySelectorAll('.peek-btn').forEach(el => el.setAttribute('aria-pressed', String(peekOpen)));
                break;
            }
            case 'journal-tab':
                if (comfort.confirmJournal()) {
                    renderJournal(Number(b.dataset.tab));
                    updateHud();
                }
                break;
            case 'map':
                openMap();
                break;
            case 'settings':
                openSettings();
                break;
            case 'navigate':
                navigate(id);
                break;
            case 'lab':
                beginLab(id);
                break;
            case 'demo':
                beginLab(id, true);
                break;
            case 'predict':
                state.predictions[sim.id] = predictions[sim.id][1][Number(b.dataset.value)];
                if (!demo) save();
                renderLab();
                break;
            case 'switch':
                if (sim.record) break;
                sim[b.dataset.key] = !sim[b.dataset.key];
                sound(sim[b.dataset.key] ? 'switch-close' : 'switch-open');
                renderLab();
                break;
            case 'electrons':
                sim.electrons = !sim.electrons;
                renderLab();
                break;
            case 'value':
                sim[b.dataset.key] = Number(b.dataset.value);
                renderLab();
                break;
            case 'next-phase':
                sim.phase++;
                sim.v = 6;
                sim.r1 = 10;
                renderLab();
                break;
            case 'count':
                sim.count = sim.count === 1 ? 2 : 1;
                sim.on1 = true;
                sim.r2 = 10;
                if (sim.count === 1 && sim.probe === 'r2') sim.probe = 'source';
                renderLab();
                break;
            case 'r2':
                sim.r2 = sim.r2 === 10 ? 20 : 10;
                renderLab();
                break;
            case 'connection':
                sim.type = b.dataset.value;
                renderLab();
                break;
            case 'capture':
                capture();
                break;
            case 'complete':
                completeQuest();
                break;
            case 'finish':
                finish();
                break;
            case 'print':
                if (!comfort.confirmJournal(true)) break;
                save();
                $('printSheet').innerHTML = reportBody();
                requestAnimationFrame(() => window.print());
                break;
            case 'export-html':
                exportHtml();
                break;
            case 'export-json':
                if (!comfort.confirmJournal(true)) break;
                save();
                download('전기의숲_이어서쓰기.json', JSON.stringify(state, null, 2), 'application/json');
                toast('진행 기록을 보관했어요.');
                break;
            case 'check-writing':
                if (comfort.confirmJournal()) {
                    updateHud();
                    toast('기록을 확인했어요. 내 해결 방법과 이유가 담겼는지도 읽어 보세요.');
                }
                break;
            case 'speech-skip':
                comfort.stopTalk(true);
                break;
            case 'voice-toggle':
                comfort.toggleVoice();
                break;
            case 'music-choose':
                $('musicFile').click();
                break;
            case 'music-play':
                if (comfort.audio.info().playing) comfort.audio.pauseMusic();
                else comfort.audio.playMusic();
                break;
            case 'import':
                $('importFile').click();
                break;
            case 'freeplay':
                close('ending');
                toast('섬의 불빛을 따라 산책해 보세요.');
                break;
            case 'camp':
                comfort.stopTalk(true);
                dlgIds.forEach(d => $(d).open && $(d).close());
                pause();
                if (world) world.path = world.findPath(-1, 10);
                toast('내 캠프로 가요. 받은 선물이 기다리고 있어요.');
                break;
            case 'reset':
                if (window.confirm('새 탐험을 시작하면 이 기기의 현재 기록이 바뀝니다. 먼저 ‘진행 기록 보관’으로 저장했나요?')) {
                    const fresh = M.fresh();
                    if (M.save(fresh)) {
                        suspendSave = true;
                        location.reload();
                    } else toast("기기 저장이 막혀 새 탐험을 시작하지 못했어요.");
                }
                break;
        }
    });
    document.addEventListener('input', e => {
        const el = e.target;
        if (el.id === 'musicSeek') {
            comfort.previewMusicPosition(Number(el.value));
            return;
        }
        if (el.dataset.volume) {
            state[el.dataset.volume] = Number(el.value);
            el.parentElement.querySelector('output').textContent = Math.round(Number(el.value) * 100) + '%';
            comfort.audio.update(state);
            deferSave();
        }
        if (el.dataset.note) {
            const [i, j] = el.dataset.note.split(',').map(Number);
            if (state.notes[i][j] !== el.value) state.sealedEntries[i] = false;
            state.notes[i][j] = el.value;
            deferSave();
            $('noteBadge').textContent = [0, 1, 2].filter(i => M.entryDone(state, i)).length;
        }
        if (el.dataset.identity) {
            state[el.dataset.identity] = el.value;
            deferSave();
        }
        if (el.dataset.sim && sim) {
            sim[el.dataset.sim] = Number(el.value);
            el.parentElement.querySelector('output').textContent = el.value + (el.dataset.sim === 'v' ? ' V' : ' Ω');
            $('diagram').innerHTML = circuitSvg(simData(), {
                probe: sim.probe
            });
            $('readings').innerHTML = readingHtml(M.circuit(simData()));
            $('meterExplanation').textContent = meterExplanation();
        }
    });
    document.addEventListener('change', e => {
        const el = e.target;
        if (el.id === 'musicSeek') {
            comfort.commitMusicPosition(Number(el.value));
            return;
        }
        if (el.id === 'probeSelect') {
            sim.probe = el.value;
            refreshDiagram();
        }
        if (el.dataset.setting) {
            state[el.dataset.setting] = el.type === 'checkbox' ? el.checked : el.value;
            save();
            updateHud();
            world?.applyProgress();
            comfort.audio.update(state);
            comfort.updateAudioUI();
            if (state.calm) comfort.stopTalk(true);
        }
        if (el.dataset.sim) renderLab();
    });
    document.addEventListener('submit', e => {
        if (e.target.id === 'recordForm') {
            e.preventDefault();
            commitRecord(e.target);
        }
    });
    document.addEventListener('input', e => {
        const k = e.target.dataset.labRange;
        if (!k || !sim || sim.record) return;
        sim[k] = Number(e.target.value);
        if (k === 'r2') {
            const out = $('r2Output');
            if (out) out.textContent = sim.r2 + ' Ω';
            refreshDiagram();
            return;
        }
        if (k !== 'v') sim.r1 = 10 * sim.length / sim.area;
        $('voltageOutput').textContent = sim.v + ' V';
        $('lengthOutput').textContent = sim.length + '배';
        $('areaOutput').textContent = sim.area + '배';
        $('wireResistance').textContent = '같은 재질 · 저항 ' + sim.r1 + ' Ω';
        $('wireSample').style.width = sim.length * 22 + '%';
        $('wireSample').style.height = sim.area * 5 + 'px';
        refreshDiagram();
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.circuit-switch,.svg-slot')) {
            e.preventDefault();
            e.target.dispatchEvent(new MouseEvent('click', {
                bubbles: true
            }));
        }
    });
    let partDrag = null,
        suppressPartClick = null,
        dragGhost = null;

    function ghostMove(x, y, card) {
        if (!dragGhost) {
            dragGhost = document.createElement('div');
            dragGhost.className = 'drag-ghost';
            dragGhost.textContent = (card.childNodes[0]?.textContent || card.textContent).trim();
            $('lab').append(dragGhost);
        }
        dragGhost.style.left = x + 'px';
        dragGhost.style.top = y + 'px';
    }

    function ghostEnd() {
        dragGhost?.remove();
        dragGhost = null;
    }
    document.addEventListener('pointerdown', e => {
        const card = e.target.closest('[data-part]');
        if (!card || !sim || sim.record) return;
        sim.selectedPart = card.dataset.part;
        refreshDiagram();
        partDrag = {
            id: e.pointerId,
            part: card.dataset.part,
            x: e.clientX,
            y: e.clientY,
            moved: false,
            card
        };
        card.setPointerCapture(e.pointerId);
    });
    document.addEventListener('pointermove', e => {
        if (!partDrag || partDrag.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - partDrag.x, e.clientY - partDrag.y) > 8) {
            partDrag.moved = true;
            partDrag.card.classList.add('dragging');
            ghostMove(e.clientX, e.clientY, partDrag.card);
            document.querySelectorAll('.placement-zone').forEach(el => el.classList.toggle('hover', el === document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-place]')));
        }
    });
    document.addEventListener('pointerup', e => {
        if (!partDrag || partDrag.id !== e.pointerId) return;
        const d = partDrag;
        partDrag = null;
        ghostEnd();
        d.card.classList.remove('dragging');
        document.querySelectorAll('.placement-zone').forEach(el => el.classList.remove('hover'));
        if (d.moved) {
            suppressPartClick = {
                card: d.card,
                until: performance.now() + 400
            };
            sim.selectedPart = d.part;
            const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-place]');
            if (zone) placePart(zone.dataset.place);
            else labMessage('노란 자리 위에서 손을 떼야 연결돼요. 카드를 누른 뒤 노란 자리를 눌러도 돼요.');
        }
    });
    document.addEventListener('click', e => {
        if (suppressPartClick && performance.now() < suppressPartClick.until && suppressPartClick.card.contains(e.target)) {
            suppressPartClick = null;
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
    document.addEventListener('pointercancel', () => {
        partDrag?.card.classList.remove('dragging');
        partDrag = null;
        ghostEnd();
        document.querySelectorAll('.placement-zone').forEach(el => el.classList.remove('hover'));
    });
    $('story').addEventListener('cancel', e => {
        if (!storyReplay) e.preventDefault();
    });
    $('startForm').addEventListener('submit', e => {
        e.preventDefault();
        const input = $('nickname');
        if (comfort.composing.has(input)) return;
        state.nickname = comfort.confirmValue(input.value, '탐험가 이름', 'nickname', input).trim() || '새싹';
        comfort.audio.unlock();
        if ($('startMusic').checked) comfort.audio.playMusic();
        state.mode = new FormData(e.target).get('mode');
        state.started = true;
        if (matchMedia('(prefers-reduced-motion:reduce)').matches) state.calm = true;
        save();
        close('welcome');
        updateHud();
        toast('반가워요! 길을 누르거나 방향키로 걸어 보세요.');
    });
    document.addEventListener('focusout', e => {
        if (e.target.id === 'musicSeek') comfort.cancelMusicPosition();
    });
    document.addEventListener('pointercancel', e => {
        if (e.target.id === 'musicSeek') comfort.cancelMusicPosition();
    });
    $('musicFile').addEventListener('change', e => {
        comfort.cancelMusicPosition();
        comfort.audio.loadFile(e.target.files[0]);
        e.target.value = '';
    });
    $('interact').addEventListener('click', () => {
        if (world?.nearest != null) interact(world.nearest);
    });
    $('importFile').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            if (file.size > 2_000_000) throw new Error('파일이 너무 커요. 전기의 숲에서 저장한 JSON 파일을 선택해 주세요.');
            const imported = M.sanitize(JSON.parse(await file.text()));
            if (!window.confirm('가져온 기록으로 이 기기의 탐험을 바꿀까요? 현재 기록이 필요하면 먼저 파일로 보관해 주세요.')) return;
            if (!M.save(imported)) {
                toast("기기 저장이 막혀 가져오지 못했어요. 현재 탐험은 유지됩니다.");
                return;
            }
            suspendSave = true;
            location.reload();
        } catch (err) {
            toast(err.message || '기록을 읽을 수 없어요.');
        } finally {
            e.target.value = '';
        }
    });
    let joystickActive = false;
    const joystick = $('joystick'),
        knob = joystick.firstElementChild;

    function moveJoy(e) {
        const r = joystick.getBoundingClientRect(),
            x = (e.clientX - r.left - r.width / 2) / (r.width * .34),
            z = (e.clientY - r.top - r.height / 2) / (r.height * .34),
            len = Math.max(1, Math.hypot(x, z));
        if (world) world.joy = {
            x: x / len,
            z: z / len
        };
        knob.style.transform = `translate(${x/len*24}px,${z/len*24}px)`;
    }
    joystick.addEventListener('pointerdown', e => {
        if (world?.paused) return;
        joystickActive = true;
        joystick.setPointerCapture(e.pointerId);
        moveJoy(e);
    });
    joystick.addEventListener('pointermove', e => {
        if (joystickActive) moveJoy(e);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(ev, () => {
        joystickActive = false;
        if (world) world.joy = {
            x: 0,
            z: 0
        };
        knob.style.transform = '';
    });
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    setInterval(() => {
        if (state.started && !document.hidden) save();
    }, 12000);
    comfort = new IslandComfort({
        state: () => state,
        save,
        toast
    });
    $('npcLabels').innerHTML = M.quests.map(q => `<button id="npc-${q.id}" class="npc-label" data-action="navigate" data-id="${q.id}" title="${q.npc}에게 가기">${q.npc}</button>`).join('');
    try {
        world = new IslandWorld($('world'), {
            interact,
            journal: () => openJournal(),
            toast,
            near: id => {
                $('interact').hidden = id == null || !state.started;
                if (id != null) $('interact').innerHTML = `<kbd>E</kbd><span>${M.quests[id].npc}에게 말 걸기</span>`;
            },
            update: (pos, positions) => {
                positions.forEach(p => {
                    const el = $('npc-' + p.id);
                    el.style.left = p.x + 'px';
                    el.style.top = p.y + 'px';
                    el.hidden = !state.started || p.x < 15 || p.x > innerWidth - 15 || p.y < 90 || p.y > innerHeight - 40 || !p.visible;
                });
                drawMap($('miniMap'));
            }
        }, state);
    } catch (err) {
        $('worldError').hidden = false;
        console.error('3D 섬 초기화 실패:', err);
    }
    updateHud();
    drawMap($('miniMap'));
    if (!state.started) show('welcome');
    else pause();
})();