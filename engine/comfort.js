(function(){
'use strict';
const helpHTML=`<details class="ime-help"><summary>⌨️ 키보드가 이상해요</summary><div><strong>고장난 채로 써도 괜찮아요.</strong><p>기록을 확인할 때 한글을 되살릴 수 있어요.</p><ul><li>영어만 나오면 <b>Win + Space</b> 또는 <b>오른쪽 Alt</b>를 눌러 보세요. 안 바뀌어도 그대로 쓰고 ‘기록 확인’을 눌러 주세요.</li><li>자음·모음이 떨어지거나 글자 간격이 넓어져도 계속 써 보세요. 칸을 떠나거나 기록을 확인할 때 보정해요.</li><li>글자 아래 밑줄이 남으면 스페이스를 누르거나 칸 밖을 한 번 눌러 주세요.</li><li>입력이 멈추면 칸 밖을 눌렀다가 돌아오세요. Win + Space도 해 보고, 계속 안 되면 선생님을 불러 주세요.</li></ul><p>여러분이 잘못한 게 아니에요.</p></div></details>`;
class IslandComfort{
 constructor(config){
  this.config=config;this.composing=new WeakSet();this.lastValues=new WeakMap();this.talk=null;this.timer=null;this.helpTimer=null;
  this.audio=new IslandAudio(config.state(),()=>this.updateAudioUI());
  const welcome=document.getElementById('nickname');welcome.insertAdjacentHTML('afterend',helpHTML);
  document.addEventListener('compositionstart',e=>this.composing.add(e.target));
  document.addEventListener('compositionend',e=>{this.composing.delete(e.target);this.detect(e.target);});
  document.addEventListener('focusin',e=>{if(this.isText(e.target))this.lastValues.set(e.target,e.target.value);});
  document.addEventListener('input',e=>{
   const el=e.target;if(!this.isText(el)||el.dataset.ime==='off')return;
   const before=this.lastValues.get(el);
   // The standard helper emits an untrusted input after its native setter.
   if(!e.isTrusted&&before!==undefined&&before!==el.value)this.remember(el.dataset.note||el.dataset.identity||el.id,before,el.value);
   this.lastValues.set(el,el.value);if(!e.isComposing&&!this.composing.has(el))this.detect(el);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.stopTalk(true);this.cancelMusicPosition();}});
  window.addEventListener('blur',()=>this.cancelMusicPosition());
  document.getElementById('dialogue').addEventListener('close',()=>{if(!document.getElementById('dialogue').open)this.stopTalk(true);});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229||this.composing.has(e.target))&&e.target.closest('#startForm'))e.preventDefault();},true);
 }
 isText(el){return el instanceof HTMLTextAreaElement||(el instanceof HTMLInputElement&&['text','search',''].includes(el.type));}
 detect(el){
  if(!this.isText(el)||el.dataset.ime==='off'||this.composing.has(el))return;
  const raw=el.value;if(__ime.fixWidth(raw)===raw&&!__ime.maybeKorean(raw))return;
  document.querySelectorAll('.ime-help').forEach(x=>x.classList.add('ime-attention'));
  clearTimeout(this.helpTimer);this.helpTimer=setTimeout(()=>document.querySelectorAll('.ime-help').forEach(x=>x.classList.remove('ime-attention')),6000);
 }
 remember(field,original,corrected){
  if(original===corrected)return;
  const s=this.config.state();s.imeOriginals=s.imeOriginals||[];
  const last=s.imeOriginals[s.imeOriginals.length-1];if(last&&last.field===field&&last.original===original&&last.corrected===corrected)return;
  s.imeOriginals.push({field:String(field||'기록').slice(0,60),original:original.slice(0,5000),corrected:corrected.slice(0,5000),time:new Date().toISOString()});s.imeOriginals=s.imeOriginals.slice(-30);
 }
 confirmValue(raw,label,field,el){
  const fixed=__ime.ask(raw,label);
  if(fixed!==raw){this.remember(field,raw,fixed);if(el?.isConnected){this.lastValues.set(el,fixed);__ime.setVal(el,fixed);}}
  return fixed;
 }
 confirmJournal(all=false){
  const fields=[...document.querySelectorAll('#journal input[data-identity],#journal textarea[data-note]')];
  if(fields.some(el=>this.composing.has(el))){this.config.toast('글자 입력을 마친 뒤 기록을 확인해 주세요.');return false;}
  const s=this.config.state();
  fields.forEach(el=>{if(el.dataset.note){const [i,j]=el.dataset.note.split(',').map(Number);s.notes[i][j]=el.value;}else s[el.dataset.identity]=el.value;});
  const nickname=fields.find(el=>el.dataset.identity==='nickname');
  if(all||nickname)s.nickname=this.confirmValue(s.nickname,'탐험가 별명','nickname',nickname);
  s.notes.forEach((row,i)=>row.forEach((raw,j)=>{const el=fields.find(x=>x.dataset.note===i+','+j);if(all||el)s.notes[i][j]=this.confirmValue(raw,(i+1)+'번째 기록 · '+['해결책','과학적 이유','다음 적용'][j],i+','+j,el);}));
  this.config.save();return true;
 }
 startTalk(npc){
  this.stopTalk(true);const el=document.querySelector('#dialogue .dialogue-text');if(!el)return;
  const full=el.textContent;el.textContent='';el.classList.add('typewriter');
  const layout=document.createElement('span');layout.className='talk-layout';layout.textContent=full;layout.setAttribute('aria-hidden','true');
  const visible=document.createElement('span');visible.className='talk-visible';visible.setAttribute('aria-hidden','true');
  const readable=document.createElement('span');readable.className='sr-only';readable.textContent=full;
  el.append(layout,visible,readable);
  const tools=document.createElement('div');tools.className='dialogue-tools';tools.innerHTML='<button type="button" data-action="speech-skip">대사 한 번에 보기</button><button type="button" data-action="voice-toggle"></button>';
  el.after(tools);this.talk={el,visible,full,chars:Array.from(full),index:0,npc,skip:tools.firstElementChild};
  this.updateAudioUI();this.audio.unlock();
  if(this.config.state().calm||matchMedia('(prefers-reduced-motion:reduce)').matches){this.stopTalk(true);return;}
  el.dataset.talking='true';this.audio.duck(true);
  const tick=()=>{
   const t=this.talk;if(!t||!t.el.isConnected||!document.getElementById('dialogue').open||document.hidden){this.stopTalk(true);return;}
   const ch=t.chars[t.index++];t.visible.textContent=t.chars.slice(0,t.index).join('');
   if(t.index%2===1&&/[가-힣A-Za-z0-9]/.test(ch))this.audio.syllable(ch,npc);
   if(t.index>=t.chars.length){this.timer=setTimeout(()=>this.stopTalk(true),140);return;}
   this.timer=setTimeout(tick,/[.!?。]/.test(ch)?150:/[,·]/.test(ch)?95:44);
  };tick();
 }
 stopTalk(reveal=true){
  clearTimeout(this.timer);this.timer=null;this.audio?.stopVoices();this.audio?.duck(false);
  if(this.talk){if(reveal)this.talk.visible.textContent=this.talk.full;this.talk.el.dataset.talking='false';this.talk.skip.disabled=true;this.talk.skip.textContent='대사 모두 보기 완료';}
  this.talk=null;
 }
 toggleVoice(){const s=this.config.state();s.voice=!s.voice;this.audio.update(s);this.audio.duck(!!this.talk);this.config.save();this.updateAudioUI();}
 musicTime(seconds){const n=Math.floor(Math.max(0,Number(seconds)||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),sec=String(n%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+sec:String(m).padStart(2,'0')+':'+sec;}
 previewMusicPosition(seconds){this.musicPreview=seconds;this.updateAudioUI();}
 commitMusicPosition(seconds){this.musicPreview=null;this.audio.seek(seconds);this.updateAudioUI();}
 cancelMusicPosition(){this.musicPreview=null;this.updateAudioUI();}
 updateAudioUI(){
  if(!this.audio)return;const info=this.audio.info(),s=this.config.state();
  const name=document.getElementById('musicName');if(name&&name.textContent!==info.name)name.textContent=info.name||'아직 선택한 음악이 없어요';
  const status=document.getElementById('musicStatus');if(status&&status.textContent!==info.status)status.textContent=info.status;
  const play=document.querySelector('[data-action="music-play"]');if(play){play.disabled=!info.ready;play.textContent=info.playing?'Ⅱ 음악 일시정지':'▶ 음악 재생';}
  const seek=document.getElementById('musicSeek');
  if(seek){
   if(!info.canSeek)this.musicPreview=null;
   const position=this.musicPreview??info.currentTime,duration=info.duration;
   seek.disabled=!info.canSeek;seek.max=String(Math.max(1,Math.floor(duration)));seek.value=String(Math.min(Number(seek.max),Math.floor(position)));
   seek.setAttribute('aria-valuetext',this.musicTime(position)+(duration?' / '+this.musicTime(duration):''));
   document.getElementById('musicElapsed').textContent=this.musicTime(position);
   document.getElementById('musicDuration').textContent=duration?this.musicTime(duration):'—:—';
   document.querySelectorAll('[data-action="music-jump"]').forEach(button=>button.disabled=!info.canSeek);
  }
  document.querySelectorAll('[data-action="voice-toggle"]').forEach(el=>{el.textContent=s.voice?'♫ 주민 목소리 켜짐':'♩ 주민 목소리 꺼짐';el.setAttribute('aria-pressed',String(s.voice));});
  document.querySelectorAll('[data-setting="voice"]').forEach(el=>el.checked=s.voice);
 }
 settingsHTML(){const s=this.config.state();return `<section class="audio-settings"><div class="eyebrow">섬에서 들려오는 소리</div><h3>주민의 목소리와 음악</h3><label class="setting-row"><span>주민의 먕먕 목소리<small>주민마다 다른 목소리로 이야기해요.</small></span><input type="checkbox" data-setting="voice" ${s.voice?'checked':''}></label><label class="volume-row"><span>주민 목소리 크기</span><input type="range" min="0" max="1" step="0.05" value="${s.voiceVolume}" data-volume="voiceVolume" aria-label="주민 목소리 크기"><output>${Math.round(s.voiceVolume*100)}%</output></label><div class="music-card"><b id="musicName"></b><p id="musicStatus" role="status"></p><div class="choices"><button type="button" data-action="music-choose">♫ 음원 파일 선택</button><button type="button" data-action="music-play">▶ 음악 재생</button><button type="button" data-action="music-default">기본 BGM으로</button></div><div class="music-position"><label for="musicSeek">재생 위치</label><div class="music-times"><span id="musicElapsed" aria-live="off">00:00</span><span aria-hidden="true"> / </span><span id="musicDuration">—:—</span></div><input id="musicSeek" type="range" min="0" max="1" step="1" value="0" disabled data-ime="off" aria-label="배경음악 재생 위치" aria-describedby="musicSeekHelp"><div class="music-jumps"><button type="button" data-action="music-jump" data-jump="-30" disabled>↶ 30초 전</button><button type="button" data-action="music-jump" data-jump="30" disabled>30초 후 ↷</button></div><p id="musicSeekHelp">막대를 터치하거나 끌어 원하는 부분으로 이동해요. 키보드 방향키로도 조절할 수 있어요.</p></div><label class="volume-row"><span>배경음악 크기</span><input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" data-volume="musicVolume" aria-label="배경음악 크기"><output>${Math.round(s.musicVolume*100)}%</output></label><p class="muted">메이플스토리 피아노 BGM 모음이 기본으로 들어 있어요. 개인 음원을 고르면 이 기기에서만 재생되며, 새로고침하면 기본 BGM으로 돌아와요.</p></div></section>`;}
}
IslandComfort.helpHTML=helpHTML;window.IslandComfort=IslandComfort;
})();
