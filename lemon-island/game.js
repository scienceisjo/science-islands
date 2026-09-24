(function() {
    'use strict';
    /* 레몬 백작의 부탁 — 게임 진행.
       「놀러오세요 전기의 숲」의 진행 틀(대화·공방·기록·발견 확인·일지·축제)을 이 섬의 이야기에 맞춰 다시 짠 것.
       공용 엔진: IslandWorld(3D) · IslandComfort/IslandAudio(편의·소리) · __ime(한글) · IslandCelebrate(축하) */
    const M = IslandModel,
        L = IslandLabs,
        CC = IslandConcept,
        $ = id => document.getElementById(id),
        esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        } [c]));
    const disp = x => esc(__ime.disp(x));
    const QN = M.quests.length,
        EN = M.entries.length;
    const LAYOUT = IslandWorld.prototype.islandLayout;
    let comfort, festivalRunning = false,
        suspendSave = false;
    let state = M.load(),
        world, sim = null,
        journalTab = -1,
        toastTimer, saveTimer, demo = false,
        talkState = null;
    const dlgIds = ['welcome', 'dialogue', 'lab', 'journal', 'map', 'settings', 'ending', 'story', 'inventory', 'concept', 'credit'];
    /* 원안 안내 — 겨울쌤의 「레몬 백작의 부탁」 수업. 기기마다 처음 들어올 때 한 번 뜨고, 표지·아래 글·설정에서 늘 볼 수 있다. */
    const CREDIT_URL = 'https://m.blog.naver.com/tady52/222403408526',
        CREDIT_KEY = 'lemon-island-credit-seen-v1';
    let creditThen = null;
    const labels = ['내가 알아낸 것', '증거와 과학적 이유', '새로운 상황에 적용하기'];

    /* ── 기본 도구 ─────────────────────────────────── */
    function toast(t) {
        $('toast').textContent = t;
        $('toast').classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3400);
    }

    function save() {
        if (suspendSave) return;
        if (world) state.pos = {
            x: world.player.position.x,
            z: world.player.position.z
        };
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
        if (!world) return;
        world.paused = festivalRunning || dlgIds.some(id => $(id).open) || !state.started;
        world.keys.clear();
        world.joy = {
            x: 0,
            z: 0
        };
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
        if (state.started && (id === 'lab' || id === 'dialogue' || id === 'concept' || id === 'journal')) updateHud();
    }));
    $('journal').addEventListener('cancel', e => {
        if (!comfort.confirmJournal()) e.preventDefault();
    });

    /* ── 진행 ──────────────────────────────────────── */
    const next = () => M.quests.find(q => !state.completed.includes(q.id));
    const pendingEntry = () => M.pendingEntry(state);
    const sealedCount = () => M.entries.filter((_, i) => M.entryDone(state, i)).length;

    function accessible(id) {
        const p = pendingEntry();
        if (p >= 0 && id > Math.max(...M.entries[p].quests)) return false;
        return id === 0 || state.completed.includes(id - 1) || state.completed.includes(id);
    }

    /* ── Dr.에시드의 흩어진 도구 ─────────────────────── */
    const josa = (w, a, b) => {
        const c = String(w).charCodeAt(String(w).length - 1);
        return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b);
    };
    const tagsOf = qid => state.evidence[qid].filter(e => e.manual).map(e => e.tag);
    const toolById = id => M.tools.find(t => t.id === id) || null;
    const hasTools = qid => M.tools.some(t => t.quest === qid);
    /* 부탁 qid 의 지금 단계에 필요한데 아직 건네지 않은 도구(없으면 null). 첫 도구는 부탁을 들은 뒤부터 */
    function toolFor(qid) {
        if (!hasTools(qid) || state.completed.includes(qid)) return null;
        const step = L[qid].checks(tagsOf(qid)).findIndex(ok => !ok),
            t = M.tools.find(x => x.quest === qid && x.step === step);
        if (!t || state.fetch.given.includes(t.id)) return null;
        if (t.step === 0 && !state.fetch.heard.includes(qid)) return null;
        return t;
    }
    const holding = t => !!t && state.fetch.got.includes(t.id) && !state.fetch.given.includes(t.id);
    /* 지금 찾아야 할 도구: 다음 부탁이 열려 있고, 그 부탁을 들었고, 아직 줍지 않은 것 하나(고리·표시·이름표·지도 별) */
    function worldTool() {
        const q = next();
        if (!q || !state.started || !accessible(q.id) || pendingEntry() >= 0 || !state.fetch.heard.includes(q.id)) return null;
        const t = toolFor(q.id);
        return t && !holding(t) ? t : null;
    }
    /* 섬에 흩어져 보이는 도구: 에시드의 이야기를 들은 뒤, 아직 줍지도 건네지도 않은 것 모두 */
    const scatteredTools = () => state.started && state.fetch.heard.length ? M.tools.filter(t => !state.fetch.got.includes(t.id) && !state.fetch.given.includes(t.id) && !state.completed.includes(t.quest)).map(t => t.id) : [];
    function syncTools() {
        world?.setTools?.(scatteredTools(), worldTool()?.id || null);
    }
    let fetchAuto = null;

    function pickTool(id) {
        const t = toolById(id);
        if (!t || state.fetch.got.includes(id)) return;
        state.fetch.got.push(id);
        save();
        sound('success');
        const npc = M.cast[M.quests[t.quest].npc].name,
            q = next(),
            needed = q && toolFor(q.id)?.id === id;
        toast(needed ? `${t.icon} ${josa(t.name, '을', '를')} 주웠어요! ${npc}에게 건네요.` : `${t.icon} ${josa(t.name, '을', '를')} 주웠어요! 나중에 ${npc}가 찾을 때 건네요.`);
        updateHud();
        if (needed && fetchAuto === id) {
            fetchAuto = null;
            setTimeout(() => {
                if (!dlgIds.some(d => $(d).open)) navigate(t.quest);
            }, 500);
        }
    }

    function giveTool(id) {
        const t = toolById(id);
        if (!t || !holding(t)) return;
        state.fetch.given.push(id);
        save();
        beep();
        updateHud();
        const npc = M.quests[t.quest].npc;
        if (sim && !demo && sim.id === t.quest && $('lab').open) {
            sim.quip = [npc, t.thanks, 'give'];
            renderLab();
            return;
        }
        beginLab(t.quest);
        if (sim && sim.id === t.quest && $('lab').open) {
            sim.quip = [npc, t.thanks, 'give'];
            renderLab();
        }
    }

    function fetchGo(id) {
        const t = toolById(id);
        if (!t) return;
        comfort.stopTalk(true);
        dlgIds.forEach(d => $(d).open && $(d).close());
        pause();
        updateHud();
        if (holding(t)) {
            navigate(t.quest);
            return;
        }
        if (!state.fetch.heard.includes(t.quest)) {
            state.fetch.heard.push(t.quest);
            save();
            updateHud();
        }
        fetchAuto = t.id;
        if (world?.goTool(t.id)) toast(`${t.icon} ${josa(t.name, '을', '를')} 찾으러 가요. 하늘빛으로 빛나는 상자 위로 걸어가면 저절로 주워요.`);
        else toast(`${t.where}에서 하늘빛으로 빛나는 ${josa(t.name, '을', '를')} 찾아보세요.`);
    }

    function castQuest(cid) {
        const mine = M.quests.filter(q => q.npc === cid);
        return mine.find(q => !state.completed.includes(q.id)) || mine[mine.length - 1] || null;
    }

    function updateHud() {
        const q = next(),
            done = state.completed.length,
            pending = pendingEntry(),
            hud = $('questHud');
        hud.hidden = !state.started;
        hud.innerHTML = `<div class="eyebrow">${state.festival?'두 왕국의 비눗방울 축제':state.mode==='beginner'?'함께 알아가는 첫 탐험':'레몬 백작의 부탁'}</div><h2>${q?esc(q.name):state.festival?'축제가 열렸어요!':'마지막 안내문을 남겨요'}</h2><p>${q?esc(M.cast[q.npc].name+'에게 가서 이야기를 들어요.'):state.festival?'주민을 만나고 비눗방울 축제를 둘러보세요.':'기록을 완성하고 축제를 열어요.'}</p><button data-action="${q?'navigate':'journal'}" ${q?'data-id="'+q.id+'"':''}>${q?'⌖ '+esc(q.place)+' 길 안내':'▤ 탐험일지 펼치기'}</button><div class="progress"><span style="width:${done/QN*100}%"></span></div><div class="small-row"><span>${done} / ${QN} 부탁 해결</span><span>${state.nickname?disp(state.nickname)+'의 여정':''}</span></div>`;
        const need = q && pending < 0 && accessible(q.id) && state.fetch.heard.includes(q.id) ? toolFor(q.id) : null;
        if (need) {
            const npc = M.cast[q.npc].name;
            hud.querySelector('p').textContent = holding(need) ? `${need.icon} ${josa(need.name, '을', '를')} 찾았어요! ${npc}에게 건네요.` : `조수의 일 · ${need.icon} ${josa(need.name, '을', '를')} 찾아 ${npc}에게 건네요. (${need.where})`;
            const button = hud.querySelector('button');
            button.dataset.action = holding(need) ? 'navigate' : 'fetch-go';
            button.dataset.tool = need.id;
            button.dataset.id = q.id;
            button.textContent = holding(need) ? `⌖ ${npc}에게 건네러 가기` : `⌖ ${need.icon} ${need.name} 찾기`;
        }
        syncTools();
        if (pending >= 0) hud.innerHTML = `<div class="eyebrow">다음 여정 전에 · 필수 기록</div><h2>${esc(M.entries[pending].title)}</h2><p>알아낸 것·증거와 이유·새로운 적용을 적고 서명해요.</p><button data-action="journal" data-tab="${pending}">✎ 기록 완성하기</button><div class="small-row">부탁 ${done}/${QN} · 필수 기록 ${sealedCount()}/${EN}</div>`;
        if (!q && !state.festival && M.ready(state)) {
            hud.querySelector('h2').textContent = '비눗방울 축제를 열 준비 완료!';
            hud.querySelector('p').textContent = '세 기록을 모두 완성했어요. 축제를 열고 제출할 파일을 준비해요.';
            const button = hud.querySelector('button');
            button.textContent = '✦ 축제와 제출 준비';
            button.dataset.action = 'journal';
            button.dataset.tab = '4';
        }
        $('noteBadge').textContent = sealedCount();
        $('dayLabel').textContent = state.festival ? '비눗방울이 반짝이는 밤' : '기운을 되찾는 저녁';
        for (const c of M.cast) {
            const l = $('npc-' + c.id);
            if (!l) continue;
            if (c.id === 4) {
                const healed = state.completed.includes(5);
                l.classList.toggle('done', healed);
                l.innerHTML = `${esc(c.short)} <span>${healed?'♥':'·'}</span>`;
                continue;
            }
            const mine = M.quests.filter(x => x.npc === c.id),
                open = mine.find(x => !state.completed.includes(x.id));
            l.classList.toggle('done', !open);
            l.classList.toggle('locked', !!open && !accessible(open.id));
            const tw = open && accessible(open.id) && pending < 0 && state.fetch.heard.includes(open.id) ? toolFor(open.id) : null;
            l.innerHTML = `${esc(c.short)} <span>${!open?'✓':tw?(holding(tw)?'🧪':'🔎'):accessible(open.id)?'!':'·'}</span>`;
        }
        document.body.classList.toggle('calm', state.calm);
    }

    /* ── 대화: 여러 줄을 한 줄씩, 마지막 줄에 할 일 단추 ── */
    function talk(lines, buttons = '', notice = '') {
        talkState = {
            lines,
            index: 0,
            buttons,
            notice
        };
        renderTalk();
        show('dialogue');
        renderTalk(true);
    }

    function renderTalk(start = false) {
        const t = talkState;
        if (!t) return;
        const [who, text] = t.lines[t.index],
            c = M.cast[who],
            last = t.index === t.lines.length - 1;
        $('dialogueContent').innerHTML = `<div class="dialogue-name" id="npcName"><span>${c.icon}</span>${esc(c.name)}<small class="dialogue-role">${esc(c.role)}</small></div><p class="dialogue-text">${esc(text)}</p>${last&&t.notice?`<div class="notice">${t.notice}</div>`:''}<div class="dialogue-footer"><small>${t.lines.length>1?(t.index+1)+' / '+t.lines.length:esc(c.role)}</small>${last?(t.buttons||'<button class="primary" data-action="talk-close">알겠어요</button>'):'<button class="primary" data-action="talk-next">다음 ▸</button>'}</div>`;
        if (start || $('dialogue').open) {
            comfort.startTalk(c.voice);
            $('dialogueContent').querySelector('.dialogue-footer .primary')?.focus({
                preventScroll: true
            });
        }
    }

    function interact(cid) {
        if (!state.started) return;
        if (!state.visited.includes(cid)) {
            state.visited.push(cid);
            save();
        }
        if (cid === 4) {
            const healed = state.completed.includes(5);
            talk([
                [4, healed ? '이제 뛰어놀 수 있어요! 비눗방울은 장갑 끼고 구경할 거예요. 과학자님, 고마워요!' : state.completed.includes(0) ? '백작님이 그러셨어요. 손님이 연구자님들을 도와 꼭 방법을 찾아 주실 거라고요… 전 괜찮아요. 조금 졸릴 뿐이에요.' : '안녕하세요… 저는 새콤이에요. 요즘 자꾸 힘이 없어요.']
            ]);
            return;
        }
        const q = castQuest(cid);
        if (!q) return;
        if (!state.completed.includes(q.id) && !accessible(q.id)) {
            const p = pendingEntry();
            if (p >= 0) talk([
                [cid, `먼저 「${M.entries[p].title}」을(를) 완성해 줄래? 네가 알아낸 것을 정리하는 게 먼저야.`]
            ], `<button class="primary" data-action="journal" data-tab="${p}">✎ 기록하러 가기</button>`);
            else {
                const prev = M.quests[q.id - 1];
                talk([
                    [cid, `반가워! 먼저 ${M.cast[prev.npc].name}의 부탁을 도와줄래? 그곳에서 알아낸 것이 여기에서도 도움이 될 거야.`]
                ], `<button class="primary" data-action="navigate" data-id="${prev.id}">그곳으로 가기</button>`);
            }
            return;
        }
        if (state.completed.includes(q.id)) {
            const mine = M.quests.filter(x => x.npc === cid && state.completed.includes(x.id));
            talk([
                [cid, q.again]
            ], mine.map(x => `<button class="${x===q?'primary':''}" data-action="lab" data-id="${x.id}">다시 살펴보기 · ${esc(x.name)}</button>`).join(''));
            return;
        }
        if (hasTools(q.id)) {
            const first = !state.fetch.heard.includes(q.id);
            if (first) {
                state.fetch.heard.push(q.id);
                save();
            }
            const t = toolFor(q.id),
                labButton = `<button data-action="lab" data-id="${q.id}">실험대 보기</button>`;
            updateHud();
            if (t && holding(t) && !first) {
                giveTool(t.id);
                return;
            }
            if (t && holding(t)) {
                talk([...q.lines.slice(0, -1), [q.npc, `어라, ${josa(t.name, '을', '를')} 벌써 챙겨 왔군? 역시 준비성 좋은 조수야! ${t.thanks}`]], `<button class="primary" data-action="tool-give" data-tool="${t.id}">${t.icon} ${josa(t.name, '을', '를')} 건네고 실험하기</button>`);
                return;
            }
            if (t) {
                talk(first && t.step === 0 ? q.lines : first ? [q.lines[1], [q.npc, t.ask]] : [
                    [q.npc, t.ask]
                ], `<button class="primary" data-action="fetch-go" data-tool="${t.id}">🔎 ${t.name} 찾으러 가기</button>${first?'':labButton}`);
                return;
            }
            if (!first) {
                talk([
                    [q.npc, '좋아, 필요한 도구는 챙겼군! 실험대에서 이어서 해 보세.']
                ], `<button class="primary" data-action="lab" data-id="${q.id}">실험대로 가기</button>`);
                return;
            }
        }
        talk(q.lines, `<button class="primary" data-action="lab" data-id="${q.id}">같이 살펴볼게!</button>`);
    }

    /* ── 실험대 ─────────────────────────────────────── */
    function beginLab(id, teacher = false) {
        if (!teacher && !accessible(id)) {
            const p = pendingEntry();
            if (p >= 0) {
                openJournal(p);
                toast('필수 기록을 먼저 완성해 주세요.');
            }
            return;
        }
        demo = teacher;
        const known = teacher ? [] : state.evidence[id].filter(e => e.manual).map(e => e.tag);
        sim = Object.assign({
            id,
            record: null,
            localEvidence: []
        }, L[id].init(known));
        const first = L[id].say?.('start', known);
        sim.quip = !known.length && first ? [...first, 'start'] : null;
        renderLab();
        show('lab');
        demo = teacher;
        pause();
    }
    const evid = () => demo ? sim.localEvidence : state.evidence[sim.id];
    const tags = () => evid().filter(e => e.manual).map(e => e.tag);

    function checks() {
        const lab = L[sim.id];
        return lab.checks(tags()).map((ok, i) => [ok, lab.steps[i]]);
    }
    const doneChecks = () => checks().every(c => c[0]);

    function renderLab() {
        const q = M.quests[sim.id],
            lab = L[sim.id],
            npc = M.cast[q.npc],
            cs = checks(),
            can = demo || state.predictions[q.id] != null,
            current = cs.findIndex(c => !c[0]),
            gateTool = !demo && toolFor(sim.id);
        $('labContent').innerHTML = `<header class="modal-head"><div class="eyebrow">${demo?'교사 시연 · 학생 기록에 저장되지 않아요':esc(q.place)+' · 부탁 '+(q.id+1)+' / '+QN}</div><h2 id="labTitle">${esc(q.name)}</h2><button class="close" data-close aria-label="실험 닫기">×</button><p>${esc(q.goal)}</p></header><div class="lab-layout"><aside class="lab-side"><div class="lab-task-head"><h3 class="task-heading">${esc(npc.name)}의 부탁을 들어주기 위해 할 일</h3><details class="lab-guide"><summary>부탁·원리 다시 보기</summary><div class="lab-guide-content"><b>${npc.icon} ${esc(npc.name)}의 부탁</b><p>${esc(q.lines.filter(l=>l[0]===q.npc).map(l=>l[1]).join(' '))}</p><h4>원리 다시 살펴보기</h4><p>${esc(lab.principle)}</p><p class="science-note">${esc(lab.safety)}</p></div></details><button class="hint-button" data-action="next-hint">💡 다음에 무엇을 하지?</button></div><ol class="mission-steps">${cs.map((c,i)=>`<li class="${c[0]?'done':i===current?'current':''}"><span class="step-number">Step ${i+1}${c[0]?' ✓':''}</span><div><b>${c[0]?'해냈어요':i===current?'지금 할 일':'다음 할 일'}</b><p>${i===current&&gateTool?`🔎 먼저 ${esc(josa(gateTool.name,'을','를'))} ${holding(gateTool)?'건네요':'찾아와 건네요'}. `:''}${esc(c[1])}</p></div></li>`).join('')}</ol><p id="nextHint" class="hint-message" role="status"></p></aside><section class="lab-main">${!can?`<div class="prediction"><div class="prediction-scene"><div class="circuit-wrap lab-scene" inert>${lab.scene(sim)}</div></div><div class="prediction-choices"><p><b>먼저 나의 예상</b><br>${esc(lab.prediction[0])}</p><div class="choices">${lab.prediction[1].map((t,i)=>`<button data-action="predict" data-value="${i}">${esc(t)}</button>`).join('')}</div><p class="muted">예상은 틀려도 괜찮아요. 실험 뒤 생각을 바꿀 수 있어요.</p></div></div>`:renderExperiment()}</section></div>`;
    }

    /* 실험대 곁 과학자의 한마디(원본 수업 대사) — 기록을 붙일 때마다 바뀐다 */
    function quipHTML() {
        const q = sim.quip,
            c = q && M.cast[q[0]];
        if (!c) return '';
        return `<div class="npc-quip" role="status"><span class="npc-quip-face" aria-hidden="true">${c.icon}</span><p><b>${esc(c.name)}</b>${esc(q[1])}</p></div>`;
    }

    function gateHTML(t) {
        const has = holding(t),
            npc = M.cast[M.quests[t.quest].npc].name;
        return `<div class="tool-gate" role="status"><div class="tool-gate-icon" aria-hidden="true">${t.icon}</div><div><div class="eyebrow">조수의 일 · 필요한 도구</div><h3>${esc(t.name)}</h3><p>${esc(has?`찾아온 ${josa(t.name,'을','를')} ${npc}에게 건네면 이 단계 실험을 시작해요.`:t.ask)}</p>${has?'':`<p class="muted">하늘빛으로 빛나는 상자 위로 걸어가면 저절로 주워요.</p>`}<button class="primary" data-action="${has?'tool-give':'fetch-go'}" data-tool="${t.id}">${has?`${t.icon} ${esc(josa(t.name,'을','를'))} 건네기`:`🔎 ${esc(t.name)} 찾으러 가기`}</button></div></div>`;
    }

    function renderExperiment() {
        const lab = L[sim.id],
            list = evid(),
            gate = !demo && toolFor(sim.id);
        if (gate) return `<div class="experiment-workbench is-gated"><section class="circuit-pane" aria-label="실험 장면"><div class="sim-badges"><span class="pill amber">${esc(lab.title)}</span></div><div id="labScene" class="circuit-wrap lab-scene" inert>${lab.scene(sim)}</div><p id="labNote" class="circuit-note">${esc(lab.note(sim))}</p></section><section class="lab-tools" aria-label="필요한 도구">${sim.quip&&sim.quip[2]!=='start'?quipHTML():''}${gateHTML(gate)}${list.length?`<details class="evidence-list"><summary>내가 남긴 증거 ${list.length}개 보기</summary><div class="evidence-history">${list.slice(-5).map(e=>`<div class="evidence-item">✎ ${esc(e.label)}</div>`).join('')}</div></details>`:''}</section></div>`;
        return `<div class="experiment-workbench ${sim.record?'is-recording':''}"><section class="circuit-pane" aria-label="실험 장면"><div class="sim-badges"><span class="pill amber">${esc(lab.title)}</span></div><div id="labScene" class="circuit-wrap lab-scene">${lab.scene(sim)}</div><div id="labReadings">${lab.readings(sim)}</div><p id="labNote" class="circuit-note">${esc(lab.note(sim))}</p></section><section class="lab-tools" aria-label="실험 조작과 직접 기록">${quipHTML()}<fieldset class="experiment-controls" ${sim.record?'disabled':''}><legend>실험 조작</legend><p id="labFeedback" class="lab-feedback" role="alert" hidden></p><div id="labControls">${lab.controls(sim)}</div><div class="action-row"><button class="secondary" data-action="capture">▣ 증거 남기기</button><button class="primary" data-action="complete" ${doneChecks()?'':'disabled'}>${state.completed.includes(sim.id)&&!demo?'조사 마치기':'부탁 해결하기 ✓'}</button></div><p class="record-invite">관찰한 뒤 ‘증거 남기기’를 누르면 이 자리에서 결과를 직접 기록해요.</p></fieldset>${recorderHTML()}${list.length?`<details class="evidence-list"><summary>내가 남긴 증거 ${list.length}개 보기</summary><div class="evidence-history">${list.slice(-5).map(e=>`<div class="evidence-item">✎ ${esc(e.label)}</div>`).join('')}</div></details>`:''}</section></div>`;
    }

    /* 실험 조작 뒤에는 그림·계기·조작 칸만 다시 그리고, 누르던 단추로 초점을 돌려 둔다 */
    function refreshLab() {
        if (!$('labScene') || !$('labControls')) return renderLab();
        const lab = L[sim.id],
            active = document.activeElement,
            key = active?.dataset?.lab ? '[data-lab="' + active.dataset.lab + '"]' + ['tool', 'model', 'key', 'delta', 'sample', 'cup', 'sol', 'row', 'u'].filter(k => active.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(active.dataset[k])}"]`).join('') : null;
        $('labScene').innerHTML = lab.scene(sim);
        $('labReadings').innerHTML = lab.readings(sim);
        $('labNote').textContent = lab.note(sim);
        $('labControls').innerHTML = lab.controls(sim);
        if (key) $('lab').querySelector(key)?.focus({
            preventScroll: true
        });
    }

    function labAct(action, data) {
        if (!sim || sim.record || (!demo && toolFor(sim.id))) return;
        const res = L[sim.id].act(sim, action, data) || {};
        if (res.sound) sound(res.sound);
        refreshLab();
        if (res.msg) labMessage(res.msg);
        else if ($('labFeedback')) $('labFeedback').hidden = true;
    }

    function nextHint() {
        document.querySelectorAll('.hint-target').forEach(el => el.classList.remove('hint-target'));
        const hint = sim.record ? {
            selector: '#recordForm [aria-invalid="true"], #recordForm select, #recordForm input',
            copy: '왼쪽 그림에서 본 결과를 골라 적고 ‘기록 확인’을 눌러요.'
        } : !(demo || state.predictions[sim.id] != null) ? {
            selector: '[data-action="predict"]',
            copy: '먼저 내 예상을 하나 골라요. 틀려도 괜찮아요.'
        } : !demo && toolFor(sim.id) ? {
            selector: '[data-action="fetch-go"],[data-action="tool-give"]',
            copy: holding(toolFor(sim.id)) ? '찾아온 도구를 건네면 실험을 시작해요.' : '먼저 필요한 도구를 찾아와요. ‘찾으러 가기’를 누르면 길을 안내해요.'
        } : L[sim.id].hint(sim, tags());
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

    function capture() {
        if (sim.record) {
            $('recordForm')?.querySelector('select,input')?.focus();
            return;
        }
        const r = L[sim.id].capture(sim, tags());
        if (!r || r.error) {
            labMessage(r?.error || '지금은 기록할 수 없어요.');
            return;
        }
        sim.record = {
            ...r,
            previous: evid().find(e => e.tag === r.tag && e.manual)
        };
        renderLab();
        if (!matchMedia('(min-width:900px) and (orientation:landscape)').matches) $('recordForm')?.scrollIntoView({
            block: 'nearest'
        });
        $('recordForm')?.querySelector('select,input')?.focus({
            preventScroll: true
        });
    }

    function fieldHTML(item, prev) {
        const before = prev?.entered?.[item.key];
        const hint = item.hint ? `<small class="measure-hint">${esc(item.hint)}</small>` : '';
        if (item.kind === 'number') return `<label>${esc(item.label)}${hint}<span><input id="measure-${esc(item.key)}" name="${esc(item.key)}" type="number" inputmode="decimal" step="any" required data-ime="off" value="${before??''}" aria-label="기록할 ${esc(item.label)}"><b>${esc(item.unit||'')}</b></span><small id="error-${esc(item.key)}" class="measure-error"></small></label>`;
        return `<label>${esc(item.label)}${hint}<span><select id="measure-${esc(item.key)}" name="${esc(item.key)}" class="measure-select" required aria-label="기록할 ${esc(item.label)}"><option value="">골라요</option>${item.options.map(o=>`<option ${before===o?'selected':''}>${esc(o)}</option>`).join('')}</select></span><small id="error-${esc(item.key)}" class="measure-error"></small></label>`;
    }

    function recorderHTML() {
        const r = sim.record;
        if (!r) return '';
        return `<form id="recordForm" class="record-form"><div class="eyebrow">나의 관찰을 증거로</div><h3>✎ 관찰한 결과를 직접 기록해요</h3><p class="record-description">${esc(r.label)}<br>실험 조건은 그대로 멈춰 있어요. 왼쪽 그림을 보고 적어요.</p><div class="measurement-fields">${r.fields.map(item=>fieldHTML(item,r.previous)).join('')}</div><p class="record-error" id="recordError" role="alert"></p><div class="action-row"><button type="button" data-action="record-cancel">실험으로 돌아가기</button><button type="submit" class="primary">✓ 기록 확인·일지에 붙이기</button></div></form>`;
    }

    function commitRecord(form) {
        const r = sim?.record;
        if (!r) return;
        const raw = Object.fromEntries(new FormData(form)),
            clean = {},
            errors = [];
        for (const item of r.fields) {
            const v = raw[item.key];
            if (item.kind === 'number') {
                const n = Number(v);
                if (v == null || String(v).trim() === '' || !Number.isFinite(n) || Math.abs(n - item.answer) > (item.tol ?? .005) + 1e-9) errors.push(item.key);
                else clean[item.key] = n;
            } else if (v !== item.answer) errors.push(item.key);
            else clean[item.key] = v;
        }
        form.classList.toggle('has-errors', errors.length > 0);
        r.fields.forEach(item => {
            const bad = errors.includes(item.key);
            $('measure-' + item.key)?.setAttribute('aria-invalid', String(bad));
            const box = $('error-' + item.key);
            if (box) box.textContent = bad ? (item.kind === 'number' ? '값을 다시 확인해요.' : '그림을 다시 살펴봐요.') : '';
        });
        if (errors.length) {
            $('recordError').textContent = '표시된 칸을 다시 확인해요. 칸 아래의 안내를 읽어 보세요.';
            $('measure-' + errors[0])?.focus();
            return;
        }
        const list = evid(),
            old = list.findIndex(e => e.tag === r.tag);
        const record = {
            tag: r.tag,
            label: r.label,
            fields: r.fields,
            entered: clean,
            snap: r.snap || {},
            manual: true,
            time: new Date().toISOString()
        };
        if (old >= 0) list[old] = record;
        else list.push(record);
        sim.record = null;
        L[sim.id].after(sim, tags());
        const said = L[sim.id].say?.(r.tag, tags());
        if (said) sim.quip = [...said, r.tag];
        if (!demo) save();
        beep();
        renderLab();
        if (!demo) updateHud();
        toast('직접 적은 관찰을 탐험일지에 붙였어요.');
    }

    function completeQuest(approved = false) {
        if (!doneChecks()) return;
        if (CC.has(sim.id) && !approved) {
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
        const entry = M.entries.findIndex(e => e.quests[e.quests.length - 1] === id),
            nextQ = M.quests[id + 1];
        const button = entry >= 0 ? `<button class="primary" data-action="journal" data-tab="${entry}">✎ ${esc(M.entries[entry].title)} 쓰기 · 필수</button>` : nextQ ? `<button class="primary" data-action="navigate" data-id="${nextQ.id}">${esc(M.cast[nextQ.npc].name)}에게 →</button>` : '';
        talk(q.done, button, was ? '다시 탐구했어요' : `받은 선물 · ${q.gift} ${esc(q.reward)}`);
        IslandCelebrate.burst($('dialogue'), state.calm, '부탁 해결!');
    }

    /* ── 발견 확인(choice · pick) ───────────────────── */
    function openConcept() {
        try {
            const all = demo ? Object.assign(M.quests.map(() => []), {
                [sim.id]: sim.localEvidence
            }) : state.evidence;
            sim.concept = {
                data: CC.build(sim.id, all),
                index: 0,
                correct: false,
                passed: false,
                picked: []
            };
            renderConcept();
            $('concept').showModal();
            pause();
        } catch (error) {
            labMessage(error.message);
        }
    }

    function renderConcept(feedback = '') {
        const c = sim.concept,
            d = c.data,
            q = d.questions[c.index];
        let body;
        if (c.passed) body = `<h3>내 증거로 원리를 설명했어요!</h3><p class="concept-summary">${esc(d.summary)}</p><button class="primary" data-action="concept-finish">부탁 해결 · 주민에게 전하기</button>`;
        else if (q.type === 'pick') body = `<p>발견 확인 ${c.index+1} / ${d.questions.length} · 증거로 말하기</p><h3>${esc(q.prompt)}</h3><div class="concept-picks">${q.options.map((o,i)=>`<label class="pick-row ${c.correct?(o.ok?'ok':'no'):''}"><input type="checkbox" data-pick="${i}" ${c.picked.includes(i)?'checked':''} ${c.correct?'disabled':''}><span>${esc(o.text)}${o.mine?'<small class="mine">✎ 내 기록 있음</small>':''}</span></label>`).join('')}</div><p id="conceptFeedback" role="status">${esc(c.correct?q.explanation:feedback||'주장을 직접 뒷받침하는 조각만 골라요. 참이어도 관계없는 조각은 빼요.')}</p>${c.correct?`<button class="primary" data-action="concept-next">${c.index+1===d.questions.length?'발견 정리 보기':'다음 확인 →'}</button>`:'<button class="primary" data-action="concept-pick">이 증거들로 주장하기</button>'}`;
        else body = `<p>발견 확인 ${c.index+1} / ${d.questions.length}</p><h3>${esc(q.prompt)}</h3><div class="concept-choices">${q.choices.map((t,i)=>`<button data-action="concept-answer" data-value="${i}" ${c.correct?'disabled':''}>${esc(t)}</button>`).join('')}</div><p id="conceptFeedback" role="status">${esc(c.correct?q.explanation:feedback||'내 기록을 떠올려 골라 주세요.')}</p>${c.correct&&q.analogy?`<div class="concept-analogy">${esc(q.analogy)}</div>`:''}${c.correct?`<button class="primary" data-action="concept-next">${c.index+1===d.questions.length?'발견 정리 보기':'다음 확인 →'}</button>`:''}`;
        $('conceptContent').innerHTML = `<header class="modal-head"><h2 id="conceptTitle">${esc(d.title)}</h2><button class="close" data-close aria-label="실험으로 돌아가기">×</button></header><div class="concept-body"><p class="concept-evidence">${esc(d.observation)}</p>${body}</div>`;
    }

    /* ── 일지 ──────────────────────────────────────── */
    function evidenceText(e) {
        return `${e.manual?'✎':'·'} ${e.label} · ${e.fields.map(fl=>fl.label+' '+(e.entered?.[fl.key]??'—')+(fl.unit?' '+fl.unit:'')).join(' · ')}`;
    }

    let peekOpen = false;

    function peekPanel(ids) {
        const body = ids.map(qid => {
            const q = M.quests[qid],
                list = state.evidence[qid];
            const rows = list.map(e => `<div class="peek-row"><b>${e.manual?'✎ ':''}${esc(e.label)}</b><div class="peek-vals">${e.fields.map(fl=>`${esc(fl.label)} <em>${esc(e.entered?.[fl.key]??'—')}${fl.unit?' '+esc(fl.unit):''}</em>`).join(' · ')}</div></div>`).join('');
            return `<h5>${q.gift} ${esc(q.name)}</h5>${rows||'<p class="peek-empty">아직 기록이 없어요. 실험대에서 ‘증거 남기기’로 적으면 여기 나와요.</p>'}`;
        }).join('');
        return `<aside id="evidencePeek" class="evidence-peek" ${peekOpen?'':'hidden'} aria-label="내가 기록한 관찰"><h4>📋 내가 기록한 관찰 <button type="button" data-action="evidence-peek">닫기</button></h4>${body}</aside>`;
    }

    function figureOf(e, qid) {
        try {
            return L[qid].figure(e) || '';
        } catch {
            return '';
        }
    }

    function journalEvidence(ids) {
        const list = ids.flatMap(i => state.evidence[i].map(e => [e, i]));
        if (!list.length) return '<div class="notice">주민의 부탁을 살펴보고 ‘증거 남기기’를 누르면 여기에 실험 기록이 붙어요.</div>';
        const figs = list.map(([e, i]) => figureOf(e, i)).filter(Boolean).slice(-2);
        return `<details class="journal-evidence"><summary>내가 남긴 실험 증거 ${list.length}개 펼치기</summary>${list.map(([e])=>`<div class="evidence-item">${esc(evidenceText(e))}</div>`).join('')}${figs.map(s=>`<div class="circuit-wrap journal-figure">${s}</div>`).join('')}</details>`;
    }

    function renderJournal(tab = journalTab) {
        journalTab = Number(tab);
        const finished = sealedCount();
        let body = '';
        if (journalTab === -1) {
            body = `<div class="journal-cover"><div class="eyebrow">레몬 백작의 부탁</div><div class="big-symbol">🍋</div><h3>${disp(state.nickname)}의<br>산과 염기 탐험일지</h3><p>시들어 가는 아이들을 구하려고 시작한, 나의 과학 이야기</p><div class="stamps">${M.quests.map(q=>`<span class="stamp ${state.completed.includes(q.id)?'done':''}" title="${esc(q.name)}">${q.gift}</span>`).join('')}</div></div><div class="identity-fields"><label>탐험가 별명<input data-ime="submit" data-identity="nickname" value="${esc(state.nickname)}" maxlength="20" aria-label="탐험가 별명"></label><label>학급<input data-ime="off" data-identity="classCode" value="${esc(state.classCode)}" maxlength="20" placeholder="예: 1-3" aria-label="학급"></label><label>번호<input data-ime="off" data-identity="number" value="${esc(state.number)}" maxlength="10" placeholder="번호" inputmode="numeric" aria-label="번호"></label></div>${IslandComfort.helpHTML}<p>주민의 부탁, 내가 한 실험, 직접 적은 관찰을 함께 모아요. 내 기록은 ‘무엇을 알아냈는지 → 어떤 증거로, 왜 그런지 → 새로운 상황에는 어떻게 쓸지’를 담아요.</p><div class="journal-progress">부탁 ${state.completed.length}/${QN} · 필수 기록 ${finished}/${EN} 완성</div>${journalEvidence([0])}<div class="action-row"><button data-action="journal-tab" data-tab="0" class="primary">첫 기록 펼치기 →</button></div>`;
        } else if (journalTab >= 0 && journalTab < EN) {
            const e = M.entries[journalTab],
                ok = M.entryDone(state, journalTab),
                last = journalTab === EN - 1;
            const nextAfter = e.nextQuest != null ? `<button class="primary" data-action="entry-after" data-tab="${journalTab}">다음 이야기 →</button>` : `<button class="primary" data-action="journal-tab" data-tab="4">축제와 제출 준비 →</button>`;
            body = `<div class="journal-art-svg" aria-hidden="true">${e.icon}</div><div class="eyebrow">필수 기록 ${journalTab+1} / ${EN} · ${ok?'서명 완료 ✓':'작성 후 서명해요'}</div><h3>${esc(e.title)}</h3><p>${esc(e.story)}</p>${journalEvidence(e.quests)}${IslandComfort.helpHTML}${peekPanel(e.quests)}${e.questions.map((q,i)=>`<div class="field"><div class="field-head"><label for="note-${journalTab}-${i}"><span>${i+1}</span>${esc(e.labels?.[i]||labels[i])}</label><button type="button" class="peek-btn" data-action="evidence-peek" aria-pressed="${peekOpen}">📋 내 기록 보기</button></div><small>${esc(q)}</small><textarea id="note-${journalTab}-${i}" data-ime="submit" data-note="${journalTab},${i}" rows="3" required maxlength="5000" placeholder="${esc(state.mode==='beginner'?e.starts[i]:'내 실험과 이야기를 연결해 적어 주세요.')}" spellcheck="false">${esc(state.notes[journalTab][i])}</textarea></div>`).join('')}<button type="button" class="secondary ime-check" data-action="check-writing">✓ 기록 확인 · 한글 보정</button><p class="muted">작성 중인 글도 자동으로 저장돼요. 처음 예상과 달라졌어도 괜찮아요. 글의 길이보다 내가 고른 증거와 이유가 중요해요.</p><div class="action-row"><button class="secondary" data-action="journal-tab" data-tab="${journalTab-1}">← 이전</button><button class="primary" data-action="seal-entry">${ok?'✓ 서명한 기록 다시 확인':'✎ 기록에 서명하고 완성하기'}</button>${ok?nextAfter:''}</div>`;
            if (last && ok) body = body.replace('data-action="entry-after"', 'data-action="journal-tab" data-tab="4"');
        } else if (journalTab === EN) {
            body = `<div class="eyebrow">발견을 한눈에</div><h3>산과 염기, 무엇이 달랐을까?</h3>${summaryTable()}<div class="note myth">중화 반응에서 사라지는 것은 H⁺와 OH⁻의 성질이에요. 이온이 모두 없어지는 것이 아니에요 — Na⁺·Cl⁻ 같은 이온은 물속에 그대로 있어요. 어느 쪽이 남느냐가 액성을 정해요.</div><p class="muted">같은 농도의 수용액을 쓴 모형 실험의 결과예요. 입자 모형에서 10 mL에 이온 한 쌍을 그렸어요.</p><div class="action-row"><button class="primary" data-action="journal-tab" data-tab="${EN+1}">제출 준비하기 →</button></div>`;
        } else {
            body = `<div class="eyebrow">나의 탐험을 한 권으로</div><h3>탐험일지 완성·제출 준비</h3><p>해결 기록과 실험 증거를 한 파일에 모아요. 선생님이 정한 과제 제출처에 이 파일을 올려 주세요.</p><ul class="quest-checks"><li class="${state.completed.length===QN?'ok':''}"><span>${state.completed.length===QN?'✓':'○'}</span>주민의 부탁 ${state.completed.length}/${QN} 해결</li><li class="${finished===EN?'ok':''}"><span>${finished===EN?'✓':'○'}</span>필수 기록 ${finished}/${EN} 완성</li></ul><div class="notice">${M.ready(state)?'일지를 완성했어요! 비눗방울 축제를 열고 제출용 파일을 저장할 수 있어요.':'빈 기록을 채워 주세요. 작성 중인 일지도 파일로 보관할 수 있어요.'}</div><div class="end-actions"><button class="primary" data-action="finish">${state.festival?'축제 다시 보기':'비눗방울 축제 열기'}</button><button data-action="print">인쇄 / PDF로 저장</button><button data-action="export-html">제출용 탐험일지 저장 (.html)</button><button data-action="export-json">이어서 쓸 기록 보관 (.json)</button><button data-action="import">저장한 기록 가져오기</button></div><p class="muted">이 화면은 파일을 준비하는 곳이에요. 온라인 제출함으로 보내지 않아요. PDF는 인쇄 창에서 ‘PDF로 저장’을 고르세요.</p>`;
        }
        const nav = [
            ['-1', '🍋', '나의 탐험일지'],
            ...M.entries.map((e, i) => [String(i), String(i + 1).padStart(2, '0'), e.title.replace('레몬 백작에게 보내는 ', '').replace('경계 마을에 보내는 ', '')]),
            [String(EN), '▦', '산과 염기 한눈에'],
            [String(EN + 1), '✓', '완성·제출 준비']
        ];
        $('journalContent').innerHTML = `<header class="modal-head"><div class="eyebrow">차곡차곡 쌓인 나의 발견</div><h2 id="journalTitle">탐험일지</h2><button class="close" data-close aria-label="일지 닫기">×</button></header><div class="journal-layout"><nav class="journal-nav" aria-label="일지 페이지">${nav.map(([i,icon,l])=>`<button class="${+i===journalTab?'active':''}" data-action="journal-tab" data-tab="${i}"><b>${icon}</b>${esc(l)}</button>`).join('')}<small>실험 기록은 자동으로 붙어요.<br>이유는 내 말로 남겨요.<br><br>작성 내용은 이 기기에 저장돼요.</small></nav><section class="journal-page">${body}</section></div>`;
    }

    function openJournal(tab = -1) {
        renderJournal(tab);
        show('journal');
    }

    function summaryTable() {
        const a = state.completed.includes(2),
            b = state.completed.includes(3),
            n = state.completed.includes(4),
            ind = state.completed.includes(5),
            wait = '탐험하며 알아내요';
        const row = (k, acid, base) => `<tr><td>${k}</td><td>${acid}</td><td>${base}</td></tr>`;
        return `<table class="summary-table"><thead><tr><th>발견</th><th>산 ${a?'✓':''}</th><th>염기 ${b?'✓':''}</th></tr></thead><tbody>${row('성질을 만드는 입자',a?'수소 이온 H⁺':wait,b?'수산화 이온 OH⁻':wait)}${row('리트머스 종이',state.completed.includes(1)?'푸른 → 붉은색':wait,b?'붉은 → 푸른색':wait)}${row('BTB 용액',state.completed.includes(1)?'노란색':wait,b?'파란색 (중성 초록색)':wait)}${row('메틸 오렌지',ind?'빨간색':wait,ind?'노란색 (중성도 노란색)':wait)}${row('페놀프탈레인',ind?'무색 (중성도 무색)':wait,b||ind?'붉은색':wait)}${row('전류를 흘리면',a?'H⁺가 (−)극 쪽으로':wait,b?'OH⁻가 (+)극 쪽으로':wait)}${row('세기',a?'강산: 대부분 이온화 (염산·황산·질산)<br>약산: 일부만 이온화 (아세트산)':wait,b?'강염기: 대부분 이온화 (수산화 나트륨·수산화 칼륨·수산화 칼슘)<br>약염기: 일부만 이온화 (암모니아)':wait)}${row('그 밖의 성질',state.completed.includes(1)?'마그네슘과 반응해 수소 기체(H₂)':wait,b?'단백질을 녹여 미끌거림 → 맨손으로 만지지 않기':wait)}<tr><td>둘이 만나면</td><td colspan="2">${n?'중화 반응 H⁺ + OH⁻ → H₂O · 같은 수만큼 만나면 중성, 남는 쪽이 액성을 정해요 · 열이 나와요':wait}</td></tr></tbody></table>`;
    }

    function sealEntry() {
        if (journalTab < 0 || journalTab >= EN || !comfort.confirmJournal()) return;
        const i = journalTab;
        if (!M.entryWritten(state, i)) {
            toast('세 칸을 모두 내 말로 남겨 주세요.');
            const j = state.notes[i].findIndex(t => !t.trim());
            $('note-' + i + '-' + j)?.focus();
            return;
        }
        if (!M.entries[i].quests.every(q => state.completed.includes(q))) {
            toast('관련 주민의 부탁을 해결하고 실험 증거를 모아 주세요.');
            return;
        }
        const first = !state.sealedEntries[i];
        state.sealedEntries[i] = true;
        save();
        updateHud();
        world?.applyProgress();
        IslandCelebrate.burst($('journal'), state.calm, '나의 기록 완성!');
        renderJournal(i);
        if (first) setTimeout(() => entryAfter(i), state.calm ? 200 : 900);
        else toast('서명한 기록을 다시 확인했어요.');
    }

    function entryAfter(i) {
        const e = M.entries[i];
        if (!comfort.confirmJournal()) return;
        const nextQ = e.nextQuest != null ? M.quests[e.nextQuest] : null;
        talk(e.after, nextQ ? `<button class="primary" data-action="navigate" data-id="${nextQ.id}">${esc(M.cast[nextQ.npc].name)}에게 →</button>` : `<button class="primary" data-action="journal-tab" data-tab="${EN+1}">✦ 축제와 제출 준비</button>`);
    }

    /* ── 지도 ──────────────────────────────────────── */
    function drawMap(canvas, large = false) {
        const g = canvas.getContext('2d'),
            w = canvas.width,
            h = canvas.height,
            sx = w / 46,
            sy = h / 40,
            xx = x => (x + 23) * sx,
            zz = z => (z + 20) * sy;
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#6ea4c4';
        g.fillRect(0, 0, w, h);
        LAYOUT.lands.forEach(([x0, x1, z0, z1], i) => {
            g.fillStyle = i ? '#c6b4e8' : '#e2d77c';
            g.beginPath();
            g.roundRect(xx(x0), zz(z0), (x1 - x0) * sx, (z1 - z0) * sy, 8);
            g.fill();
        });
        g.fillStyle = '#d9b98a';
        for (const z of LAYOUT.bridges) g.fillRect(xx(2.5), zz(z - 1.3), 5 * sx, 2.6 * sy);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (const r of LAYOUT.roads) {
            g.lineWidth = (large ? 4 : 2) * r.w;
            for (let i = 1; i < r.pts.length; i++) {
                const a = r.pts[i - 1],
                    b = r.pts[i];
                g.strokeStyle = (a[0] + b[0]) / 2 > 5 ? '#f1e9fb' : '#b98a55';
                g.beginPath();
                g.moveTo(xx(a[0]), zz(a[1]));
                g.lineTo(xx(b[0]), zz(b[1]));
                g.stroke();
            }
        }
        g.fillStyle = '#e7cfa6';
        g.beginPath();
        g.arc(xx(LAYOUT.plaza.x), zz(LAYOUT.plaza.z), LAYOUT.plaza.r * sx, 0, Math.PI * 2);
        g.fill();
        const court = LAYOUT.court;
        g.fillStyle = '#f7e9b0';
        g.fillRect(xx(court.x0), zz(court.z0), (court.x1 - court.x0) * sx, (court.z1 - court.z0) * sy);
        g.strokeStyle = '#d8b24a';
        g.lineWidth = large ? 2.5 : 1.2;
        g.strokeRect(xx(court.x0), zz(court.z0), (court.x1 - court.x0) * sx, (court.z1 - court.z0) * sy);
        g.fillStyle = '#e8d6a8';
        g.fillRect(xx(court.gate[0]), zz(court.z1) - 2, (court.gate[1] - court.gate[0]) * sx, 4);
        g.fillStyle = '#f6e3a0';
        g.fillRect(xx(-16.9), zz(-15.8), 6.8 * sx, 4.2 * sy);
        g.strokeStyle = '#a8753a';
        g.strokeRect(xx(-16.9), zz(-15.8), 6.8 * sx, 4.2 * sy);
        if (large) {
            g.font = 'bold 12px "Malgun Gothic"';
            g.textAlign = 'center';
            g.fillStyle = '#6a5520';
            g.fillText('레몬 성', xx(-13.5), zz(-16.3));
            g.fillStyle = '#35607a';
            g.fillText('경계 마을', xx(15), zz(10.5));
        }
        for (const q of M.quests) {
            g.fillStyle = state.completed.includes(q.id) ? '#6d9c6b' : accessible(q.id) ? '#e1a93a' : '#9ab393';
            g.strokeStyle = '#4a3a1a';
            g.lineWidth = large ? 2 : 1;
            g.beginPath();
            g.arc(xx(q.x), zz(q.z), large ? 8 : 4, 0, Math.PI * 2);
            g.fill();
            g.stroke();
            if (large) {
                g.font = 'bold 12px "Malgun Gothic"';
                g.textAlign = 'center';
                g.fillStyle = '#3f5847';
                g.fillText((q.id + 1) + '. ' + M.cast[q.npc].short, xx(q.x), zz(q.z) - 12);
            }
        }
        const wt = worldTool();
        if (wt) {
            const r = large ? 9 : 5;
            g.fillStyle = '#d9462f';
            g.strokeStyle = '#ffffff';
            g.lineWidth = large ? 2.5 : 1.5;
            g.beginPath();
            for (let k = 0; k < 10; k++) {
                const a = -Math.PI / 2 + k * Math.PI / 5,
                    rr = k % 2 ? r * .45 : r;
                g.lineTo(xx(wt.x) + Math.cos(a) * rr, zz(wt.z) + Math.sin(a) * rr);
            }
            g.closePath();
            g.fill();
            g.stroke();
        }
        const pos = world ? world.player.position : state.pos;
        g.fillStyle = '#fffaf0';
        g.beginPath();
        g.arc(xx(pos.x), zz(pos.z), large ? 7 : 4.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#3e8f86';
        g.beginPath();
        g.arc(xx(pos.x), zz(pos.z), large ? 4 : 2.5, 0, Math.PI * 2);
        g.fill();
    }

    function openMap() {
        $('mapContent').innerHTML = `<header class="modal-head"><div class="eyebrow">산 대륙과 버블 왕국 사이</div><h2 id="mapTitle">레몬 왕국 지도</h2><button class="close" data-close aria-label="지도 닫기">×</button><p>부탁을 고르면 그곳까지 길을 따라 걸어가요.</p></header><div class="map-body"><canvas id="largeMap" class="large-map" width="380" height="400" aria-label="레몬 왕국과 경계 마을, 여섯 부탁의 자리와 현재 위치"></canvas><div class="map-list">${M.quests.map(q=>`<button data-action="navigate" data-id="${q.id}" ${accessible(q.id)?'':'disabled'} class="${accessible(q.id)?'':'locked'}">${q.gift} ${esc(q.place)}<small>${state.completed.includes(q.id)?'✓ 부탁 해결 · 다시 방문':accessible(q.id)?esc(M.cast[q.npc].name+' · '+q.name):'앞의 부탁을 해결하면 열려요'}</small></button>`).join('')}<button data-action="camp">⛺ 내 연구 텐트<small>받은 선물을 보러 가요</small></button></div></div>`;
        show('map');
        drawMap($('largeMap'), true);
    }

    function openSettings() {
        $('settingsContent').innerHTML = `<header class="modal-head"><h2 id="settingsTitle">탐험 설정</h2><button class="close" data-close aria-label="설정 닫기">×</button></header><div class="settings-body">${comfort.settingsHTML()}<label class="setting-row"><span>조작·성공 효과음<small>도구, 버튼, 증거 기록과 부탁 해결 소리예요.</small></span><input type="checkbox" data-setting="effects" ${state.effects?'checked':''}></label><label class="setting-row"><span>움직임 줄이기<small>반복 움직임을 줄이고 대사는 한 번에 보여요.</small></span><input type="checkbox" data-setting="calm" ${state.calm?'checked':''}></label><label class="setting-row"><span>탐험 안내</span><select data-setting="mode"><option value="review" ${state.mode==='review'?'selected':''}>복습 탐험</option><option value="beginner" ${state.mode==='beginner'?'selected':''}>첫 탐험 · 문장 도움</option></select></label><label class="setting-row"><span>텐트 등불 색<small>첫 부탁을 해결하면 텐트 옆에 켜져요.</small></span><select data-setting="camp"><option value="lemon" ${state.camp==='lemon'?'selected':''}>레몬빛</option><option value="mint" ${state.camp==='mint'?'selected':''}>민트빛</option><option value="bubble" ${state.camp==='bubble'?'selected':''}>비눗방울빛</option></select></label><div class="notice">방향키·WASD로 걷기 / E로 대화 / J로 일지<br>길을 누르면 걸어가요. 화면 왼쪽 아래 조이스틱도 쓸 수 있어요.</div><details class="teacher-tools"><summary>🧑‍🏫 교사 도구</summary><div class="note class">시연은 학생 진행도와 증거에 저장되지 않아요. 서술형은 자동 채점하지 않아요. 고른 증거가 주장과 맞는지, 입자로 설명한 이유, 새 상황에 대한 판단을 함께 살펴봐 주세요.</div>${M.quests.map(q=>`<button data-action="demo" data-id="${q.id}">${q.id+1}. ${esc(q.name)}</button>`).join('')}<p class="muted">부탁 6개와 필수 기록 3편으로 이루어져요. 한 차시에 부탁 두세 개씩 나누어 진행할 수 있어요.</p></details><div class="notice credit-row">이 페이지는 겨울쌤의 「레몬 백작의 부탁」 수업을 바탕으로 구현되었습니다. <a href="${CREDIT_URL}" target="_blank" rel="noopener">수업 원본 보기 ↗</a></div><div class="action-row"><button data-action="story-replay">이야기 다시 읽기</button><button data-action="credit-open">원안 안내 다시 보기</button><button data-action="export-json">진행 기록 보관</button><button class="danger" data-action="reset">새 탐험 시작</button></div></div>`;
        show('settings');
        comfort.updateAudioUI();
    }

    /* ── 이야기 · 축제 · 끝 ─────────────────────────── */
    let storyPage = 0,
        storyReplay = false;
    const storyPages = [{
        tag: '레몬 왕국에서 온 편지',
        title: '산성이 곧 기운인 나라',
        text: '레몬 왕국 사람들은 몸속이 새콤한 산성일 때 가장 힘이 나요. 지구에서 온 당신에게 레몬 성으로 와 달라는 레몬 백작의 초대장이 도착했어요.'
    }, {
        tag: '그런데… 아이들이 시들어요',
        title: '경계 마을에 번진 중화병',
        text: '버블 왕국과 맞닿은 경계 마을에서 어린 레몬들이 기운을 잃고 색이 바래 가요. 원인도, 치료법도 아직 아무도 몰라요.'
    }, {
        tag: '과학자가 사건을 푸는 방법',
        title: '예상하고, 실험하고, 직접 기록해요',
        text: '두 연구자의 조수가 되어 실험해요. 흩어진 실험 도구를 찾아 건네고, 관찰한 색과 값을 ‘증거 남기기’로 직접 적어요. 막히면 힌트를 눌러요. 다음에 누를 곳이 빛나요.'
    }, {
        tag: '세 편의 필수 기록',
        title: '증거로 말하는 과학자',
        text: '연구 보고서 → 중화병 보고서 → 경계 마을 안내문. 무엇을 알아냈는지, 어떤 증거로 왜 그런지, 새로운 상황엔 어떻게 쓸지 적고 서명하면 비눗방울 축제가 열려요.'
    }];

    function storyArt(i) {
        const sky = i === 1 ? ['#3b3060', '#8b6a8f'] : i >= 2 ? ['#fff4d0', '#ffe39a'] : ['#2a2350', '#e3935a'];
        const bubbles = Array.from({
            length: i === 1 ? 9 : 6
        }, (_, k) => `<circle cx="${560+((k*97)%260)}" cy="${60+((k*53)%150)}" r="${10+(k%3)*7}" fill="#dff5ff" fill-opacity=".25" stroke="#bfe9ff" stroke-width="2"/>`).join('');
        const lemon = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="34" ry="42" fill="${c}"/><path d="M0 -42 L-7 -56 L7 -56 Z" fill="${c}"/><ellipse cx="14" cy="-50" rx="12" ry="5" fill="#5fa54a" transform="rotate(-20 14 -50)"/><circle cx="-11" cy="-4" r="4" fill="#2f332c"/><circle cx="11" cy="-4" r="4" fill="#2f332c"/><path d="M-8 12 Q0 ${c==='#d8d3a6'?8:18} 8 12" fill="none" stroke="#6d3b2f" stroke-width="3" stroke-linecap="round"/></g>`;
        if (i >= 2) return `<svg viewBox="0 0 800 320" role="img" aria-label="${i===2?'실험대와 기록 공책':'세 편의 기록 공책'}"><rect width="800" height="320" fill="${sky[0]}"/><rect y="220" width="800" height="100" fill="#e6d2a8"/>${i===2?`<g transform="translate(150 110)"><path d="M0 0 L0 110 Q0 126 16 126 L94 126 Q110 126 110 110 L110 0" fill="#f2d24a" fill-opacity=".85" stroke="#7d93a0" stroke-width="4"/><path d="M180 0 L180 110 Q180 126 196 126 L274 126 Q290 126 290 110 L290 0" fill="#5db36d" fill-opacity=".85" stroke="#7d93a0" stroke-width="4"/><path d="M360 0 L360 110 Q360 126 376 126 L454 126 Q470 126 470 110 L470 0" fill="#3f79d4" fill-opacity=".85" stroke="#7d93a0" stroke-width="4"/><text x="55" y="-16" text-anchor="middle" font-size="22" fill="#6a5520">산성</text><text x="235" y="-16" text-anchor="middle" font-size="22" fill="#3f6f4a">중성</text><text x="415" y="-16" text-anchor="middle" font-size="22" fill="#2f5a9a">염기성</text></g>`:`${[0,1,2].map(k=>`<g transform="translate(${150+k*190} ${80+k*8}) rotate(${-6+k*6})"><rect width="150" height="180" rx="12" fill="#fffaf0" stroke="#d8c9a4" stroke-width="4"/><rect width="26" height="180" rx="8" fill="${['#f5cf3a','#8fcff0','#b7a2e0'][k]}"/>${[0,1,2,3].map(j=>`<line x1="46" x2="128" y1="${50+j*28}" y2="${50+j*28}" stroke="#d8cdb3" stroke-width="4"/>`).join('')}<text x="86" y="30" text-anchor="middle" font-size="26">${['🧪','🫧','🏡'][k]}</text></g>`).join('')}`}</svg>`;
        return `<svg viewBox="0 0 800 320" role="img" aria-label="${i===0?'노을 진 레몬 왕국과 레몬 성':'기운을 잃은 레몬 아이와 날아드는 비눗방울'}"><defs><linearGradient id="sky${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="800" height="320" fill="url(#sky${i})"/><circle cx="140" cy="90" r="46" fill="#ffe9a0" opacity=".9"/><path d="M0 250 Q200 200 400 240 T800 230 V320 H0 Z" fill="${i===1?'#8a78ad':'#d8c25a'}"/><path d="M0 285 Q220 250 460 280 T800 270 V320 H0 Z" fill="${i===1?'#76659a':'#c7ab46'}"/>${i===0?`<g transform="translate(470 110)"><rect x="-70" y="40" width="140" height="100" fill="#f6e7bd"/><rect x="-100" y="20" width="36" height="120" fill="#f3dea6"/><rect x="64" y="20" width="36" height="120" fill="#f3dea6"/><ellipse cx="-82" cy="8" rx="26" ry="34" fill="#f5cf3a"/><ellipse cx="82" cy="8" rx="26" ry="34" fill="#f5cf3a"/><ellipse cx="0" cy="20" rx="44" ry="50" fill="#f7d543"/><rect x="-16" y="100" width="32" height="40" rx="14" fill="#7a5a3a"/></g>${lemon(250,240,1.1,'#f4cf2f')}`:`${lemon(300,240,1,'#d8d3a6')}${lemon(390,256,.8,'#d8d3a6')}${bubbles}`}</svg>`;
    }

    function startStory(replay = false) {
        storyPage = 0;
        storyReplay = replay;
        renderStory();
        show('story');
    }

    function renderStory() {
        const p = storyPages[storyPage];
        $('storyContent').innerHTML = `<div class="story-art story-svg">${storyArt(storyPage)}</div><section class="story-caption"><div class="eyebrow">${esc(p.tag)} · ${storyPage+1}/4</div><h2 id="storyTitle">${esc(p.title)}</h2><p>${esc(p.text)}</p><div class="story-dots" aria-label="이야기 ${storyPage+1}장">${storyPages.map((_,i)=>`<i class="${i===storyPage?'active':''}"></i>`).join('')}</div><div class="action-row"><button data-action="story-back" ${storyPage===0?'disabled':''}>← 이전</button><button class="primary" data-action="story-next">${storyPage===3?(storyReplay?'이야기 닫기':'나의 탐험 준비하기 →'):'다음 이야기 →'}</button></div></section>`;
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

    function showEnding() {
        $('endingContent').innerHTML = `<div class="eyebrow">여섯 가지 부탁, 한 권의 이야기</div><div class="ending-symbol">🫧</div><h2 id="endingTitle">${disp(state.nickname)},<br>비눗방울 축제가 시작됐어!</h2><p>시들어 가던 아이들이 다시 새콤해졌어.<br>네가 모은 증거와 찾아낸 이유가<br>한 권의 탐험일지가 되었어.</p><div class="stamps">${M.quests.map(q=>`<span class="stamp done">${q.gift}</span>`).join('')}</div><div class="end-actions"><button class="primary" data-action="export-html">제출용 탐험일지 저장</button><button data-action="print">인쇄 / PDF로 저장</button><button class="secondary" data-action="freeplay">축제 둘러보기 →</button></div><p class="muted">저장한 파일은 선생님이 정한 과제 제출처에 올려 주세요.</p>`;
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
            openJournal(EN + 1);
            toast('주민의 부탁과 세 가지 필수 기록을 먼저 완성해 주세요.');
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
        const lines = ['레몬 성의 창문에 새콤한 불빛이 켜져요!', '에시드 연구실의 플라스크가 반짝여요!', '전기 실험대의 전구가 환하게 빛나요!', '베이스 연구실의 돔이 하늘빛으로 물들어요!', '혼합 실험대에 초록 불빛이 켜져요!', '경계 마을 광장까지, 두 왕국이 하나로 이어졌어요!'];
        world.playFestival({
            calm: state.calm,
            onStage: info => {
                if (!festivalRunning) return;
                $('festivalMessage').textContent = info.stage === 'dim' ? '모두 준비됐나요? 잠시 불을 내려요.' : info.stage === 'relight' ? lines[info.region] : info.stage === 'finale' ? '레몬 왕국과 버블 왕국의 비눗방울 축제, 시작!' : '축제가 시작됐어요!';
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

    /* ── 파일 ──────────────────────────────────────── */
    function reportBody() {
        return `<section class="print-cover"><p>레몬 백작의 부탁 · 산과 염기 탐험일지</p><h1>${disp(state.nickname)}의<br>산과 염기 탐험일지</h1><p>학급 ${esc(state.classCode)||'—'} · 번호 ${esc(state.number)||'—'}<br>${state.mode==='beginner'?'첫 탐험':'복습 탐험'} · 부탁 ${state.completed.length}/${QN} 해결</p><p>관찰 → 증거 → 입자로 설명한 이유 → 새로운 적용</p><p class="print-footer">이 탐험은 겨울쌤의 「레몬 백작의 부탁」 수업을 바탕으로 구현되었습니다 · ${CREDIT_URL}</p><p class="print-footer">${M.ready(state)?'완성한 탐험일지':'작성 중인 탐험일지'} · ${new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}<br>© 2026 조승재(과학이조선생) · 해누리중학교</p></section>${M.entries.map((e,i)=>{const recs=e.quests.flatMap(q=>state.evidence[q].map(r=>[r,q]));const figs=recs.map(([r,q])=>figureOf(r,q)).filter(Boolean).slice(-2);return `<section class="print-page"><h2>${i+1}. ${esc(e.title)}</h2><p>${esc(e.story)}</p><div class="evidence"><b>내가 남긴 실험 증거</b>${recs.length?recs.map(([r])=>`<div>${esc(evidenceText(r))}</div>`).join(''):'<p>아직 기록하지 않았어요.</p>'}${figs.join('')}</div>${e.quests.filter(q=>state.predictions[q]).map(q=>`<p class="print-footer">처음 예상 · ${esc(state.predictions[q])}</p>`).join('')}${labels.map((l,j)=>`<article><h3>${esc(e.labels?.[j]||l)}</h3><p class="print-footer">${esc(e.questions[j])}</p><p>${disp(state.notes[i][j])||'아직 작성하지 않았어요.'}</p></article>`).join('')}</section>`;}).join('')}<section class="print-page"><h2>산과 염기, 무엇이 달랐을까</h2>${summaryTable()}${state.evidence[0].length?`<h3>처음 관찰 · 새콤의 즙</h3><div class="evidence">${state.evidence[0].map(e=>`<div>${esc(evidenceText(e))}</div>`).join('')}</div>`:''}<p class="print-footer">작성한 설명은 학생의 기록입니다. 자동 채점하거나 대신 작성하지 않았습니다.</p></section>`;
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
        const css = `body{max-width:820px;margin:40px auto;padding:24px;color:#3b4232;font:16px/1.85 'Malgun Gothic',sans-serif;background:#fffdf2}h1,h2{color:#8a6a12}h1{font-size:38px}h2{border-bottom:2px solid #eed98a;padding-bottom:12px}.print-cover{text-align:center;padding:45px 0}.print-page{margin:35px 0;padding:20px 0;border-top:1px solid #efe4c2}.print-page p{white-space:pre-wrap}article{break-inside:avoid}.evidence{background:#fbf5dc;padding:20px;border-radius:16px;font-size:14px}.evidence svg{display:block;width:100%;height:auto;max-height:260px;margin-top:10px}.print-footer{font-size:13px;color:#8d8a6d}.summary-table{border-collapse:collapse;width:100%;font-size:14px}.summary-table th,.summary-table td{padding:10px;border:1px solid #e8dcb6;text-align:left;vertical-align:top}svg text{font-family:'Malgun Gothic',sans-serif}.t-title{font-size:26px;font-weight:800;fill:#3f4a3a}.t-sub,.t-small{font-size:17px;fill:#5a6655}.t-label{font-size:19px;font-weight:700;fill:#44503f}.t-mini{font-size:14px;fill:#5a6655}.t-particle{font-weight:800;fill:#24321f}.t-big{font-size:30px;font-weight:800;fill:#44503f}@media print{@page{size:A4;margin:17mm}body{margin:0;padding:0;background:white;font-size:11pt}.print-cover,.print-page{break-after:page}.print-page{border:0;margin:0}.print-page:last-child{break-after:auto}.evidence{break-inside:avoid}}`;
        download('레몬백작의부탁_탐험일지.html', `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>레몬 백작의 부탁 · 탐험일지</title><style>${css}</style><body>${reportBody()}</body></html>`, 'text/html;charset=utf-8');
        toast('제출용 파일을 저장했어요. 선생님이 정한 제출처에 올려 주세요.');
    }

    function navigate(id) {
        comfort.stopTalk(true);
        if (!accessible(id)) {
            const p = pendingEntry();
            if (p >= 0) {
                openJournal(p);
                toast('필수 기록을 먼저 완성해 주세요.');
            } else toast('앞의 부탁을 먼저 해결해 주세요.');
            return;
        }
        dlgIds.forEach(d => $(d).open && $(d).close());
        pause();
        const q = M.quests[id],
            spot = world?.castSpot ? world.castSpot(q.npc) : q;
        world?.go({
            id: q.npc,
            x: spot.x,
            z: spot.z
        });
        toast(`${M.cast[q.npc].name}에게 가는 길이에요.`);
    }

    /* ── 입력 ──────────────────────────────────────── */
    document.addEventListener('click', e => {
        const labHit = e.target.closest('[data-lab]');
        if (labHit && labHit.closest('#lab') && !labHit.closest('[inert]')) {
            if (labHit.disabled) return;
            labAct(labHit.dataset.lab, {
                ...labHit.dataset
            });
            return;
        }
        if (e.target.closest('button') && !e.target.closest('[data-lab]')) sound('click');
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
            case 'talk-next':
                if (talkState && talkState.index < talkState.lines.length - 1) {
                    talkState.index++;
                    renderTalk();
                }
                break;
            case 'credit-close':
                close('credit');
                break;
            case 'credit-open':
                creditThen = null;
                show('credit');
                break;
            case 'talk-close':
                close('dialogue');
                updateHud();
                break;
            case 'concept-answer': {
                const c = sim.concept,
                    q = c.data.questions[c.index];
                if (Number(b.dataset.value) === q.correct) {
                    c.correct = true;
                    sound('place');
                    renderConcept();
                } else renderConcept('다시 생각해 봐요. ' + q.explanation);
                break;
            }
            case 'concept-pick': {
                const c = sim.concept,
                    q = c.data.questions[c.index];
                c.picked = [...$('conceptContent').querySelectorAll('[data-pick]')].filter(x => x.checked).map(x => Number(x.dataset.pick));
                const want = q.options.map((o, i) => o.ok ? i : -1).filter(i => i >= 0);
                const extra = c.picked.filter(i => !want.includes(i)).length,
                    missing = want.filter(i => !c.picked.includes(i)).length;
                if (!extra && !missing) {
                    c.correct = true;
                    sound('success');
                    renderConcept();
                } else renderConcept(!c.picked.length ? '증거를 하나 이상 골라 주세요.' : `${extra?`고른 조각 중 ${extra}개는 참이지만 이 주장과 직접 관계가 없어요. `:''}${missing?`주장을 받쳐 줄 조각이 ${missing}개 더 있어요.`:''}`);
                break;
            }
            case 'concept-next':
                if (!sim.concept.correct) break;
                if (++sim.concept.index >= sim.concept.data.questions.length) sim.concept.passed = true;
                else {
                    sim.concept.correct = false;
                    sim.concept.picked = [];
                }
                renderConcept();
                break;
            case 'concept-finish':
                if (!sim.concept?.passed) break;
                close('concept');
                completeQuest(true);
                break;
            case 'inventory':
                $('inventoryContent').innerHTML = `<header class="modal-head"><h2 id="inventoryTitle">나의 선물 보관함</h2><button class="close" data-close aria-label="보관함 닫기">×</button></header><p>주민의 부탁을 해결할 때마다 선물을 받아요. 받은 선물은 연구 텐트 옆에도 놓여요.</p><div class="gift-grid">${M.quests.map(q=>{const got=state.completed.includes(q.id);return `<article class="gift-card ${got?'earned':'locked'}"><div class="gift-emoji" aria-hidden="true">${got?q.gift:'🎁'}</div><h3>${got?esc(q.reward):'아직 열지 않은 선물'}</h3><p>${esc(M.cast[q.npc].name)} · ${got?'부탁 해결 선물':'「'+esc(q.name)+'」을 해결해요'}</p></article>`;}).join('')}</div><h3 class="tool-bag-title">🧰 조수의 도구 가방</h3><p>Dr.에시드의 흩어진 실험 도구를 찾아 건넨 기록이에요.</p><div class="tool-bag">${M.tools.map(t=>{const given=state.fetch.given.includes(t.id),got=state.fetch.got.includes(t.id);return `<div class="tool-bag-item ${given?'given':got?'got':'missing'}"><span aria-hidden="true">${given||got?t.icon:'❔'}</span><b>${given||got?esc(t.name):'아직 찾지 못한 도구'}</b><small>${given?'에시드에게 건넴':got?'가방에 있음 · 건네러 가요':'부탁 '+(t.quest+1)+'에서 찾아요'}</small></div>`;}).join('')}</div><button data-action="camp">내 연구 텐트 보러 가기 →</button>`;
                show('inventory');
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
            case 'entry-after':
                entryAfter(Number(b.dataset.tab));
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
                    const t = Math.max(-1, Math.min(EN + 1, Number(b.dataset.tab)));
                    if (!$('journal').open) openJournal(t);
                    else renderJournal(t);
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
            case 'fetch-go':
                fetchGo(b.dataset.tool);
                break;
            case 'tool-give':
                giveTool(b.dataset.tool);
                break;
            case 'lab':
                beginLab(id);
                break;
            case 'demo':
                beginLab(id, true);
                break;
            case 'predict':
                state.predictions[sim.id] = L[sim.id].prediction[1][Number(b.dataset.value)];
                if (!demo) save();
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
                download('레몬백작의부탁_이어서쓰기.json', JSON.stringify({
                    ...state,
                    island: 'lemon'
                }, null, 2), 'application/json');
                toast('진행 기록을 보관했어요.');
                break;
            case 'check-writing':
                if (comfort.confirmJournal()) {
                    updateHud();
                    toast('기록을 확인했어요. 내가 고른 증거와 이유가 담겼는지도 읽어 보세요.');
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
            case 'festival-skip':
                skipFestival();
                break;
            case 'freeplay':
                close('ending');
                toast('비눗방울을 따라 축제를 둘러보세요.');
                break;
            case 'camp':
                comfort.stopTalk(true);
                dlgIds.forEach(d => $(d).open && $(d).close());
                pause();
                if (world) world.path = world.findPath(LAYOUT.camp.x - 1, LAYOUT.camp.z + 2.8);
                toast('내 연구 텐트로 가요. 받은 선물이 기다리고 있어요.');
                break;
            case 'reset':
                if (window.confirm('새 탐험을 시작하면 이 기기의 현재 기록이 바뀝니다. 먼저 ‘진행 기록 보관’으로 저장했나요?')) {
                    if (M.save(M.fresh())) {
                        suspendSave = true;
                        location.reload();
                    } else toast('기기 저장이 막혀 새 탐험을 시작하지 못했어요.');
                }
                break;
        }
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.lab-hit')) {
            e.preventDefault();
            e.target.dispatchEvent(new MouseEvent('click', {
                bubbles: true
            }));
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
            $('noteBadge').textContent = sealedCount();
        }
        if (el.dataset.identity) {
            state[el.dataset.identity] = el.value;
            deferSave();
        }
    });
    document.addEventListener('change', e => {
        const el = e.target;
        if (el.id === 'musicSeek') {
            comfort.commitMusicPosition(Number(el.value));
            return;
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
    });
    document.addEventListener('submit', e => {
        if (e.target.id === 'recordForm') {
            e.preventDefault();
            commitRecord(e.target);
        }
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
        if (!state.visited.includes(0) && !state.completed.length) {
            const sp = LAYOUT.court.spawn;
            state.pos = {
                x: sp.x,
                z: sp.z
            };
            if (world) {
                world.player.position.set(sp.x, world.player.position.y, sp.z);
                world.camTarget.copy(world.player.position);
                world.path = [];
                world.player.rotation.y = Math.PI;
            }
            setTimeout(() => {
                if (!dlgIds.some(d => $(d).open)) interact(0);
            }, state.calm ? 60 : 600);
        } else toast('반가워요! 레몬 성 안뜰이에요. 왕좌 앞의 레몬 백작에게 다가가 말을 걸어 보세요.');
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
            if (file.size > 2_000_000) throw new Error('파일이 너무 커요. 레몬 백작의 부탁에서 저장한 JSON 파일을 골라 주세요.');
            const imported = M.sanitize(JSON.parse(await file.text()));
            if (!window.confirm('가져온 기록으로 이 기기의 탐험을 바꿀까요? 현재 기록이 필요하면 먼저 파일로 보관해 주세요.')) return;
            if (!M.save(imported)) {
                toast('기기 저장이 막혀 가져오지 못했어요. 현재 탐험은 그대로예요.');
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

    /* ── 시작 ──────────────────────────────────────── */
    comfort = new IslandComfort({
        state: () => state,
        save,
        toast
    });
    $('npcLabels').innerHTML = M.cast.map(c => `<button id="npc-${c.id}" class="npc-label" ${c.id===4?'':`data-action="navigate" data-id="${M.quests.find(q=>q.npc===c.id).id}"`} title="${esc(c.name)}">${esc(c.short)}</button>`).join('') + '<button id="toolLabel" class="npc-label tool-label" data-action="fetch-go" hidden></button>';
    try {
        world = new IslandWorld($('world'), {
            interact,
            pick: id => pickTool(id),
            journal: () => openJournal(),
            toast,
            near: id => {
                $('interact').hidden = id == null || !state.started;
                if (id != null) $('interact').innerHTML = `<kbd>E</kbd><span>${esc(M.cast[id].short)}에게 말 걸기</span>`;
            },
            update: (pos, positions) => {
                positions.forEach(p => {
                    const el = $('npc-' + p.id);
                    if (!el) return;
                    el.style.left = p.x + 'px';
                    el.style.top = p.y + 'px';
                    el.hidden = !state.started || p.x < 15 || p.x > innerWidth - 15 || p.y < 90 || p.y > innerHeight - 40 || !p.visible;
                });
                const ts = world?.toolScreen?.(),
                    tl = $('toolLabel');
                if (tl) {
                    const t = ts && toolById(ts.id);
                    tl.hidden = !t || !state.started || !ts.visible || ts.x < 15 || ts.x > innerWidth - 15 || ts.y < 90 || ts.y > innerHeight - 40;
                    if (t) {
                        if (tl.dataset.tool !== t.id) tl.innerHTML = `${t.icon} ${esc(t.name)} <span>줍기</span>`;
                        tl.dataset.tool = t.id;
                        tl.style.left = ts.x + 'px';
                        tl.style.top = ts.y + 'px';
                    }
                }
                drawMap($('miniMap'));
            }
        }, state);
    } catch (err) {
        $('worldError').hidden = false;
        console.error('3D 섬 초기화 실패:', err);
    }
    /* 이름표를 누르면: 그 주민의 지금 부탁 자리로 */
    for (const c of M.cast)
        if (c.id !== 4) {
            const el = $('npc-' + c.id);
            el.addEventListener('click', () => {
                const q = castQuest(c.id);
                if (q) el.dataset.id = q.id;
            }, true);
        }
    updateHud();
    drawMap($('miniMap'));
    const startFlow = () => {
        if (!state.started) show('welcome');
        else pause();
    };
    $('credit').addEventListener('close', () => {
        try {
            localStorage.setItem(CREDIT_KEY, '1');
        } catch {}
        const then = creditThen;
        creditThen = null;
        if (then) then();
    });
    let creditSeen = false;
    try {
        creditSeen = localStorage.getItem(CREDIT_KEY) === '1';
    } catch {}
    if (creditSeen) startFlow();
    else {
        creditThen = startFlow;
        show('credit');
    }
})();
