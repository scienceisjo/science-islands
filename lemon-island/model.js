(function(root) {
    'use strict';
    /* 레몬 백작의 부탁 — 이야기·퀘스트·화학 규칙·저장.
       화학 규칙은 스토리바이블 §5 과학 수정표를 따른다:
       · 혼합은 「같은 농도, 10 mL = 이온 한 쌍」, 물 = min(H⁺, OH⁻), 남는 쪽이 액성
       · 구경꾼 이온(Na⁺·Cl⁻ 등)은 반응 뒤에도 물속에 그대로
       · 강염기 NaOH·KOH·Ca(OH)₂, 약염기 암모니아수, 약산 아세트산 */
    const KEY = 'lemon-island-journal-v1';

    const cast = [{
            id: 0,
            name: '레몬 백작',
            short: '레몬',
            icon: '🍋',
            voice: 2,
            role: '레몬 왕국의 백작'
        },
        {
            id: 1,
            name: 'Dr.에시드',
            short: '에시드',
            icon: '🧪',
            voice: 0,
            role: '산을 연구하는 과학자'
        },
        {
            id: 2,
            name: 'Dr.베이스',
            short: '베이스',
            icon: '🫧',
            voice: 1,
            role: '중화병을 연구하는 과학자'
        },
        {
            id: 3,
            name: '보라 이장',
            short: '보라',
            icon: '🏡',
            voice: 4,
            role: '경계 마을의 이장'
        },
        {
            id: 4,
            name: '새콤',
            short: '새콤',
            icon: '🍋',
            voice: 3,
            role: '기운을 잃은 레몬 아이'
        }
    ];

    /* x, z = 그 부탁을 주는 곳(주민이 서는 자리). 같은 주민이라도 부탁마다 자리가 다르다. */
    const quests = [{
            id: 0,
            npc: 0,
            name: '시들어 가는 새콤',
            place: '레몬 성',
            x: -13.5,
            z: -9.4,
            goal: '세 가지 즙에 푸른 리트머스 종이를 대 보고 색을 비교해요.',
            concept: '관찰 · 산성의 성질',
            reward: '레몬 왕실 배지',
            gift: '🏅',
            lines: [
                [0, '안녕? 내가 ‘레몬 더 산(acid)’ 백작이야. 그냥 레몬이라고 불러 주렴. 내가 앞으로 펼쳐질 이야기의 시작이자 끝이 될 거야.'],
                [0, '우선 산(acid) 대륙의 레몬 성에 무사히 온 걸 환영하네! 지구에서 온 호기심 많은 손님이라지? 내 고민을 함께 풀어 주지 않겠나?'],
                [0, '우리 레몬 종족은 몸속이 새콤한 산성일 때 기운이 나. 그런데 요즘 경계 마을 아이들이 하나둘 시들어 가고 있어. 가장 기운이 없는 새콤이는 성 안 의무실로 데려왔다네.'],
                [4, '백작님… 요즘 자꾸 힘이 없어요. 제 노란색도 흐려졌어요.'],
                [0, '먼저 새콤이 몸에 무슨 일이 생겼는지 살펴보세. 왕궁 의사가 쓰는 푸른 리트머스 종이를 줄 테니, 건강한 레몬 즙과 새콤이의 즙, 그리고 샘물을 비교해 주게.']
            ],
            done: [
                [0, '새콤이의 즙은 푸른 리트머스를 붉게 바꾸지 못했어… 샘물과 똑같아. 산성이 약해진 거야!'],
                [0, '산성을 회복할 수 있는 궁극의 약, 산성 치료제가 필요하네. 마침 그걸 연구하는 사람이 있다니 Dr.에시드를 찾아가 보게! 분명 도움이 될 거야. 성문을 나가 길을 따라 내려가면 과수원 옆에 호박색 지붕의 연구실이 있다네.']
            ],
            again: '새콤이의 즙을 다시 살펴볼 텐가? 비교할 기준이 있으면 차이가 잘 보이지.'
        },
        {
            id: 1,
            npc: 1,
            name: '에시드 박사의 조수 시험',
            place: '에시드 연구실',
            x: -10,
            z: 6.5,
            goal: '지시약으로 산을 골라내고, 산과 마그네슘에서 나오는 기체를 확인해요.',
            concept: '지시약 · 산과 금속의 반응',
            reward: '조수 실험 가운',
            gift: '🥼',
            lines: [
                [1, '어이, 꼬맹이! 너도 소문을 듣고 왔구나. 난 산성 치료제를 만들고 있는 Dr.에시드라고 해. 마침 조수가 필요했지. 같이 산성 물질을 연구해 보지 않겠나?'],
                [1, '지구에서 왔다고? 내 연구실에선 누구나 조수부터 시작이야! 치료제를 만들려면 먼저 산(acid)을 가려낼 줄 알아야 하는데… 어젯밤 버블 왕국 쪽에서 비눗방울 섞인 돌풍이 불어와 도구가 연구실과 전기 실험대 둘레로 다 날아가 버렸지 뭔가.'],
                [1, '실험할 때마다 필요한 도구를 찾아서 나한테 건네주게. 도구를 잘 챙기고 내 테스트 셋을 통과하면 정식 조수로 인정하지! 용액 A·B·C·D 가운데 산을 가려낼 테니, 먼저 푸른 리트머스 종이부터 찾아와 주겠나?']
            ],
            done: [
                [1, '테스트를 모두 통과했군. 자네를 정식 조수로 인정하마! 산 수용액은 푸른 리트머스를 붉게, BTB를 노랗게 바꾸고, 마그네슘과 만나면 수소 기체(H₂)를 내놓는군.'],
                [1, '염산 HCl, 황산 H₂SO₄, 아세트산 CH₃COOH… 모두 수소(H)를 갖고 있지. 치료제의 실마리는 수소일 게야! 저쪽 전기 실험대에서 계속하자고.']
            ],
            again: '조수 시험을 다시 볼 텐가? 지시약은 몇 번을 써도 정직하지.'
        },
        {
            id: 2,
            npc: 1,
            name: '산의 정체를 밝혀라',
            place: '에시드의 전기 실험대',
            x: -3.5,
            z: 10,
            goal: '전류를 흘려 산의 공통적인 성질을 만드는 이온을 찾고, 이온화 모형을 만들어요.',
            concept: '전해질 · 이온의 이동 · 강산과 약산',
            reward: '이온 탐지 돋보기',
            gift: '🔎',
            lines: [
                [1, '밤새 실험했더니 피곤하구먼. 몸풀기로 우리가 알아낸 산의 공통점부터 훑어보자. 푸른 리트머스는 붉게, BTB는 노랗게, 금속을 넣으면 수소 기체!'],
                [1, '산에 공통으로 들어 있는 수소는 물에 녹으면 이온 상태일 거야. 산 수용액에 전기가 흐른다면 전해질이니 수소 이온을 찾을 수 있겠지!'],
                [1, '오늘의 체크리스트야. 전기가 흐르는지 체크하기, 전류를 흘려 움직이는 이온 찾기, 그리고 산의 이온화 모형과 반응식 완성하기!'],
                [1, '정식 조수니까 이번에도 도구 담당은 자네야! 먼저 간이 전기 전도 장치를 찾아와 주게. 전기 실험대 앞쪽 풀밭 어딘가에 있을 게야.']
            ],
            done: [
                [1, '산은 물에 녹아 수소 이온(H⁺)과 음이온으로 나뉘어. 이게 ‘산의 이온화’지! 염산·황산·질산처럼 대부분 이온화하면 강산, 아세트산처럼 일부만 이온화하면 약산이고.'],
                [1, '우린 오늘 산(acid)에 대해 꽤 많은 걸 연구해 냈다고! 정리해서 레몬 백작에게 보고하자. 네가 모은 증거로 연구 보고서를 써 주게!']
            ],
            again: '전기 실험대는 언제든 비어 있어. 이온이 움직이는 걸 다시 볼 텐가?'
        },
        {
            id: 3,
            npc: 2,
            name: '비눗방울 속 수상한 물질',
            place: '베이스 연구실',
            x: 12.5,
            z: -7.5,
            goal: '염기를 알려 주는 지시약을 골라 쓰고, 염기의 성질을 만드는 이온을 찾아요.',
            concept: '염기 · 수산화 이온 · 강염기와 약염기',
            reward: '비눗방울 채집병',
            gift: '🫧',
            lines: [
                [2, '안녕? 내가 Dr.베이스야. 네가 레몬이 보낸 과학자구나! 난 염기 대륙의 환경 호르몬을 연구하고 있어. 조수가 필요한데, 같이 연구하지 않을래?'],
                [2, '산성 치료제의 실마리는 수소 이온(H⁺)이었구나! 에시드 박사의 보고서 덕분에 연구 방향이 잡혔어. 경계 마을로 날아오는 비눗방울 물질은 산과 굉장히 비슷하면서도 달라. 매우 흥미로워!'],
                [2, '에시드 박사의 연구 과정을 따라 실험 목록을 짜 봤어. 염기성 테스트, 전기 전도도 확인, 이온 확인, 이온화 모형 만들기. 에시드 박사와 함께 연구한 과학자라니 조수 자격이 있는지 테스트해 볼게. 이번엔 어떤 지시약을 쓸지 네가 골라 봐!']
            ],
            done: [
                [2, '이제 좀 알 것 같아! 염기는 물에 녹아 수산화 이온(OH⁻)을 내놓고, 이온화된 정도에 따라 강염기와 약염기로 나뉘어. 붉은 리트머스를 푸르게, BTB를 파랗게 바꾸는 것도 OH⁻ 때문이야.'],
                [2, '그런데 이상한 게 있어. 레몬 왕국 사람들에게서는 H⁺가 검출되는데, 중화병에 걸린 아이들에게서만 특이하게 OH⁻가 나왔어. 병이 깊을수록 수치도 높고. 비눗방울 물질에서도 OH⁻가 잔뜩 나왔지.'],
                [2, '비눗방울 속 OH⁻가 범인인 것 같아. 그런데 왜 산 대륙 아이들만 아플까? 혼합 실험대에서 밝혀 보자구!']
            ],
            again: '염기 실험을 다시 해 볼래? 이번엔 다른 지시약도 써 봐.'
        },
        {
            id: 4,
            npc: 2,
            name: '중화병의 원인',
            place: '베이스의 혼합 실험대',
            x: 17.5,
            z: -2.5,
            goal: '염기성 용액에 산을 10 mL씩 넣으며 색·온도와 남은 이온을 기록해요.',
            concept: '중화 반응 · 반응한 이온과 남은 이온',
            reward: '중화 반응 관찰 기록장',
            gift: '📒',
            lines: [
                [2, '레몬 아이들의 체액은 산성이고, 비눗방울 물질은 염기성이야. 오늘은 둘을 만나게 해 볼 거야. 산과 염기를 반응시키고 모형으로 나타내 보자!'],
                [2, '같은 농도의 수산화 나트륨 수용액과 묽은 염산을 모형으로 쓸게. 수산화 나트륨 수용액 20 mL에 BTB를 떨어뜨리고, 염산을 10 mL씩 넣어 볼래? 온도는 손 대신 온도계로 재자.'],
                [2, '입자 모형에서는 용액 10 mL에 이온을 한 쌍씩 그려. 무엇이 반응하고 무엇이 남는지 잘 봐 줘!']
            ],
            done: [
                [2, '알아냈어! H⁺와 OH⁻가 같은 수만큼 만나면 모두 물(H₂O)이 되고 중성이 돼. 어느 한쪽이 남으면 그쪽의 성질이 남고. 산과 염기가 만나 산성과 염기성이 함께 사라지는 거야!'],
                [2, '레몬 아이들이 비눗방울을 만지며 놀 때, 산성을 지켜 주던 몸속 H⁺가 비눗방울의 OH⁻와 만나 물이 되면서 산성을 잃은 거야. 그래서 기운이 빠지고 점점 모습이 변했어. 이게 중화병의 정체야!'],
                [2, '중화병에서 비롯된 반응이니 ‘중화 반응’이라고 부르자. 아이들이 아직 레몬 모습인 걸 보니 늦지 않았어! 하지만 OH⁻에 계속 닿으면 완전히 변해 버릴 거야. 어서 레몬에게 보낼 중화병 보고서를 써 줄래?']
            ],
            again: '혼합 실험을 다시 볼래? 이번엔 입자 하나하나를 세어 봐.'
        },
        {
            id: 5,
            npc: 3,
            name: '경계 마을을 지켜라',
            place: '경계 마을 광장',
            x: 12.5,
            z: 5,
            goal: '새콤의 산성을 되찾고, 지시약 사용법을 정리해 수상한 시료를 가려내요.',
            concept: 'pH · 여러 가지 지시약 · 새로운 상황에 적용',
            reward: '경계 마을 명예 주민증',
            gift: '🏡',
            lines: [
                [3, '어서 와요, 과학자님. 저는 경계 마을 이장 보라예요. 저희 버블 사람들은 비눗방울이 아이들을 아프게 할 줄 몰랐어요… 정말 미안해요.'],
                [3, '에시드 박사님의 산성 치료제가 도착했어요. 베이스 박사님 말씀으로는 새콤이의 체액 모형으로 알맞은 양을 찾아야 한대요. 너무 적어도, 너무 많아도 안 된대요.'],
                [3, '그리고 마을 사람들이 스스로 염기성 물질을 알아볼 수 있게 지시약 사용법을 알려 주세요. 마을 창고에서 정체를 모르는 시료도 나왔거든요.']
            ],
            done: [
                [4, '와, 몸이 다시 새콤해졌어요! 노란색도 돌아왔어요!'],
                [3, '이 지시약 표만 있으면 우리 마을도 스스로 지킬 수 있겠어요. 비눗방울은 장갑을 끼고 즐기면 되겠네요!'],
                [3, '마지막으로 마을 사람들에게 남길 안내문을 써 주세요. 안내문이 완성되면 두 왕국이 함께하는 비눗방울 축제를 열어요!']
            ],
            again: '마을 창고에 시료가 더 있어요. 다시 살펴봐 주실래요?'
        }
    ];

    /* Dr.에시드의 흩어진 실험 도구 — 실험 단계(step = labs checks 순서)마다 하나.
       도구를 찾아 에시드에게 건네야 그 단계 실험대가 열린다(교사 시연은 예외). x, z = 섬 위 자리 */
    const tools = [{
            id: 'litmus',
            quest: 1,
            step: 0,
            name: '푸른 리트머스 종이',
            icon: '📘',
            x: -15.6,
            z: 10.4,
            where: '연구실 왼쪽 앞 풀밭',
            ask: '백작님 리트머스 종이는 새콤이 즙을 보느라 다 썼을 테고… 내 푸른 리트머스 종이를 찾아와 주겠나? 연구실 왼쪽 앞 풀밭 어딘가에 떨어져 있을 게야.',
            thanks: '오, 푸른 리트머스 종이로군! 조수의 기본은 도구 챙기기지. 자, 이걸로 앞에 있는 용액들 중 산성을 띠는 용액을 찾아보게나.'
        },
        {
            id: 'btb',
            quest: 1,
            step: 1,
            name: 'BTB 용액',
            icon: '💧',
            x: -12.9,
            z: 11.8,
            where: '연구실 앞 길 끝',
            ask: '이번엔 BTB 용액이라는 지시약을 써 볼 거야. 초록색 병인데, 연구실 앞쪽으로 굴러갔을 게야. 찾아와 주겠나?',
            thanks: 'BTB 용액이군, 고맙네! 지시약은 용액의 성질을 구별할 때 쓰는 거야. 산인지 알아보자는 거지!'
        },
        {
            id: 'mg',
            quest: 1,
            step: 2,
            name: '마그네슘 조각과 성냥',
            icon: '🔥',
            x: -9.6,
            z: 2.4,
            where: '연구실 오른쪽 위 갈림길 옆',
            ask: '이번엔 산 수용액에 금속을 넣어 볼 차례야. 네 시험관 모두에 넣어 비교할 테니, 연구실 오른쪽 위 갈림길로 날아간 마그네슘 조각과 성냥을 찾아와 주게!',
            thanks: '마그네슘 조각과 성냥이군, 고맙네! 네 시험관에 마그네슘을 넣고, 기체가 나오면 성냥불을 대 보게. 불은 조심해서 다루고!'
        },
        {
            id: 'conduct',
            quest: 2,
            step: 0,
            name: '간이 전기 전도 장치',
            icon: '💡',
            x: -0.8,
            z: 13.2,
            where: '전기 실험대 앞(아래쪽) 풀밭',
            ask: '먼저 간이 전기 전도 장치를 찾아와 주게. 전기 실험대 앞쪽 풀밭 어딘가에 있을 게야.',
            thanks: '간이 전기 전도 장치로군! 산 수용액에 전기가 흐르는지부터 체크해 보자고!'
        },
        {
            id: 'power',
            quest: 2,
            step: 1,
            name: '전원 장치와 질산 칼륨 종이',
            icon: '🔋',
            x: 1,
            z: 8.4,
            where: '전기 실험대 오른쪽 강가',
            ask: '전류를 흘리려면 전원 장치와 질산 칼륨 종이가 있어야지. 전기 실험대 오른쪽 강가에 있을 게야. 찾아와 주겠나?',
            thanks: '전원 장치와 질산 칼륨 종이까지! 질산 칼륨 수용액에 적신 푸른 리트머스 종이 가운데에 묽은 염산을 적신 실을 올리고, 전극을 연결해 보세.'
        },
        {
            id: 'model',
            quest: 2,
            step: 2,
            name: '입자 모형 상자',
            icon: '🧩',
            x: -7.6,
            z: 15,
            where: '전기 실험대 왼쪽 아래',
            ask: '입자 모형 상자가 어디 갔더라… 전기 실험대 왼쪽 아래를 찾아봐 주겠나?',
            thanks: '입자 모형 상자로군! 염산은 내가 예시로 먼저 보여 주지. 입자의 종류와 개수, 전하의 합을 잘 살펴보게.'
        }
    ];

    /* 필수 기록 3편 — quests 를 다 해결해야 서명할 수 있다. after = 서명 뒤 이어지는 장면 */
    const entries = [{
            title: '레몬 백작에게 보내는 연구 보고서',
            quests: [1, 2],
            icon: '🧪',
            story: '에시드 박사와 알아낸 산의 비밀을 레몬 백작에게 보고해요. 무엇을 보았는지, 왜 그렇게 판단했는지 내 증거로 말해요.',
            labels: ['산을 가려낸 방법', '산의 성질을 만드는 입자와 그 증거', '처음 보는 용액에 적용하기'],
            questions: [
                '네 용액 중 산을 어떻게 가려냈나요? 푸른 리트머스와 BTB에서 각각 어떤 색을 보았는지 적고, 마그네슘을 넣었을 때 생긴 기체를 무엇으로 확인했는지 적어 주세요.',
                '전류를 흘렸을 때 붉은색은 어느 극 쪽으로 넓어졌나요? 이 관찰과 이온화 모형을 근거로, 산의 공통적인 성질을 만드는 입자가 무엇인지 설명해 주세요.',
                '처음 보는 용액 X가 푸른 리트머스를 붉게 바꾸었지만 전구는 희미하게 켰어요. X는 강산과 약산 중 어느 쪽일까요? 이온화 모형으로 이유를 설명해 주세요.'
            ],
            starts: [
                '푸른 리트머스를 대 보니 … 용액이 붉게 변했고, BTB는 … 색이 되었어요. 마그네슘을 넣자 생긴 기체에 성냥불을 대었더니 …',
                '전류를 흘리자 붉은색이 … 극 쪽으로 넓어졌어요. 그래서 붉은색을 만든 이온은 … 전하를 띤 …이고, 모형에서도 …',
                'X는 …이라고 생각해요. 왜냐하면 전구가 희미하다는 것은 … 이고, 모형으로 그리면 …'
            ],
            after: [
                [0, 'Dr.에시드! 오랜만일세! 산성 치료제의 뚜렷한 실마리를 찾았다지? 고생이 많았네. 어서 알려 주게나.'],
                [1, '쉽지는 않은 일이었지. 결과는 심플하네! 물에 녹을 때 이온화되는 수소 이온(H⁺)이 산을 결정한다네. H⁺가 얼마나 잘 이온화되느냐에 따라 강산과 약산으로 나뉘고. H⁺를 잘 다룬다면 산성 치료제를 만드는 건 시간문제일세!'],
                [0, '훌륭해, 훌륭해! 이제 산성 치료제를 완성할 수 있겠어. 자네는 정말 대단한 과학자야, 고맙네! 그런데… 부탁을 하나만 더 해도 될까?'],
                [0, '경계 마을의 Dr.베이스를 찾아가 주게. 중화병을 연구하는 내 오랜 친구야. 경계 마을은 원래 평화로운 곳이었는데, 어느 날 어린 레몬들에게 중화병이 돌기 시작했네. 처음엔 기력이 떨어지고 탈수 증상이 오다가 점점 모습이 변해 가는 끔찍한 병이지.'],
                [0, 'Dr.베이스는 염기 대륙의 환경 호르몬이 원인이라고 보고 연구하고 있어. 에시드 박사의 보고서를 전해 주고 연구를 도와주게나.']
            ],
            nextQuest: 3
        },
        {
            title: '중화병 연구 보고서',
            quests: [3, 4],
            icon: '🫧',
            story: '비눗방울 물질의 정체와 혼합 실험의 결과로, 레몬 아이들이 왜 기운을 잃었는지 밝혀요.',
            labels: ['비눗방울 물질의 정체', '혼합 실험의 입자 이야기', '중화병이 생긴 까닭'],
            questions: [
                '비눗방울 물질 같은 염기를 어떤 지시약으로 확인했나요? 전류를 흘렸을 때 푸른색이 어느 극 쪽으로 넓어졌는지와 함께, 염기의 성질을 만드는 입자를 적어 주세요.',
                '수산화 나트륨 수용액 20 mL에 염산을 넣었을 때, 20 mL와 40 mL에서 색과 남은 이온을 적어 주세요. 두 경우의 차이를 H⁺와 OH⁻의 수로 설명해 주세요.',
                '레몬 아이들이 비눗방울을 만지며 논 뒤 기운을 잃은 까닭을 혼합 실험의 입자 모형으로 설명해 주세요. Na⁺와 Cl⁻ 같은 이온은 반응 뒤 어떻게 되었는지도 적어 주세요.'
            ],
            starts: [
                '염기는 … 지시약으로 확인했어요. 전류를 흘리자 푸른색이 … 극 쪽으로 넓어졌으니 염기의 성질을 만드는 입자는 …',
                '염산 20 mL에서는 … 색이었고 남은 이온은 …, 40 mL에서는 … 색이었고 … 가 남았어요. 차이는 …',
                '비눗방울의 … 가 아이들 몸속의 … 와 만나 … 이 되었기 때문이에요. Na⁺와 Cl⁻는 …'
            ],
            after: [
                [0, 'Dr.베이스! 먼 길 오느라 고생이 많았네. 드디어 중화병 연구가 끝났다지!'],
                [2, '산과 염기는 pH로 따지면 양 끝에 있어. 산에 염기를 섞을수록 산성을 잃고 pH가 높아지고, 염기에 산을 섞을수록 염기성을 잃고 pH가 낮아지지. 비눗방울이 신기했던 레몬 아이들이 자꾸 만지면서 산성을 잃은 거야.'],
                [2, '그러니 치료는 간단해. H⁺를 보충할 산성 치료제를 알맞게 투여하면 돼! 그리고 OH⁻가 있는 비눗방울을 맨손으로 만지지 않도록 알려 줘야 해.'],
                [0, '버블 왕국에서 날아오는 비눗방울이 문제였구나. 우리 아이들을 구해 주어 너무도 고맙네! 면목은 없지만… 마지막으로 부탁 하나만 더 해도 될까?'],
                [0, '경계 마을은 염기 대륙 바로 곁이라, 눈에 보이는 비눗방울 말고도 염기성 물질을 일일이 가려내기 어려울 걸세. BTB 용액은 비싸서 마을 사람들이 구해 쓰기도 어렵고. 광장의 보라 이장에게 가서 아이들을 치료하고, 마을 사람들이 쓸 지시약 사용법을 알려 주게. 새콤이도 광장으로 먼저 보내 두겠네. 그게 나의 마지막 부탁이야.']
            ],
            nextQuest: 5
        },
        {
            title: '경계 마을에 보내는 안내문',
            quests: [5],
            icon: '🏡',
            story: '경계 마을 사람들이 앞으로 스스로 산성·중성·염기성을 가려낼 수 있도록 안내문을 남겨요.',
            labels: ['새콤의 산성을 되찾은 방법', '마을 사람을 위한 지시약 사용법', '새로운 시료가 오면'],
            questions: [
                '새콤의 체액 모형에 치료제를 몇 방울 넣었을 때 pH가 얼마가 되었나요? 첫 방울을 넣었을 때 pH가 7 근처까지만 내려간 까닭을 H⁺와 OH⁻로 설명해 주세요.',
                '메틸 오렌지·BTB·페놀프탈레인의 색을 산성·중성·염기성으로 정리해 주세요. 한 가지 지시약만으로는 구별하기 어려웠던 경우는 무엇이었나요?',
                '경계 마을에 처음 보는 물질이 들어왔어요. 비눗방울처럼 염기성인지 알아보려면 어떤 순서로 지시약을 쓸지 적고, 결과마다 어떻게 판단할지 설명해 주세요.'
            ],
            starts: [
                '치료제를 … 방울 넣었더니 pH가 … 이 되었어요. 첫 방울에서 pH 7 근처까지만 내려간 까닭은 …',
                '메틸 오렌지는 산성에서 …, 중성·염기성에서 …. BTB는 …. 페놀프탈레인은 …. 한 가지로 구별이 어려웠던 경우는 …',
                '먼저 … 을 떨어뜨려 … 이면 염기성, … 이면 … 로 판단해요. 그다음 …'
            ],
            after: [
                [3, '이 안내문은 마을 회관에 걸어 둘게요. 이제 마을 사람 누구나 비눗방울 물질을 알아볼 수 있어요!'],
                [0, '고맙네. 덕분에 모든 고민이 해결되었어. 그동안 우리 레몬 왕국을 위해 연구하느라 고생이 많았네. 지시약은 잘 쓰도록 하겠네, 정말 고마워!'],
                [0, '이제 레몬 왕국과 버블 왕국이 함께하는 비눗방울 축제를 열자꾸나. YEAHHHHH!!!']
            ],
            nextQuest: null
        }
    ];

    /* 화학 규칙 ─────────────────────────────────────── */
    const solutions = {
        lemonJuice: {
            name: '건강한 레몬 즙',
            short: '건강한 즙',
            kind: 'acid',
            pH: 2.4
        },
        sickJuice: {
            name: '새콤의 즙',
            short: '새콤의 즙',
            kind: 'neutral',
            pH: 7.3
        },
        spring: {
            name: '샘물',
            short: '샘물',
            kind: 'neutral',
            pH: 7.0
        },
        HCl: {
            name: '묽은 염산',
            formula: 'HCl',
            kind: 'acid',
            strength: 'strong',
            pH: 1.2,
            conduct: 'bright',
            mg: 'fast'
        },
        H2SO4: {
            name: '묽은 황산',
            formula: 'H₂SO₄',
            kind: 'acid',
            strength: 'strong',
            pH: 1.0,
            conduct: 'bright',
            mg: 'fast'
        },
        HNO3: {
            name: '묽은 질산',
            formula: 'HNO₃',
            kind: 'acid',
            strength: 'strong',
            pH: 1.2,
            conduct: 'bright'
        },
        CH3COOH: {
            name: '아세트산 수용액',
            formula: 'CH₃COOH',
            kind: 'acid',
            strength: 'weak',
            pH: 2.9,
            conduct: 'dim',
            mg: 'slow'
        },
        sugar: {
            name: '설탕물',
            formula: 'C₁₂H₂₂O₁₁',
            kind: 'neutral',
            pH: 7.0,
            conduct: 'off',
            mg: 'none'
        },
        water: {
            name: '증류수',
            formula: 'H₂O',
            kind: 'neutral',
            pH: 7.0,
            conduct: 'off'
        },
        NaOH: {
            name: '수산화 나트륨 수용액',
            formula: 'NaOH',
            kind: 'base',
            strength: 'strong',
            pH: 13.0,
            conduct: 'bright'
        },
        KOH: {
            name: '수산화 칼륨 수용액',
            formula: 'KOH',
            kind: 'base',
            strength: 'strong',
            pH: 13.0,
            conduct: 'bright'
        },
        CaOH2: {
            name: '석회수(수산화 칼슘 수용액)',
            short: '석회수',
            formula: 'Ca(OH)₂',
            kind: 'base',
            strength: 'strong',
            pH: 12.4,
            conduct: 'bright'
        },
        NH3: {
            name: '암모니아수',
            formula: 'NH₃',
            kind: 'base',
            strength: 'weak',
            pH: 11.1,
            conduct: 'dim'
        },
        vinegar: {
            name: '식초',
            kind: 'acid',
            pH: 2.8
        },
        well: {
            name: '우물물',
            kind: 'neutral',
            pH: 7.0
        },
        bubble: {
            name: '비눗방울 액',
            kind: 'base',
            pH: 10.4
        }
    };

    /* 지시약 — 교과서 표 그대로의 단순화 모형 */
    const indicators = {
        blueLitmus: {
            name: '푸른 리트머스 종이',
            short: '푸른 리트머스',
            options: ['붉은색으로 변함', '변화 없음(푸른색)'],
            color: pH => pH < 7 ? 'litmusRed' : 'litmusBlue',
            word: pH => pH < 7 ? '붉은색으로 변함' : '변화 없음(푸른색)'
        },
        redLitmus: {
            name: '붉은 리트머스 종이',
            short: '붉은 리트머스',
            options: ['푸른색으로 변함', '변화 없음(붉은색)'],
            color: pH => pH > 7 ? 'litmusBlue' : 'litmusRed',
            word: pH => pH > 7 ? '푸른색으로 변함' : '변화 없음(붉은색)'
        },
        btb: {
            name: 'BTB 용액',
            short: 'BTB',
            options: ['노란색', '초록색', '파란색'],
            color: pH => pH < 6.2 ? 'btbYellow' : pH <= 7.6 ? 'btbGreen' : 'btbBlue',
            word: pH => pH < 6.2 ? '노란색' : pH <= 7.6 ? '초록색' : '파란색'
        },
        mo: {
            name: '메틸 오렌지 용액',
            short: '메틸 오렌지',
            options: ['빨간색', '노란색'],
            color: pH => pH < 4.2 ? 'moRed' : 'moYellow',
            word: pH => pH < 4.2 ? '빨간색' : '노란색'
        },
        pp: {
            name: '페놀프탈레인 용액',
            short: '페놀프탈레인',
            options: ['무색', '붉은색'],
            color: pH => pH >= 8.4 ? 'ppPink' : 'ppClear',
            word: pH => pH >= 8.4 ? '붉은색' : '무색'
        }
    };
    const colors = {
        litmusRed: '#e0626a',
        litmusBlue: '#6f98d8',
        btbYellow: '#f2d24a',
        btbGreen: '#5db36d',
        btbBlue: '#3f79d4',
        btbPlain: '#6aa56f',
        moRed: '#e24b3b',
        moYellow: '#f3c33f',
        ppPink: '#e1509b',
        ppClear: '#eef6fb',
        paper: '#f7f1e3'
    };

    /* 이온화 모형 — 녹인 입자 수와 정답 입자 수 */
    const models = {
        HCl: {
            label: '염산',
            formula: 'HCl',
            dissolved: 2,
            parts: [
                ['H+', 2],
                ['Cl-', 2],
                ['HCl', 0]
            ],
            equation: 'HCl → H⁺ + Cl⁻',
            kind: 'acid',
            strength: 'strong'
        },
        H2SO4: {
            label: '황산',
            formula: 'H₂SO₄',
            dissolved: 2,
            parts: [
                ['H+', 4],
                ['SO42-', 2],
                ['H2SO4', 0]
            ],
            equation: 'H₂SO₄ → 2H⁺ + SO₄²⁻',
            kind: 'acid',
            strength: 'strong'
        },
        HNO3: {
            label: '질산',
            formula: 'HNO₃',
            dissolved: 2,
            parts: [
                ['H+', 2],
                ['NO3-', 2],
                ['HNO3', 0]
            ],
            equation: 'HNO₃ → H⁺ + NO₃⁻',
            kind: 'acid',
            strength: 'strong'
        },
        CH3COOH: {
            label: '아세트산',
            formula: 'CH₃COOH',
            dissolved: 4,
            parts: [
                ['H+', 1],
                ['CH3COO-', 1],
                ['CH3COOH', 3]
            ],
            equation: 'CH₃COOH ⇄ H⁺ + CH₃COO⁻',
            kind: 'acid',
            strength: 'weak'
        },
        NaOH: {
            label: '수산화 나트륨',
            formula: 'NaOH',
            dissolved: 2,
            parts: [
                ['Na+', 2],
                ['OH-', 2],
                ['NaOH', 0]
            ],
            equation: 'NaOH → Na⁺ + OH⁻',
            kind: 'base',
            strength: 'strong'
        },
        KOH: {
            label: '수산화 칼륨',
            formula: 'KOH',
            dissolved: 2,
            parts: [
                ['K+', 2],
                ['OH-', 2],
                ['KOH', 0]
            ],
            equation: 'KOH → K⁺ + OH⁻',
            kind: 'base',
            strength: 'strong'
        },
        CaOH2: {
            label: '수산화 칼슘',
            formula: 'Ca(OH)₂',
            dissolved: 2,
            parts: [
                ['Ca2+', 2],
                ['OH-', 4],
                ['CaOH2', 0]
            ],
            equation: 'Ca(OH)₂ → Ca²⁺ + 2OH⁻',
            kind: 'base',
            strength: 'strong'
        },
        NH3: {
            label: '암모니아',
            formula: 'NH₃',
            dissolved: 4,
            parts: [
                ['NH4+', 1],
                ['OH-', 1],
                ['NH3', 3]
            ],
            equation: 'NH₃ + H₂O ⇄ NH₄⁺ + OH⁻',
            kind: 'base',
            strength: 'weak'
        }
    };
    /* 입자 표시 — 양이온 초록, 음이온 주황, 녹기만 한 분자 노랑, 물 파랑(원본 PPT 관례) */
    const particles = {
        'H+': {
            text: 'H⁺',
            name: '수소 이온',
            charge: 1,
            type: 'cation'
        },
        'Na+': {
            text: 'Na⁺',
            name: '나트륨 이온',
            charge: 1,
            type: 'cation'
        },
        'K+': {
            text: 'K⁺',
            name: '칼륨 이온',
            charge: 1,
            type: 'cation'
        },
        'Ca2+': {
            text: 'Ca²⁺',
            name: '칼슘 이온',
            charge: 2,
            type: 'cation'
        },
        'NH4+': {
            text: 'NH₄⁺',
            name: '암모늄 이온',
            charge: 1,
            type: 'cation'
        },
        'Cl-': {
            text: 'Cl⁻',
            name: '염화 이온',
            charge: -1,
            type: 'anion'
        },
        'SO42-': {
            text: 'SO₄²⁻',
            name: '황산 이온',
            charge: -2,
            type: 'anion'
        },
        'NO3-': {
            text: 'NO₃⁻',
            name: '질산 이온',
            charge: -1,
            type: 'anion'
        },
        'CH3COO-': {
            text: 'CH₃COO⁻',
            name: '아세트산 이온',
            charge: -1,
            type: 'anion'
        },
        'OH-': {
            text: 'OH⁻',
            name: '수산화 이온',
            charge: -1,
            type: 'anion'
        },
        'HCl': {
            text: 'HCl',
            name: '염화 수소 분자',
            charge: 0,
            type: 'molecule'
        },
        'H2SO4': {
            text: 'H₂SO₄',
            name: '황산 분자',
            charge: 0,
            type: 'molecule'
        },
        'HNO3': {
            text: 'HNO₃',
            name: '질산 분자',
            charge: 0,
            type: 'molecule'
        },
        'CH3COOH': {
            text: 'CH₃COOH',
            name: '아세트산 분자',
            charge: 0,
            type: 'molecule'
        },
        'NaOH': {
            text: 'NaOH',
            name: '수산화 나트륨',
            charge: 0,
            type: 'molecule'
        },
        'KOH': {
            text: 'KOH',
            name: '수산화 칼륨',
            charge: 0,
            type: 'molecule'
        },
        'CaOH2': {
            text: 'Ca(OH)₂',
            name: '수산화 칼슘',
            charge: 0,
            type: 'molecule'
        },
        'NH3': {
            text: 'NH₃',
            name: '암모니아 분자',
            charge: 0,
            type: 'molecule'
        },
        'H2O': {
            text: 'H₂O',
            name: '물 분자',
            charge: 0,
            type: 'water'
        }
    };

    /* 혼합: 수산화 나트륨 수용액 20 mL + 염산 hcl mL (같은 농도, 10 mL = 이온 한 쌍) */
    function mix(hcl) {
        const acid = Math.max(0, Math.round(Number(hcl) / 10)),
            base = 2,
            water = Math.min(acid, base);
        const H = acid - water,
            OH = base - water;
        const color = OH > 0 ? 'btbBlue' : H > 0 ? 'btbYellow' : 'btbGreen';
        return {
            hcl: acid * 10,
            naoh: 20,
            Na: base,
            Cl: acid,
            H,
            OH,
            water,
            color,
            colorWord: OH > 0 ? '파란색' : H > 0 ? '노란색' : '초록색',
            nature: OH > 0 ? '염기성' : H > 0 ? '산성' : '중성',
            temp: Math.round((20 + 2.5 * water - 0.4 * Math.max(0, acid - base)) * 10) / 10
        };
    }

    /* 치료: 새콤의 체액 모형에 산성 치료제를 한 방울씩 — 첫 방울은 몸속 OH⁻와 먼저 중화된다 */
    const curePH = [8.2, 7.0, 3.4, 3.1, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1];
    const cureBand = [2.5, 3.5];

    function cure(drops) {
        const d = Math.max(0, Math.min(curePH.length - 1, Math.round(Number(drops) || 0)));
        const pH = curePH[d];
        return {
            drops: d,
            pH,
            inBand: pH >= cureBand[0] && pH <= cureBand[1],
            tooAcid: pH < cureBand[0],
            btb: indicators.btb.word(pH),
            btbColor: indicators.btb.color(pH)
        };
    }

    /* 저장 ─────────────────────────────────────────── */
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
            evidence: quests.map(() => []),
            notes: entries.map(() => ['', '', '']),
            predictions: {},
            pos: {
                x: -13.5,
                z: -7.8
            },
            fetch: {
                heard: [],
                got: [],
                given: []
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
            camp: 'lemon',
            updatedAt: null
        };
    }

    /* 가져온 파일은 믿지 않는다 — 알려진 모양만 크기를 제한해 옮겨 담는다 */
    function sanitize(raw) {
        if (!raw || raw.version !== 1 || !Array.isArray(raw.evidence) || !Array.isArray(raw.notes) || raw.island !== undefined && raw.island !== 'lemon') throw new Error('레몬 백작의 부탁 탐험일지 파일이 아니에요.');
        const s = fresh(),
            short = (v, n = 5000) => typeof v === 'string' ? v.slice(0, n) : '';
        for (const k of ['nickname', 'classCode', 'number']) s[k] = short(raw[k], 40);
        s.nickname = s.nickname || '새싹';
        s.mode = raw.mode === 'beginner' ? 'beginner' : 'review';
        s.completed = [...new Set((raw.completed || []).filter(x => Number.isInteger(x) && x >= 0 && x < quests.length))];
        s.started = !!raw.started;
        s.introSeen = !!raw.introSeen;
        s.festival = !!raw.festival && s.completed.length === quests.length;
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
        s.camp = ['lemon', 'mint', 'bubble'].includes(raw.camp) ? raw.camp : 'lemon';
        s.notes = entries.map((_, i) => [0, 1, 2].map(j => short(raw.notes[i]?.[j])));
        s.sealedEntries = entries.map((_, i) => Array.isArray(raw.sealedEntries) ? !!raw.sealedEntries[i] : false);
        s.predictions = Object.fromEntries(Object.entries(raw.predictions || {}).filter(([k, v]) => /^\d$/.test(k) && typeof v === 'string').map(([k, v]) => [k, short(v, 300)]));
        s.visited = (raw.visited || []).filter(x => Number.isInteger(x) && x >= 0 && x < cast.length);
        const toolIds = tools.map(t => t.id),
            f = raw.fetch && typeof raw.fetch === 'object' ? raw.fetch : {};
        s.fetch = {
            heard: [...new Set((Array.isArray(f.heard) ? f.heard : []).filter(x => tools.some(t => t.quest === x)))],
            got: [...new Set((Array.isArray(f.got) ? f.got : []).filter(x => toolIds.includes(x)))],
            given: [...new Set((Array.isArray(f.given) ? f.given : []).filter(x => toolIds.includes(x)))]
        };
        if (!raw.fetch)
            for (const q of [...new Set(tools.map(t => t.quest))])
                if (s.completed.includes(q) || (Array.isArray(raw.evidence[q]) && raw.evidence[q].some(e => e && e.manual))) {
                    s.fetch.heard.push(q);
                    for (const t of tools)
                        if (t.quest === q) s.fetch.given.push(t.id);
                }
        if (s.started && raw.pos && Number.isFinite(raw.pos.x) && Number.isFinite(raw.pos.z)) s.pos = {
            x: Math.max(-19, Math.min(20, raw.pos.x)),
            z: Math.max(-15, Math.min(15, raw.pos.z))
        };
        s.evidence = quests.map((q, i) => (Array.isArray(raw.evidence[i]) ? raw.evidence[i] : []).slice(0, 24).flatMap(e => {
            try {
                return [cleanRecord(e)];
            } catch {
                return [];
            }
        }));
        return s;
    }

    function cleanValue(v, depth = 0) {
        if (v == null) return null;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') return v.slice(0, 300);
        if (depth > 3) return null;
        if (Array.isArray(v)) return v.slice(0, 30).map(x => cleanValue(x, depth + 1));
        if (typeof v === 'object') return Object.fromEntries(Object.entries(v).slice(0, 40).map(([k, x]) => [String(k).slice(0, 40), cleanValue(x, depth + 1)]));
        return null;
    }

    function cleanRecord(e) {
        if (!e || typeof e !== 'object' || !Array.isArray(e.fields)) throw new Error('기록 모양이 달라요');
        const short = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
        const fields = e.fields.slice(0, 12).map(f => ({
            key: short(f.key, 40),
            label: short(f.label, 120),
            kind: f.kind === 'number' ? 'number' : 'choice',
            unit: short(f.unit, 12),
            options: Array.isArray(f.options) ? f.options.slice(0, 8).map(o => short(o, 60)) : [],
            answer: f.kind === 'number' ? Number(f.answer) : short(f.answer, 60),
            tol: Number.isFinite(f.tol) ? f.tol : 0.005
        }));
        const entered = {};
        for (const f of fields) {
            const v = e.entered?.[f.key];
            entered[f.key] = f.kind === 'number' ? (Number.isFinite(Number(v)) ? Number(v) : null) : short(v, 60);
        }
        const ok = fields.every(f => f.kind === 'number' ? Math.abs(entered[f.key] - f.answer) <= f.tol + 1e-9 : entered[f.key] === f.answer);
        return {
            tag: short(e.tag, 50),
            label: short(e.label, 120),
            fields,
            entered,
            snap: cleanValue(e.snap || {}),
            manual: e.manual === true && ok,
            time: short(e.time, 50)
        };
    }

    function entryWritten(s, i) {
        return s.notes[i].every(t => t.trim().length > 0);
    }

    function entryDone(s, i) {
        return entryWritten(s, i) && s.sealedEntries[i];
    }
    /* 부탁을 해결했는데 이어지는 기록을 아직 못 끝낸 기록 번호 (없으면 -1) */
    function pendingEntry(s) {
        return entries.findIndex((e, i) => e.quests.every(q => s.completed.includes(q)) && !entryDone(s, i));
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
            localStorage.setItem(KEY, JSON.stringify({
                ...s,
                island: 'lemon'
            }));
            return true;
        } catch {
            return false;
        }
    }

    function ready(s) {
        return s.completed.length === quests.length && entries.every((_, i) => entryDone(s, i));
    }

    function fmt(n) {
        return Number(Number(n).toFixed(2)).toString();
    }
    const api = {
        KEY,
        cast,
        quests,
        entries,
        tools,
        solutions,
        indicators,
        colors,
        models,
        particles,
        mix,
        cure,
        cureBand,
        curePH,
        fresh,
        sanitize,
        cleanRecord,
        load,
        save,
        ready,
        fmt,
        entryWritten,
        entryDone,
        pendingEntry
    };
    root.IslandModel = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
