(function(root){
'use strict';
function build(id,evidence){
 const M=root.IslandModel,f=M.fmt;
 if(id===2){
  const record=evidence.find(e=>e.manual&&e.tag==='pair-20');
  if(!record)throw Error('서로 다른 두 저항의 직렬 기록이 필요해요.');
  const p=record.p,v=M.circuit(p),i=f(v.i1),v1=f(v.v1),v2=f(v.v2);
  return {title:'토리의 발견 확인 · 직렬',figure:{p:{...p,on1:true,on2:true},names:root.IslandPlay?.names(2),final:false},observation:`내 기록: 전원 ${f(p.v)} V · 앞쪽 ${p.r1} Ω, 뒤쪽 ${p.r2} Ω · 앞뒤 전류 ${i} A / ${i} A · 전압 ${v1} V / ${v2} V`,questions:[
   {prompt:`앞쪽 안내등과 뒤쪽 안내등에 흐르는 전류를 비교하면?`,choices:['앞쪽에서 전류가 쓰여 뒤쪽은 0 A이다',`앞뒤 모두 ${i} A로 같다`,'저항이 큰 뒤쪽에서 전류가 더 작다'],correct:1,probe:'source',explanation:'직렬 회로에는 갈림길이 없어요. 장치에서 전류가 소모되는 것이 아니므로 앞뒤 전류가 같아요.',analogy:'🚗 톨게이트를 떠올려 봐요. 한 톨게이트로 자동차 100대가 들어가면 출구로도 100대가 나와요. 길이 하나뿐이라 어디서 세어도 지나가는 양은 같지요. 직렬 회로의 전류도 그래요 — 앞쪽 안내등을 지나기 전이든 뒤쪽 안내등을 지난 뒤든, 1초에 지나가는 전하의 양은 같아요.'},
   {prompt:`뒤쪽 ${p.r2} Ω 장치에는 몇 V가 걸리며, 왜 그럴까요?`,choices:[`${i} A × ${p.r2} Ω = ${v2} V`,`${v1} V — 직렬은 장치 전압이 항상 같아서`,`${f(p.v)} V — 모든 장치가 전원 전압을 그대로 받아서`],correct:0,probe:'r2',explanation:`각 장치의 전압은 V = I × R이에요. 같은 ${i} A가 흐르므로 저항이 큰 장치에 더 큰 전압이 걸려요. ${v1} V + ${v2} V = ${f(p.v)} V도 확인해요.`,analogy:'🧋 선생님이 수업 때 말했던 공차 이야기를 떠올려 봐요! 공차의 펄을 전하라고 하면, 전류의 세기가 같다는 건 빨대를 지나는 펄의 양이 같다는 뜻이에요. 그런데 저항이 큰 장치는 펄이 지나가기 힘든 좁은 빨대, 저항이 작은 장치는 펄이 잘 지나가는 넓은 빨대예요. 직렬 연결에서는 전류가 같으니 두 빨대로 같은 양의 펄을 보내야 하는데, 좁은 빨대는 더 세게 빨아야겠죠? 그 「더 센 힘」이 바로 더 큰 전압이에요.'}
  ],summary:'직렬: I₁ = I₂ · 각 장치의 V = I × R · 전체 전압은 각 장치 전압의 합이에요.'};
 }
 const record=evidence.find(e=>e.manual&&e.tag===(id===4?'festival':'both-20'));
 if(!record)throw Error('병렬 회로의 직접 기록이 필요해요.');
 const p={...record.p,on1:true,on2:true},v=M.circuit(p),names=id===4?['안내등','부스']:['실내등','테라스등'];
 return {title:(id===4?'해온':'소담')+'의 발견 확인 · 병렬',figure:{p,names:root.IslandPlay?.names(id),final:id===4},observation:(id===4?'기록한 축제 회로에서 두 스위치를 모두 닫는다고 예상해 봐요. ':'두 스위치를 닫았을 때 내 기록을 살펴봐요. ')+`전원 ${f(p.v)} V · 가지 1 ${names[0]} ${p.r1} Ω, 가지 2 ${names[1]} ${p.r2} Ω`,questions:[
  {prompt:`두 스위치가 닫혀 있을 때 ${names[0]}과 ${names[1]} 양 끝 전압은?`,choices:[`${f(p.v/2)} V씩 나뉜다`,'저항이 큰 장치의 전압이 더 크다',`둘 다 ${f(p.v)} V로 같다`],correct:2,probe:'r2',explanation:`병렬의 각 가지는 전원의 같은 두 단자에 연결돼요. 두 스위치가 닫혀 있으면 두 장치 모두 ${f(p.v)} V를 받아요.`},
  {prompt:`같은 ${f(p.v)} V에서 ${p.r2} Ω인 ${names[1]}에 흐르는 전류는?`,choices:[`${f(v.i1)} A — 병렬도 전류가 같아서`,`${f(p.v)} V ÷ ${p.r2} Ω = ${f(v.i2)} A`,'저항이 클수록 전류도 커진다'],correct:1,probe:'source',explanation:`I = V ÷ R이므로 ${names[0]}은 ${f(v.i1)} A, ${names[1]}은 ${f(v.i2)} A예요. 같은 전압에서는 저항이 클수록 전류가 작아요. 저항을 고정하고 전압을 높이면 전류는 커져요.`,analogy:`🧋 공차로 생각하면 병렬 연결은 빨대 두 개를 같은 힘(같은 전압)으로 빠는 거예요. 넓은 빨대(저항이 작은 ${names[0]})로는 펄이 많이(전류가 크게), 좁은 빨대(저항이 큰 ${names[1]})로는 적게 와요. 전원에서 나오는 전체 전류는 두 빨대로 온 펄을 합친 양이에요.`}
 ],summary:'병렬: V₁ = V₂ = 전원 전압 · 각 가지의 I = V ÷ R · 전체 전류는 가지 전류의 합이에요. 열린 스위치가 있는 가지는 전류가 0 A이고, 그 등 양 끝의 전압도 0 V예요(전원의 전압은 열린 스위치 양 끝에 걸려요).'};
}
const api={build};root.IslandConcept=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
