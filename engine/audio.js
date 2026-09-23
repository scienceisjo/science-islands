(function(){
'use strict';
// The supplied piano compilation is served as a local, seekable audio asset.
const DEFAULT_BGM='audio/maple-piano-bgm.mp3';
class IslandAudio{
 constructor(preferences,onChange){
  this.preferences=preferences;this.onChange=onChange||(()=>{});this.context=null;this.voices=new Set();this.chimes=new Set();this.playRequest=0;this.fileUrl=null;this.fileName='';this.ducked=false;this.resumeOnVisible=false;this.metadataReady=false;this.mediaError=false;this.status='음원 파일을 선택해 주세요.';
  this.music=document.createElement('audio');this.music.id='islandBgm';this.music.preload='metadata';this.music.loop=true;this.music.hidden=true;document.body.append(this.music);
  this.music.addEventListener('loadedmetadata',()=>{this.metadataReady=this.music.readyState>=1;if(this.metadataReady){this.mediaError=!!this.music.error;if(!this.mediaError)this.status=this.music.paused?'재생 버튼을 누르면 음악이 시작돼요.':'섬에서 음악을 듣고 있어요.';}this.notify();});
  this.music.addEventListener('durationchange',()=>{if(this.music.readyState>=1)this.metadataReady=true;this.notify();});
  for(const event of ['timeupdate','seeking','seeked','loadstart','progress','loadeddata','canplay','waiting','stalled'])this.music.addEventListener(event,()=>{if((event==='loadeddata'||event==='canplay')&&this.music.readyState>=1){this.metadataReady=true;this.mediaError=!!this.music.error;}this.notify();});
  this.music.addEventListener('emptied',()=>{this.resetMediaState();this.notify();});
  this.music.addEventListener('play',()=>{this.status='섬에서 음악을 듣고 있어요.';this.notify();});
  this.music.addEventListener('pause',()=>this.notify());
  this.music.addEventListener('error',()=>{this.mediaError=true;this.status='이 음원을 재생할 수 없어요. MP3·WAV·OGG 파일을 다시 선택해 주세요.';this.notify();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.playRequest++;this.resumeOnVisible=!this.music.paused;this.music.pause();this.stopVoices();this.stopChimes();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}else if(this.resumeOnVisible){this.resumeOnVisible=false;this.playMusic();}});
  this.update(preferences);if(DEFAULT_BGM)this.useDefault();
 }
 resetMediaState(){this.metadataReady=false;this.mediaError=false;}
 useDefault(){this.pauseMusic();if(this.fileUrl){URL.revokeObjectURL(this.fileUrl);this.fileUrl=null;}this.resetMediaState();this.fileName='메이플스토리 · 피아노 BGM 33선';this.status='기본 배경음악이 준비됐어요. 재생 버튼을 눌러 주세요.';this.music.src=DEFAULT_BGM;this.music.load();this.notify();}
 notify(){this.onChange(this.info());}
 info(){
  const length=this.music.duration,time=this.music.currentTime;
  const duration=this.metadataReady&&Number.isFinite(length)&&length>0?length:0;
  const currentTime=this.metadataReady&&Number.isFinite(time)&&time>=0?time:0;
  const canSeek=this.metadataReady&&this.music.readyState>=1&&duration>0&&!this.mediaError&&!this.music.error;
  return{name:this.fileName,playing:!this.music.paused,ready:!!this.music.currentSrc||!!this.music.getAttribute('src'),status:this.status,volume:this.preferences.musicVolume,currentTime,duration,canSeek,seeking:this.metadataReady&&!this.mediaError&&!!this.music.seeking};
 }
 seek(seconds){
  const info=this.info();if(typeof seconds!=='number'||!Number.isFinite(seconds)||!info.canSeek)return false;
  try{this.music.currentTime=Math.max(0,Math.min(info.duration,seconds));this.status=this.music.paused?'재생 버튼을 누르면 선택한 위치에서 시작해요.':'섬에서 음악을 듣고 있어요.';this.notify();return true;}
  catch{this.status='재생 위치를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.';this.notify();return false;}
 }
 unlock(){try{if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.context=new AC();}if(this.context.state==='suspended')this.context.resume().catch(()=>{});return this.context.state!=='closed';}catch{return false;}}
 update(p){this.preferences=p;this.music.volume=Math.max(0,Math.min(1,p.musicVolume))*(this.ducked ? .4 : 1);if(!p.voice)this.stopVoices();}
 duck(on){this.ducked=on&&this.preferences.voice&&this.preferences.voiceVolume>0;this.update(this.preferences);}
 loadFile(file){
  if(!file)return false;
  if(!/^audio\//i.test(file.type)&&!(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name))){this.status='음원 파일을 선택해 주세요. MP3·WAV·OGG 등을 사용할 수 있어요.';this.notify();return false;}
  if(file.size>250*1024*1024){this.status='250 MB 이하 음원을 선택해 주세요.';this.notify();return false;}
  this.pauseMusic();if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);this.fileUrl=URL.createObjectURL(file);this.fileName=file.name;this.resetMediaState();this.status='음원을 준비하고 있어요.';this.music.src=this.fileUrl;this.music.load();this.notify();return true;
 }
 async playMusic(){if(!this.music.getAttribute('src')){this.status='먼저 음원 파일을 선택해 주세요.';this.notify();return false;}if(document.hidden)return false;this.unlock();const request=++this.playRequest;try{await this.music.play();return true;}catch(err){if(request!==this.playRequest)return false;this.status=err.name==='NotSupportedError'?'이 형식은 재생할 수 없어요. 다른 음원을 골라 주세요.':'재생 버튼을 한 번 더 눌러 주세요.';this.notify();return false;}}
 pauseMusic(){this.playRequest++;this.resumeOnVisible=false;this.music.pause();if(this.fileName)this.status='음악을 잠시 쉬고 있어요.';this.notify();}
 syllable(character,npc=0){
  if(!this.preferences.voice||this.preferences.voiceVolume<=0||document.hidden||!this.unlock())return;
  const ctx=this.context,t=ctx.currentTime,d=.09,code=character.codePointAt(0)||0;
  const pitches=[310,365,215,410,330],pitch=pitches[npc%5]*(.92+(code%9)*.021);
  const formants=[[680,1550],[430,2050],[830,1800],[510,1050]],v=formants[code%4];
  const source=ctx.createOscillator(),vibrato=ctx.createOscillator(),vibratoGain=ctx.createGain(),envelope=ctx.createGain(),lowpass=ctx.createBiquadFilter();
  source.type='sawtooth';source.frequency.setValueAtTime(pitch*.86,t);source.frequency.exponentialRampToValueAtTime(pitch*1.08,t+.025);source.frequency.exponentialRampToValueAtTime(pitch*.83,t+d);
  vibrato.frequency.value=26;vibratoGain.gain.value=pitch*.025;vibrato.connect(vibratoGain);vibratoGain.connect(source.frequency);
  lowpass.type='lowpass';lowpass.frequency.setValueAtTime(3700,t);lowpass.frequency.exponentialRampToValueAtTime(1100,t+d);
  const nodes=[source,vibrato,vibratoGain,envelope,lowpass];
  for(let i=0;i<2;i++){const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.Q.value=i?3.5:2.2;filter.frequency.setValueAtTime(v[i]*.8,t);filter.frequency.linearRampToValueAtTime(v[i],t+.035);filter.frequency.linearRampToValueAtTime(v[i]*.85,t+d);gain.gain.value=i ? .45 : .9;source.connect(filter);filter.connect(gain);gain.connect(lowpass);nodes.push(filter,gain);}
  lowpass.connect(envelope);envelope.connect(ctx.destination);const volume=this.preferences.voiceVolume*.28;envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);envelope.gain.setValueAtTime(Math.max(.0002,volume*.75),t+.05);envelope.gain.exponentialRampToValueAtTime(.0001,t+d+.025);
  const voice={source,vibrato,nodes};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);nodes.forEach(n=>{try{n.disconnect();}catch{}});};source.start(t);vibrato.start(t);source.stop(t+d+.04);vibrato.stop(t+d+.04);
 }
 stopVoices(){for(const v of this.voices){for(const o of [v.source,v.vibrato]){try{o.stop();}catch{}}for(const n of v.nodes){try{n.disconnect();}catch{}}}this.voices.clear();}
 chime(){if(!this.preferences.effects||document.hidden||!this.unlock())return;const a=this.context;[523,659,784].forEach((hz,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.1;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g);g.connect(a.destination);const pair={o,g};this.chimes.add(pair);o.onended=()=>{this.chimes.delete(pair);o.disconnect();g.disconnect();};o.start(t);o.stop(t+.34);});}
 effect(kind='click'){if(this.preferences.effects===false||document.hidden||!this.unlock())return;const ctx=this.context,now=ctx.currentTime,tones=kind==='success'?[523,659,784,1047]:kind==='place'?[420,840]:kind==='switch-close'?[620,290]:kind==='switch-open'?[380,180]:[700];tones.forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=now+i*(kind==='success'?.12:.035),duration=kind==='success'?.28:.075;o.type=kind.startsWith('switch')?'triangle':'sine';o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*.6,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==='click'?.018:.045,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(ctx.destination);const pair={o,g};this.chimes.add(pair);o.onended=()=>{this.chimes.delete(pair);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);});}
 stopChimes(){for(const {o,g} of this.chimes){try{o.stop();}catch{}o.disconnect();g.disconnect();}this.chimes.clear();}
 destroy(){this.pauseMusic();this.stopVoices();this.stopChimes();if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);this.music.remove();this.context?.close().catch(()=>{});}
}
window.IslandAudio=IslandAudio;
})();
