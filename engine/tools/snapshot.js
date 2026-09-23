/* 섬 모듈의 「겉이 아니라 속」을 찍어 두 판본을 비교하는 스냅숏.
   같은 페이지 두 개(원본 배포본 / 새로 조립한 것)에서 돌려 해시가 같으면 계산·문구·그림이 모두 같다는 뜻.
   그림 안의 자동 증가 id(serial)는 판본마다 달라질 수 있어 지우고 비교한다. */
(async () => {
  const norm = s => String(s)
    .replace(/id="[^"]*\d+[^"]*"/g, 'id="#"')
    .replace(/url\(#[^)]*\)/g, 'url(#)')
    .replace(/(xlink:)?href="#[^"]*"/g, 'href="#"')
    .replace(/\s+/g, ' ');

  const out = {};
  const M = window.IslandModel, C = window.IslandCircuit, Mi = window.IslandMissions,
        P = window.IslandPlay, Co = window.IslandConcept;

  // 1) 퀘스트 데이터
  out.quests = M.quests.map(q => [q.id, q.name, q.npc, q.animal, q.place, q.goal, q.story, q.type, q.record]);

  // 2) 회로 계산 — 조건을 촘촘히 훑는다
  const calc = [];
  for (const type of ['series', 'parallel']) {
    for (const v of [0, 1.5, 3, 6, 9, 12]) {
      for (const r1 of [10, 20, 30]) {
        for (const r2 of [10, 20, 30]) {
          for (const count of [1, 2]) {
            for (const on1 of [true, false]) {
              for (const on2 of [true, false]) {
                for (const layout of ['standard', 'festival']) {
                  calc.push(M.circuit({ type, v, r1, r2, count, on1, on2, layout }));
                }
              }
            }
          }
        }
      }
    }
  }
  out.circuit = calc;

  // 3) 회로 그림(기하 + SVG)
  const draw = [];
  for (const id of [0, 1, 2, 3, 4]) {
    for (const type of ['series', 'parallel']) {
      for (const count of [1, 2]) {
        const p = { type, v: 6, r1: 10, r2: 20, count, on1: true, on2: false, layout: id === 4 ? 'festival' : 'standard' };
        draw.push(norm(JSON.stringify(C.plan ? C.plan(p) : null)));
        draw.push(norm(C.svg(p, { picture: true, names: P.names(id), sceneTitle: P.titles[id], sceneId: id })));
        draw.push(norm(C.svg(p, { names: P.names(id), sceneId: id })));
      }
    }
  }
  out.draw = draw;

  // 4) 미션 · 조작 · 개념 확인
  out.missions = [0, 1, 2, 3, 4].map(id => [Mi.steps(id), norm(JSON.stringify(Mi.checks ? Mi.checks(id) : null))]);
  out.play = [0, 1, 2, 3, 4].map(id => [P.names(id), P.titles[id]]);
  out.concept = [0, 1, 2, 3, 4].map(id => norm(JSON.stringify(Co.build(id, []))));

  const text = JSON.stringify(out);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return {
    hash,
    length: text.length,
    parts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, JSON.stringify(v).length]))
  };
})()
