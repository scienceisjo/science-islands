/* 섬 모듈의 「겉이 아니라 속」을 찍어 두 판본을 비교하는 스냅숏 (전기 섬 기준).
   사용: 페이지에서  await eval(await (await fetch('snapshot.js')).text())
   같은 해시 = 계산·문구·그림이 모두 같다. 그림 속 자동 증가 id 는 지우고 비교한다. */
(async () => {
  const norm = s => String(s)
    .replace(/id="[^"]*\d+[^"]*"/g, 'id="#"')
    .replace(/url\(#[^)]*\)/g, 'url(#)')
    .replace(/(xlink:)?href="#[^"]*"/g, 'href="#"')
    .replace(/\s+/g, ' ');
  const out = {};
  const M = window.IslandModel, C = window.IslandCircuit, Mi = window.IslandMissions,
        P = window.IslandPlay, Co = window.IslandConcept;
  out.quests = M.quests.map(q => [q.id, q.name, q.npc, q.animal, q.place, q.goal, q.story, q.type, q.record]);
  const calc = [];
  for (const type of ['series', 'parallel']) for (const v of [0, 1.5, 3, 6, 9, 12]) for (const r1 of [10, 20, 30])
    for (const r2 of [10, 20, 30]) for (const count of [1, 2]) for (const on1 of [true, false])
      for (const on2 of [true, false]) for (const layout of ['standard', 'festival'])
        calc.push(M.circuit({ type, v, r1, r2, count, on1, on2, layout }));
  out.circuit = calc;
  const draw = [];
  for (const id of [0, 1, 2, 3, 4]) for (const type of ['series', 'parallel']) for (const count of [1, 2]) {
    const p = { type, v: 6, r1: 10, r2: 20, count, on1: true, on2: false, layout: id === 4 ? 'festival' : 'standard' };
    draw.push(norm(JSON.stringify(C.plan ? C.plan(p) : null)));
    draw.push(norm(C.svg(p, { picture: true, names: P.names(id), sceneTitle: P.titles[id], sceneId: id })));
    draw.push(norm(C.svg(p, { names: P.names(id), sceneId: id })));
  }
  out.draw = draw;
  const TAGS = [[], ['open'], ['open', 'closed'], ['voltage-3', 'voltage-6', 'resistance-10', 'resistance-20', 'target'],
                ['pair-10', 'pair-20', 'broken'], ['both-20', 'one-20'], ['festival']];
  const S = id => ({ id, type: 'series', count: 1, v: 6, r1: 10, r2: 20, on1: true, on2: true, view: 'circuit', probe: 'source' });
  out.missions = [0, 1, 2, 3, 4].map(id => [Mi.steps(id), TAGS.map(t => Mi.checks({ id }, t)),
      TAGS.map(t => [Mi.hint(S(id), t, true), Mi.hint(S(id), t, false)])]);
  out.play = [0, 1, 2, 3, 4].map(id => [P.names(id), P.titles[id], norm(P.controls(S(id)))]);
  const EV = [{ values: { source: 6, total: 0.3, i1: 0.3, i2: 0.3, v1: 3, v2: 3, branch1: 3, branch2: 3, on1: true, on2: true },
               tag: 'closed', label: '표본', manual: true }];
  out.concept = [0, 1, 2, 3, 4].map(id => { try { return norm(JSON.stringify(Co.build(id, EV))); }
                                            catch (e) { return 'ERR:' + e.message; } });
  const text = JSON.stringify(out);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, length: text.length };
})()
