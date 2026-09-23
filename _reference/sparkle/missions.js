(function(root){
'use strict';
function steps(id){return [
 ['스위치를 열고 전압·전류를 직접 기록해요.','스위치를 닫고 달라진 값을 기록해요.'],
 ['저항 10 Ω을 그대로 두고 서로 다른 전압 두 번을 기록해요.','전압 6 V를 그대로 두고 서로 다른 저항 두 번을 기록해요.','전압 6 V에서 0.3 A를 만들고 기록해요.'],
 ['뒤쪽에도 안내등(10 Ω)을 연결하고 값을 기록해요.','뒤쪽 안내등을 20 Ω으로 바꾸고 앞뒤 전압을 비교해 기록해요.','두 안내등을 연결한 채 스위치를 열고 기록해요.'],
 ['실내 10 Ω·테라스 20 Ω을 병렬로 연결하고 기록해요.','테라스만 끄고 실내와 테라스의 값을 기록해요.'],
 ['카페에서 찾은 방법으로 안내등은 켜고 부스만 끈 뒤 기록해요.']
 ][id];}
function checks(s,t){const has=x=>t.includes(x);switch(s.id){case 0:return [has('open'),has('closed')];case 1:return [new Set(t.filter(x=>x.startsWith('voltage-'))).size>=2,new Set(t.filter(x=>x.startsWith('resistance-'))).size>=2,has('target')];case 2:return [has('pair-10'),has('pair-20'),has('broken')];case 3:return [has('both-20'),has('one-20')];default:return [has('festival')];}}
function hint(s,t,predicted){
 const action=(a,copy,extra='')=>({selector:`[data-action="${a}"]${extra}`,copy});const val=(k,n,copy)=>action('value',copy,`[data-key="${k}"][data-value="${n}"]`);const cap=()=>action('capture','지금의 계기 값을 확인했으면 ‘증거 남기기’를 눌러 직접 적어 보세요.');
 if(!predicted)return {selector:'.prediction .choices',copy:'먼저 예상 하나를 골라 주세요. 예상은 틀려도 괜찮아요.'};
 if(checks(s,t).every(Boolean))return action('complete','모든 Step을 해냈어요! ‘부탁 해결하기’를 눌러 주민에게 알려 주세요.');
 if(s.id===0){const need=!t.includes('open');if(s.on1===need)return action('switch',need?'스위치를 눌러 회로를 열어 보세요.':'스위치를 눌러 회로를 닫아 보세요.','[data-key="on1"]');return cap();}
 if(s.id===1){if(s.phase===0){if(s.r1!==10)return {selector:'[data-lab-range="length"]',copy:'먼저 길이와 단면적을 각각 1배로 맞춰 저항 10 Ω을 만들어요.'};if(!t.includes('voltage-'+s.v))return cap();return {selector:'[data-lab-range="v"]',copy:'전압 슬라이더를 다른 값으로 움직인 뒤 기록해요. 두 기록을 모으면 저항 비교가 시작돼요.'};}if(s.v!==6)return {selector:'[data-lab-range="v"]',copy:'저항 비교와 목표 전류 실험에서는 전압을 6 V로 맞춰요.'};if(s.phase===1&&!t.includes('resistance-'+s.r1))return cap();if(s.phase===2&&s.r1===20)return cap();return {selector:'[data-lab-range="length"]',copy:s.phase===1?'길이 또는 단면적 하나만 바꿔 다른 저항의 전류를 기록해요.':'6 V에서 0.3 A가 흐를 저항을 생각하고 길이·단면적을 조절해요.'};}
 if(s.id===2){const cs=checks(s,t),i=cs.indexOf(false);if(s.count!==2)return action('pick-part','뒤쪽 안내등 카드를 노란 자리로 끌어다 놓아요. 카드를 누른 뒤 노란 자리를 눌러도 돼요.','[data-part="device"]');if(i<2&&!s.on1||i===2&&s.on1)return action('switch',i===2?'두 안내등이 있는 회로의 스위치를 열어 보세요.':'스위치를 닫아 전류가 흐르게 해요.','[data-key="on1"]');if(i===0&&s.r2!==10||i===1&&s.r2!==20)return {selector:'[data-lab-range="r2"]',copy:i===0?'뒤쪽 안내등 저항 슬라이더를 10 Ω에 두고 같은 저항 두 개를 비교해요.':'뒤쪽 안내등 저항 슬라이더를 20 Ω으로 올리고 앞뒤 전압이 어떻게 나뉘는지 살펴봐요.'};return cap();}
 if(s.type!=='parallel')return action('pick-part','연결선 카드를 누른 뒤 별도 가지에 잇기 자리를 눌러요. 끌어서 놓아도 돼요.','[data-part="branch"]');
 if(s.id===3&&s.r2!==20)return {selector:'[data-lab-range="r2"]',copy:'테라스등 저항 슬라이더를 20 Ω으로 올려 서로 다른 두 가지를 비교해요.'};
 const shouldOn=s.id===3&&!t.includes('both-20');if(s.on2!==shouldOn)return action('switch',shouldOn?'두 가지를 모두 켠 상태부터 기록해요.':'테라스 또는 부스 스위치만 꺼 보세요.','[data-key="on2"]');return cap();
}
const api={steps,checks,hint};root.IslandMissions=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
