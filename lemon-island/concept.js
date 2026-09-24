(function(root) {
    'use strict';
    /* 부탁을 해결하기 전 「발견 확인」.
       choice = 하나 고르기, pick = 주장을 뒷받침하는 증거 조각을 모두 고르기(증거로 말하는 과학자).
       관찰 문장은 학생이 직접 적은 기록에서 뽑는다. */
    const find = (list, tag) => list.find(e => e.manual && e.tag === tag);
    const val = (rec, key) => rec?.entered?.[key];
    const hasTag = (all, qid, pred) => (all[qid] || []).some(e => e.manual && pred(e.tag));

    function build(id, all) {
        const mine = all[id] || [];
        if (id === 1) {
            const lit = find(mine, 'litmus'),
                btb = find(mine, 'btb'),
                mg = find(mine, 'mg');
            if (!lit || !btb || !mg) throw Error('세 가지 시험의 직접 기록이 모두 필요해요.');
            return {
                title: '에시드 박사의 확인 · 산의 공통점',
                observation: `내 기록: 푸른 리트머스 A ${val(lit,'A')} · D ${val(lit,'D')} / BTB A ${val(btb,'A')} · D ${val(btb,'D')} / 마그네슘: ${val(mg,'pop')} → ${val(mg,'gas')}`,
                questions: [{
                    type: 'choice',
                    prompt: '염산 HCl, 황산 H₂SO₄, 아세트산 CH₃COOH의 화학식에 공통으로 들어 있는 원소는?',
                    choices: ['수소(H)', '산소(O)', '탄소(C)'],
                    correct: 0,
                    explanation: '세 산 모두 H를 가지고 있어요. 산소는 염산에 없고, 탄소는 아세트산에만 있어요.'
                }, {
                    type: 'choice',
                    prompt: '마그네슘과 반응해 나온 기체를 확인한 방법과 결과로 알맞은 것은?',
                    choices: ['성냥불을 대자 ‘펑’ 소리를 내며 탔다 → 수소 기체', '향불을 대자 다시 타올랐다 → 산소 기체', '석회수가 뿌옇게 흐려졌다 → 이산화 탄소'],
                    correct: 0,
                    explanation: '수소 기체는 불꽃을 대면 ‘펑’ 소리를 내며 타요. 산소는 꺼져 가는 향불을 다시 타오르게 하고, 이산화 탄소는 석회수를 뿌옇게 해요.'
                }],
                summary: '산의 공통 성질: 푸른 리트머스 → 붉은색 · BTB → 노란색 · 마그네슘과 반응해 수소 기체(H₂) 발생. 세 산 모두 수소(H)를 가지고 있어요.'
            };
        }
        if (id === 2) {
            const mig = find(mine, 'migrate-acid'),
                con = find(mine, 'conduct');
            if (!mig || !con) throw Error('전도성과 이온 이동의 직접 기록이 필요해요.');
            return {
                title: '레몬 백작에게 보고하기 전에 · 산의 정체',
                observation: `내 기록: 붉은색이 ${val(mig,'side')}으로 넓어짐 · 아세트산 수용액 전구 ${val(con,'CH3COOH')} · 설탕물 전구 ${val(con,'sugar')}`,
                questions: [{
                    type: 'pick',
                    prompt: '“산의 공통적인 성질은 수소 이온(H⁺) 때문이다.” 이 주장을 뒷받침하는 증거를 모두 고르세요.',
                    options: [{
                        text: '전류를 흘리자 붉은색이 (−)극 쪽으로 넓어졌다 — 색을 바꾼 것은 양이온이다.',
                        ok: true,
                        mine: hasTag(all, 2, t => t === 'migrate-acid')
                    }, {
                        text: '염산·황산·아세트산의 이온화 모형에 공통으로 H⁺가 있었다.',
                        ok: true,
                        mine: hasTag(all, 2, t => t.startsWith('model-'))
                    }, {
                        text: '설탕물에서는 전구가 켜지지 않았다.',
                        ok: false,
                        mine: true
                    }, {
                        text: '아세트산 수용액에서는 전구가 희미하게 켜졌다.',
                        ok: false,
                        mine: true
                    }],
                    explanation: '붉은색이 (−)극으로 움직였다는 것은 색을 바꾼 이온이 양이온이라는 뜻이고, 모든 산의 모형에 공통으로 있는 양이온이 H⁺예요. 설탕물·아세트산 결과는 참이지만 ‘무엇이 산의 성질을 만드는가’를 직접 보여 주지는 않아요.'
                }, {
                    type: 'choice',
                    prompt: '아세트산 수용액의 전구가 희미했던 까닭은?',
                    choices: ['물에 녹아 일부만 이온화해서 이온이 적기 때문에', '아세트산에는 수소가 없기 때문에', '아세트산 수용액에는 음이온이 없기 때문에'],
                    correct: 0,
                    explanation: '아세트산은 물에 녹아도 일부만 이온화하는 약산이에요. 전류를 나르는 이온이 적어 전구가 희미해요.',
                    analogy: '🍬 사탕 봉지 네 개를 뜯는다고 해 봐요. 강산은 네 봉지를 모두 뜯어 사탕(이온)을 쏟아 놓고, 약산은 한 봉지만 뜯어요. 전류를 나르는 건 봉지 밖으로 나온 사탕이에요. 그래서 약산의 전구가 희미해요.'
                }],
                summary: '산 = 물에 녹아 수소 이온(H⁺)을 내놓는 물질. 강산(염산·황산·질산)은 대부분, 약산(아세트산)은 일부만 이온화해요.'
            };
        }
        if (id === 3) {
            const mig = find(mine, 'migrate-base');
            const ind = mine.filter(e => e.manual && /^ind-(redLitmus|btb|pp)$/.test(e.tag));
            if (!mig || !ind.length) throw Error('지시약과 이온 이동의 직접 기록이 필요해요.');
            return {
                title: '베이스 박사의 확인 · 염기의 정체',
                observation: `내 기록: ${ind.map(e=>e.label.replace(/로 네 용액 검사$/,'')+' → 용액 A '+val(e,'A')).join(' / ')} · 푸른색이 ${val(mig,'side')}으로 넓어짐`,
                questions: [{
                    type: 'choice',
                    prompt: '염기의 공통적인 성질을 만드는 입자는?',
                    choices: ['OH⁻ (수산화 이온)', 'Na⁺ (나트륨 이온)', 'H⁺ (수소 이온)'],
                    correct: 0,
                    explanation: '푸른색이 (+)극 쪽으로 움직였으니 색을 바꾼 것은 음이온이에요. 수산화 나트륨·수산화 칼륨·수산화 칼슘에 공통으로 있는 음이온이 OH⁻예요.'
                }, {
                    type: 'choice',
                    prompt: '염기를 찾을 때 푸른 리트머스 종이가 도움이 되지 않는 까닭은?',
                    choices: ['염기에서 색이 변하지 않아 중성과 구별되지 않기 때문에', '염기에 닿으면 종이가 녹아 버리기 때문에', '푸른 리트머스는 산에만 써야 한다는 규칙 때문에'],
                    correct: 0,
                    explanation: '푸른 리트머스는 산성에서만 붉게 변해요. 염기와 중성 모두 푸른색 그대로라서 둘을 가려내지 못해요.'
                }, {
                    type: 'choice',
                    prompt: '암모니아수가 약염기인 까닭은?',
                    choices: ['물과 반응해 OH⁻를 조금만 내놓기 때문에', 'OH⁻를 전혀 내놓지 않기 때문에', '물에 전혀 녹지 않기 때문에'],
                    correct: 0,
                    explanation: '암모니아(NH₃)는 물과 반응해 NH₄⁺와 OH⁻를 만들지만 일부만 반응해요. 그래서 OH⁻가 적은 약염기예요.'
                }],
                summary: '염기 = 물에 녹아 수산화 이온(OH⁻)을 내놓는 물질. 붉은 리트머스 → 푸른색 · BTB → 파란색 · 페놀프탈레인 → 붉은색.'
            };
        }
        if (id === 4) {
            const r20 = find(mine, 'mix-20'),
                r40 = find(mine, 'mix-40');
            if (!r20 || !r40) throw Error('20 mL와 40 mL의 직접 기록이 필요해요.');
            return {
                title: '레몬 백작에게 보고하기 전에 · 중화병의 정체',
                observation: `내 기록: 염산 20 mL → ${val(r20,'color')} · 물 ${val(r20,'water')}개 · 남은 H⁺ ${val(r20,'H')}, OH⁻ ${val(r20,'OH')} / 40 mL → ${val(r40,'color')} · 남은 H⁺ ${val(r40,'H')}개 · 온도 ${val(r20,'temp')} °C → ${val(r40,'temp')} °C`,
                questions: [{
                    type: 'choice',
                    prompt: '염산 20 mL를 넣었을 때 초록색(중성)이 된 까닭은?',
                    choices: ['H⁺와 OH⁻가 같은 수만큼 만나 모두 물이 되었기 때문에', 'Na⁺와 Cl⁻가 사라졌기 때문에', 'BTB가 모두 반응해 없어졌기 때문에'],
                    correct: 0,
                    explanation: 'H⁺ 2개와 OH⁻ 2개가 만나 물 2개가 되었어요. 산성·염기성을 만드는 이온이 모두 물이 되어 중성이에요.',
                    analogy: '💃 짝 짓기 춤을 떠올려 봐요. H⁺ 한 명과 OH⁻ 한 명이 짝이 되어 무대(물)로 나가요. 짝이 딱 맞으면 남는 사람이 없고, 한쪽이 많으면 그쪽 사람들이 남아 분위기(액성)를 정해요.'
                }, {
                    type: 'choice',
                    prompt: 'Na⁺와 Cl⁻는 반응 뒤 어디에 있나요?',
                    choices: ['물속에 이온 상태로 그대로 있다', '서로 붙어 소금 알갱이가 되어 가라앉는다', '반응하면서 사라진다'],
                    correct: 0,
                    explanation: 'Na⁺와 Cl⁻는 반응에 참여하지 않는 구경꾼 이온이에요. 물을 증발시켜야 비로소 염화 나트륨 고체로 남아요.'
                }, {
                    type: 'pick',
                    prompt: '레몬 아이들에게 중화병이 생긴 과정을 설명하는 조각을 모두 고르세요.',
                    options: [{
                        text: '비눗방울 물질은 물에 녹아 OH⁻를 내놓는다.',
                        ok: true,
                        mine: hasTag(all, 3, t => /^(ind-|migrate-base|model-)/.test(t))
                    }, {
                        text: 'H⁺와 OH⁻가 만나면 물이 된다.',
                        ok: true,
                        mine: hasTag(all, 4, t => t === 'mix-20')
                    }, {
                        text: '새콤의 즙은 푸른 리트머스를 붉게 바꾸지 못했다 — 산성을 잃었다.',
                        ok: true,
                        mine: hasTag(all, 0, t => t === 'juice')
                    }, {
                        text: '산 수용액에 마그네슘을 넣으면 수소 기체가 나온다.',
                        ok: false,
                        mine: hasTag(all, 1, t => t === 'mg')
                    }, {
                        text: '아세트산 수용액은 전구를 희미하게 켠다.',
                        ok: false,
                        mine: hasTag(all, 2, t => t === 'conduct')
                    }],
                    explanation: '비눗방울의 OH⁻가 아이들 몸속의 H⁺와 만나 물이 되면서 산성이 약해졌어요(새콤의 즙 결과). 마그네슘·전구 결과는 참이지만 이 사건의 원인과는 관계가 없어요.'
                }],
                summary: '중화 반응: H⁺ + OH⁻ → H₂O. 같은 수만큼 만나면 중성, 남는 쪽이 액성을 정해요. 구경꾼 이온(Na⁺·Cl⁻)은 물속에 그대로 있어요. 반응하면 열이 나와 온도가 올라가요.'
            };
        }
        if (id === 5) {
            const cure = find(mine, 'cure'),
                unk = find(mine, 'unknown');
            if (!cure || !unk) throw Error('치료와 시료 판정의 직접 기록이 필요해요.');
            return {
                title: '보라 이장의 확인 · 마을을 지키는 방법',
                observation: `내 기록: 치료제 ${val(cure,'drops')}방울 → pH ${val(cure,'pH')} (${val(cure,'btb')}) / 시료 ① ${val(unk,'u1')} · ② ${val(unk,'u2')} · ③ ${val(unk,'u3')}`,
                questions: [{
                    type: 'choice',
                    prompt: '치료제 첫 방울을 넣었을 때 pH가 7 근처까지만 내려간 까닭은?',
                    choices: ['치료제의 H⁺가 몸속에 남은 OH⁻와 먼저 만나 물이 되었기 때문에', '치료제가 한 방울로는 녹지 않았기 때문에', 'pH 측정기가 늦게 반응했기 때문에'],
                    correct: 0,
                    explanation: '새콤의 몸속에는 비눗방울에서 온 OH⁻가 남아 있었어요. 첫 방울의 H⁺는 이 OH⁻를 중화하는 데 쓰이고, 그다음 방울부터 H⁺가 남아 산성이 돼요.'
                }, {
                    type: 'choice',
                    prompt: '치료 목표를 중성(pH 7)이 아니라 pH 2.5~3.5로 잡은 까닭은?',
                    choices: ['레몬 종족은 알맞은 산성일 때 건강하기 때문에', '중성은 언제나 몸에 해롭기 때문에', 'pH는 낮을수록 좋기 때문에'],
                    correct: 0,
                    explanation: '건강한 상태는 생물마다 달라요. 레몬 종족에게는 알맞은 산성이, 사람의 혈액에는 약한 염기성(pH 7.4 정도)이 알맞아요. 너무 강한 산성도 해로워요.'
                }, {
                    type: 'choice',
                    prompt: '페놀프탈레인만으로 시료 ①과 ②를 구별할 수 없었던 까닭은?',
                    choices: ['산성과 중성에서 모두 무색이기 때문에', '두 시료가 모두 염기성이기 때문에', '페놀프탈레인이 시료와 섞이지 않기 때문에'],
                    correct: 0,
                    explanation: '페놀프탈레인은 염기성에서만 붉게 변해요. 산성과 중성은 메틸 오렌지(산성 빨간색, 중성 노란색)로 가려낼 수 있어요.'
                }],
                summary: 'pH 7은 중성, 7보다 작으면 산성, 크면 염기성. 한 지시약으로 가려내지 못하면 다른 지시약과 함께 봐요.'
            };
        }
        throw Error('이 부탁은 발견 확인이 없어요.');
    }
    root.IslandConcept = {
        build,
        has: id => id >= 1
    };
})(window);
