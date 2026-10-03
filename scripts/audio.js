/* CORE 1.9 — звуковой слой */
(() => {
  'use strict';
  const files={ambient:'audio/core-ambient-gentle.wav',tap:'audio/tap.wav',tap_heavy:'audio/tap_heavy.wav',tab:'audio/tab.wav',back:'audio/back.wav',upgrade:'audio/upgrade.wav',reward:'audio/reward.wav',charge:'audio/charge.wav'};
  let audioContext=null,masterGain=null,musicGain=null,musicBuffer=null,musicSource=null,audioLoading=null,musicWanted=false;
  const sfxBuffers={};
  const getSettings=()=>{try{return JSON.parse(localStorage.getItem('neonCoreSettings')||'null')||{}}catch{return{}}};
  const ensureAudio=()=>{if(audioContext)return audioContext;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;audioContext=new C();masterGain=audioContext.createGain();musicGain=audioContext.createGain();musicGain.connect(masterGain);masterGain.connect(audioContext.destination);return audioContext};
  const vol=(mult=1)=>Math.max(0,Math.min(1,(Number(getSettings().volume??70)||0)/100*mult));
  async function loadAudio(name,url){const c=ensureAudio();if(!c)return null;try{const b=await(await fetch(url,{cache:'force-cache'})).arrayBuffer();const d=await c.decodeAudioData(b);if(name==='ambient')musicBuffer=d;else sfxBuffers[name]=d;return d}catch{return null}}
  function stopMusic(reset=false){const el=document.querySelector('#core-music');if(el){el.pause();if(reset){try{el.currentTime=0}catch{}}}if(musicSource){try{musicSource.stop()}catch{}try{musicSource.disconnect()}catch{}musicSource=null}if(musicGain&&audioContext)musicGain.gain.setTargetAtTime(0,audioContext.currentTime,.035)}
  function syncMusic(fromGesture=false){const s=getSettings(),el=document.querySelector('#core-music');if(s.music===false||document.visibilityState!=='visible'){musicWanted=false;stopMusic(false);return}if(fromGesture)musicWanted=true;if(el){el.volume=vol(.34);if(!musicWanted)return;el.play().catch(()=>{});return}if(!musicGain||!audioContext)return;musicGain.gain.setTargetAtTime(vol(.34),audioContext.currentTime,.04);if(musicBuffer&&!musicSource&&musicWanted){musicSource=audioContext.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;musicSource.connect(musicGain);musicSource.start()}}
  async function unlockAudio(){const c=ensureAudio();if(c){try{await c.resume()}catch{}}if(!audioLoading)audioLoading=Promise.all(Object.entries(files).filter(([n])=>n!=='ambient').map(([n,u])=>getSettings().sounds===false?null:loadAudio(n,u))).finally(()=>audioLoading=null);await audioLoading;musicWanted=getSettings().music!==false;syncMusic(true)}
  function handleVisibility(){if(document.visibilityState==='hidden'){musicWanted=!!document.querySelector('#core-music')?.paused===false||musicWanted;stopMusic(false)}else{musicWanted=false;stopMusic(false)}}
  function sfx(name,m=.5){if(getSettings().sounds===false||!audioContext||!masterGain)return;try{const b=sfxBuffers[name];if(b){const src=audioContext.createBufferSource(),g=audioContext.createGain();src.buffer=b;g.gain.value=vol(m);src.connect(g).connect(masterGain);src.start();return}const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='triangle';o.frequency.value={tap:520,tap_heavy:760,tab:330,back:250,upgrade:620,reward:880,charge:180}[name]||440;g.gain.setValueAtTime(vol(m),audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);o.connect(g).connect(masterGain);o.start();o.stop(audioContext.currentTime+.13)}catch{}}
  const vibrate=(ms=8)=>{const s=getSettings();if(s.vibration!==false&&navigator.vibrate)try{navigator.vibrate(ms)}catch{}};
  const vibratePattern=(pattern)=>{const s=getSettings();if(s.vibration!==false&&navigator.vibrate)try{navigator.vibrate(pattern)}catch{}};
  document.addEventListener('visibilitychange',handleVisibility);
  window.addEventListener('pagehide',()=>stopMusic(true));
  window.addEventListener('beforeunload',()=>stopMusic(true));
  document.addEventListener('pointerdown',()=>{if(document.visibilityState==='visible')unlockAudio()},{passive:true});
  window.CORE_AUDIO={getSettings,unlockAudio,syncMusic,sfx,vibrate,vibratePattern};
})();
