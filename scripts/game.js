(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const loading = $('#loading'), game = $('#game'), commonUi = $('#common-ui');
  const progress = $('#progress'), percent = $('#percent'), core = $('.core-button');
  const subScreens = $$('.sub-screen'), navItems = $$('.nav-item'), backButton = $('.header-back'), sectionBack = $('#section-back'), avatarButton = $('.avatar-button');
  const commonHeader = $('.header'), headerTitle = $('#header-title'), headerContextValue = $('#header-context-value');
  const D=window.CORE_DATA, STORAGE=window.CORE_STORAGE, AUDIO=window.CORE_AUDIO;
  const {ECONOMY,MODULES,ITEMS,RESEARCH,QUESTS,ACHIEVEMENTS,SEASON_REWARDS,rarityOrder,GAME_KEY,SEASON_KEY,SEASON_LENGTH,MAX_CORE,fmt,rateFmt,defaultState}=D;
  const {getSettings,unlockAudio,syncMusic,sfx,vibrate,vibratePattern}=AUDIO;
  let state=STORAGE.loadState();
  let season=STORAGE.loadSeason(state);
  let activeScreen='home';
  function save(){STORAGE.saveState(state)}
  function loadSeason(){season=STORAGE.loadSeason(state);return season}
  function seasonInfo(){const elapsed=Math.max(0,Date.now()-season.startedAt);if(elapsed>=SEASON_LENGTH){season={number:season.number+1,startedAt:Date.now(),points:0,claimed:0};STORAGE.saveSeason(season);state.season={points:0,claimed:0};save()}return {days:Math.max(0,Math.ceil((SEASON_LENGTH-elapsed)/86400000)),points:season.points,level:Math.min(10,Math.floor(season.points/1000)+1),next:Math.min(10000,season.level?season.level*1000:1000)}}
  function addLog(text){state.logs=Array.isArray(state.logs)?state.logs:[];state.logs.unshift({at:Date.now(),text});state.logs=state.logs.slice(0,30)}
  function addSeasonPoints(n){season.points+=Math.max(0,Math.floor(n));state.season={points:season.points,claimed:season.claimed};STORAGE.saveSeason(season)}
  function achievementProgress(a){if(a.type==='taps')return state.totalTapped;if(a.type==='produced')return state.totalProduced;if(a.type==='core')return state.coreLevel;if(a.type==='modules')return Object.values(state.modules).reduce((x,y)=>x+y,0);if(a.type==='research')return Object.keys(state.research).length;if(a.type==='inventory')return Object.values(state.inventory).reduce((x,y)=>x+y,0);if(a.type==='resonance')return state.resonance;if(a.type==='season')return season.points;return 0}
  function checkAchievements(){ACHIEVEMENTS.forEach(a=>{if(state.achievements[a.id])return;if(achievementProgress(a)>=a.goal){state.achievements[a.id]=Date.now();state.energy+=a.reward;addLog(`Достижение: ${a.name}`);showToast('ДОСТИЖЕНИЕ',a.name);addSeasonPoints(100)}})}
  function upgradeCost(level){return Math.round(ECONOMY.upgradeBaseCost*Math.pow(ECONOMY.upgradeGrowth,Math.max(0,level-1)))}
  function hasResearch(id){return !!state.research?.[id]}
  function systemStability(){const bonus=(Number(state.modules.stability)||0)*2.4+(hasResearch('stabilizer')?3:0)+(hasResearch('synchronization')?2:0);return Math.max(0,Math.min(100,100-(Number(state.heat)||0)*.46-(Number(state.wear)||0)*.42+bonus))}
  function systemEfficiency(){const heat=Math.max(0,Number(state.heat)||0);const flow=1+(Number(state.modules.flow)||0)*.012+(hasResearch('flow')?.02:0)+(hasResearch('synchronization')?.02:0);return Math.max(.72,Math.min(1.12,(1-Math.max(0,heat-68)*.009)*flow))}
  function tapPower(){let v=(ECONOMY.baseTap+(Number(state.modules.tap)||0))*systemEfficiency();if(hasResearch('resonance'))v*=1.03;if(hasResearch('focus'))v*=1.03;if(hasResearch('density'))v*=1.04;return v}
  function autoRate(level){const m=state.modules.auto||0;if(!m)return 0;let v=MODULES.auto.rates[m]+Math.max(0,level-1)*.045;if(state.research.plasma)v*=1.05;if(state.inventory.stabilizer)v*=1.02;return v*(1+.02*state.resonanceStacks)*systemEfficiency()}
  function comboMax(level){return Math.min(3,1.2+Math.floor((level-1)/5)*.2+(state.modules.combo*.04)+(hasResearch('coherence')?.2:0))}
  function offlineParams(){let hours=8,eff=.5;if(state.modules.offline){hours+=state.modules.offline*1.1;eff+=state.modules.offline*.05}if(hasResearch('memory'))hours+=2;if(hasResearch('reserve'))eff+=.08;if(state.inventory.reactor)eff+=.08;return {hours,eff}}
  function grantOffline(now=Date.now()){if(!state.modules.auto){state.lastSavedAt=now;return 0}const p=offlineParams();const sec=Math.min(p.hours*3600,Math.max(0,(now-state.lastSavedAt)/1000));let gain=autoRate(state.coreLevel)*sec*p.eff;gain=Math.min(gain,upgradeCost(state.coreLevel)*(.6+(state.modules.offline*.08)));if(gain>=1){state.energy+=gain;state.totalProduced+=gain;state.lastOfflineGain=gain}else state.lastOfflineGain=0;state.lastSavedAt=now;return gain}
  const offline=grantOffline();
  let lastTap=0,comboCount=0,tapMomentum=1;
  let anomalyCheckLast=performance.now();
  const ANOMALY_COOLDOWN=90000;
  let activeAnomaly=null;
  const anomalyDefs={
    flow:{title:'СДВИГ ПОТОКА',sub:'Плазменные потоки меняют направление.',pattern:[18,34,18],sound:'charge'},
    overload:{title:'ПЕРЕГРУЗКА',sub:'Ядро удерживает избыточную энергию.',pattern:[45,28,45],sound:'tap_heavy'},
    quiet:{title:'ТИХАЯ ЗОНА',sub:'Движение ядра почти полностью затихло.',pattern:[8,55,8,55,8],sound:'back'},
    rupture:{title:'РАЗРЫВ СТАБИЛЬНОСТИ',sub:'Структура ядра теряет устойчивость на короткий период.',pattern:[28,18,42,18,28],sound:'tap_heavy'}
  };
  function anomalyCandidate(){
    const heat=Number(state.heat)||0, wear=Number(state.wear)||0, stability=systemStability();
    if(wear>=72 && stability<=42)return 'rupture';
    if(heat>=78)return 'overload';
    if(stability<=58 || wear>=45)return 'flow';
    if(nowSinceStart()>45000 && heat<32)return 'quiet';
    return null;
  }
  let gameStartedAt=performance.now();
  function nowSinceStart(){return performance.now()-gameStartedAt}
  function setAnomalyVisual(type){
    if(!game)return;
    game.classList.remove('anomaly-flow','anomaly-overload','anomaly-quiet','anomaly-rupture');
    if(type) game.classList.add(`anomaly-${type}`);
    game.style.setProperty('--anomaly-strength', type ? '1' : '0');
  }
  function finishAnomaly(){
    activeAnomaly=null;
    setAnomalyVisual(null);
  }
  function triggerAnomaly(type){
    const d=anomalyDefs[type];
    if(!d || activeAnomaly)return;
    activeAnomaly=type;
    setAnomalyVisual(type);
    state.anomalies=state.anomalies||{lastAt:0,count:0};
    state.anomalies.lastAt=Date.now();state.anomalies.count=(state.anomalies.count||0)+1;
    addLog(`Аномалия: ${d.title}`);
    sfx(d.sound,.22);vibratePattern(d.pattern);
    showAnomaly(type);
  }
  function showAnomaly(type){
    const d=anomalyDefs[type];
    let e=$('#core-anomaly');
    if(!e){
      e=document.createElement('div');e.id='core-anomaly';
      e.innerHTML='<div class="core-anomaly-panel"><small>АНОМАЛИЯ</small><strong></strong><span></span><div class="core-anomaly-actions"></div></div>';
      document.body.appendChild(e);
    }
    const actions=$('.core-anomaly-actions',e);
    actions.innerHTML='';
    const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(!activeAnomaly)return;fn();finishAnomaly();e.classList.remove('show')};actions.appendChild(b)};
    if(type==='flow'){
      add('СТАБИЛИЗИРОВАТЬ',()=>{state.energy=Math.max(0,state.energy-25);state.heat=Math.max(0,(Number(state.heat)||0)-8);state.resonanceBalance=(Number(state.resonanceBalance)||0)+1;addLog('Сдвиг потока стабилизирован');sfx('reward',.35);vibratePattern([12,24,12]);showToast('ПОТОК СТАБИЛИЗИРОВАН','+1 РЕЗОНАНС');renderAll();save()});
      add('НАБЛЮДАТЬ',()=>{state.resonanceBalance=(Number(state.resonanceBalance)||0)+2;addLog('Сдвиг потока наблюдался');sfx('charge',.28);vibratePattern([10,40,10]);showToast('НАБЛЮДЕНИЕ ЗАВЕРШЕНО','+2 РЕЗОНАНС');renderAll();save()});
    }else if(type==='overload'){
      add('СБРОСИТЬ',()=>{state.energy=Math.max(0,state.energy-Math.round(state.energy*.08));state.heat=Math.max(0,(Number(state.heat)||0)-22);addLog('Перегрузка сброшена');sfx('back',.32);vibratePattern([35,20,35]);showToast('ПЕРЕГРУЗКА СБРОШЕНА','Тепловая нагрузка снижена');renderAll();save()});
      add('УДЕРЖИВАТЬ',()=>{state.heat=Math.min(100,(Number(state.heat)||0)+8);state.resonanceBalance=(Number(state.resonanceBalance)||0)+4;addLog('Перегрузка удержана');sfx('charge',.34);vibratePattern([18,18,18,18,45]);showToast('ПЕРЕГРУЗКА УДЕРЖАНА','+4 РЕЗОНАНС');renderAll();save()});
    }else if(type==='rupture'){
      add('СТАБИЛИЗИРОВАТЬ',()=>{state.energy=Math.max(0,state.energy-40);state.heat=Math.max(0,(Number(state.heat)||0)-10);state.wear=Math.max(0,(Number(state.wear)||0)-3);addLog('Разрыв стабильности локализован');sfx('reward',.34);vibratePattern([14,28,14,45]);showToast('СТАБИЛЬНОСТЬ ВОССТАНОВЛЕНА','Нагрузка на ядро снижена');renderAll();save()});
      add('ПЕРЕЖДАТЬ',()=>{state.heat=Math.min(100,(Number(state.heat)||0)+4);state.wear=Math.min(100,(Number(state.wear)||0)+1.5);state.resonanceBalance=(Number(state.resonanceBalance)||0)+3;addLog('Разрыв стабильности пережит');sfx('charge',.3);vibratePattern([10,24,10,24,60]);showToast('РАЗРЫВ ПЕРЕЖИТ','+3 РЕЗОНАНС');renderAll();save()});
    }else{
      add('ИССЛЕДОВАТЬ',()=>{state.signals=(Number(state.signals)||0)+1;state.resonanceBalance=(Number(state.resonanceBalance)||0)+1;addLog('Тихая зона исследована');sfx('reward',.25);vibratePattern([8,70,8]);showToast('ТИХАЯ ЗОНА ИССЛЕДОВАНА','+1 СИГНАЛ · +1 РЕЗОНАНС');renderAll();save()});
      add('ИГНОРИРОВАТЬ',()=>{addLog('Тихая зона проигнорирована');vibratePattern([6,60,6]);showToast('АНОМАЛИЯ ИСЧЕЗЛА','');renderAll();save()});
    }
    $('strong',e).textContent=d.title;$('span',e).textContent=d.sub;e.classList.add('show');
  }


  // Загрузка вынесена в собственный цикл, без таймера setInterval.
  let loadingProgress=0,loadingLast=performance.now();
  function loadingFrame(now){const dt=Math.min(80,now-loadingLast);loadingLast=now;loadingProgress+=Math.max(1.5,dt*.045);if(loadingProgress>=100){loadingProgress=100;loading?.classList.add('hidden');game?.classList.remove('hidden');commonUi?.classList.remove('hidden')}progress&&(progress.style.width=loadingProgress+'%');percent&&(percent.textContent=Math.floor(loadingProgress));if(loadingProgress<100)requestAnimationFrame(loadingFrame)}
  requestAnimationFrame(loadingFrame);
  function coreTier(){return Math.min(5,Math.ceil(state.coreLevel/5))}
  function setCoreVisual(){core?.setAttribute('data-core-tier',coreTier());core?.style.setProperty('--core-progress',String((state.coreLevel-1)%5/4));const lvl=$('#home-core-level');if(lvl)lvl.textContent=state.coreLevel}
  function renderHeaderContext(){
    const isHome=currentScreen()==='home';
    commonHeader?.classList.toggle('home-header',isHome);
    commonHeader?.classList.toggle('contextual-header',!isHome);
    sectionBack?.classList.toggle('hidden',isHome);
  }
  function currentScreen(){return activeScreen}
  const screens={upgrade:$('#upgrade-screen'),quests:$('#quests-screen'),inventory:$('#inventory-screen'),settings:$('#settings-screen'),profile:$('#profile-screen'),shop:null,research:null,resonance:null,season:null};
  function setNav(name){const idx=['upgrade','quests','home','inventory','settings'].indexOf(name);const nav=$('.bottom-nav');if(nav)nav.style.setProperty('--nav-index',idx<0?2:idx);$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.screen===name))}
  let screenTransitionBusy=false;
  function runScreenChange(name){
    activeScreen=name;
    setRadialMenu?.(false);
    ensureFeatureScreens();
    $$('.sub-screen').forEach(x=>x.classList.add('hidden'));
    if(name==='home') game?.classList.remove('hidden');
    else { game?.classList.add('hidden'); screens[name]?.classList.remove('hidden'); }
    commonUi?.classList.toggle('is-home',name==='home');
    commonUi?.classList.remove('hidden');
    backButton?.classList.add('hidden');
    sectionBack?.classList.toggle('hidden',name==='home');
    setNav(name);
    renderHeaderContext();
    renderAll();
    if(name==='profile')renderProfile();
    if(name==='season')renderSeason();
    if(name==='shop')renderShopScreen();
    if(name==='research')renderResearchScreen();
    if(name==='resonance')renderResonanceScreen();
  }
  function openScreen(name){
    if(!name || name===activeScreen || screenTransitionBusy)return;
    screenTransitionBusy=true;
    let layer=$('#screen-transition');
    if(!layer){layer=document.createElement('div');layer.id='screen-transition';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer)}
    layer.classList.remove('show');
    requestAnimationFrame(()=>{
      layer.classList.add('show');
      setTimeout(()=>{
        runScreenChange(name);
        requestAnimationFrame(()=>{
          layer.classList.remove('show');
          setTimeout(()=>{screenTransitionBusy=false},220);
        });
      },130);
    });
  }
  window.CORE=window.CORE||{};
  window.CORE.openScreen=(name)=>runScreenChange(name);

  function setRadialMenu(open){
    const menu=$('[data-radial-menu]');
    const toggle=$('[data-radial-toggle]');
    if(!menu)return;
    menu.classList.toggle('is-open',open);
    toggle?.setAttribute('aria-expanded',open?'true':'false');
    toggle?.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    const icon=toggle?.querySelector('i');
    if(icon)icon.className=open?'fa-solid fa-xmark':'fa-solid fa-bars-staggered';
  }

  function signalType(title,sub=''){
    const text=`${title} ${sub}`.toUpperCase();
    if(/УГРОЗ|НЕСООТВЕТСТВ|СБОЙ|РАЗРЫВ|КРИТИЧ|ОПАС|ПЕРЕГРУЗ/.test(text))return 'danger';
    if(/ВНИМАН|ПРЕДУП|ПОВЫША|ПОВЫШЕН|СНИЖА|СНИЖЕН|НЕСТАБИЛ|НАГРУЗКА|ТЕМПЕРАТУР|СТАБИЛЬНОСТЬ СНИЖ/.test(text))return 'warning';
    return 'good';
  }
  const signalQueue=[];
  let signalBusy=false;
  function ensureSignalLayer(){
    let layer=$('#core-signals');
    if(!layer){
      layer=document.createElement('div');
      layer.id='core-signals';
      layer.setAttribute('aria-live','polite');
      layer.setAttribute('aria-atomic','false');
      (game||document.body).appendChild(layer);
    }
    return layer;
  }
  function runNextSignal(){
    if(signalBusy||!signalQueue.length)return;
    signalBusy=true;
    const item=signalQueue.shift();
    const layer=ensureSignalLayer();
    const t=document.createElement('div');
    const danger=item.type==='danger';
    t.className=`core-signal signal-${item.type}`;
    t.innerHTML=`<span class="core-signal-dot" aria-hidden="true"></span><span class="core-signal-copy"><strong>${item.title}</strong>${item.sub?`<small>${item.sub}</small>`:''}</span>`;
    layer.appendChild(t);
    // Красные сигналы выходят и возвращаются немного быстрее, но движение остаётся плавным.
    const inMs=danger?560:760;
    const holdMs=5000;
    const outMs=danger?560:760;
    t.style.setProperty('--signal-in',`${inMs}ms`);
    t.style.setProperty('--signal-out',`${outMs}ms`);
    requestAnimationFrame(()=>t.classList.add('is-visible'));
    window.setTimeout(()=>{
      if(!t.isConnected)return;
      t.classList.add('is-leaving');
      window.setTimeout(()=>{
        t.remove();
        signalBusy=false;
        runNextSignal();
      },outMs+60);
    },inMs+holdMs);
  }
  function showToast(title,sub=''){
    signalQueue.push({title,sub,type:signalType(title,sub)});
    // Не даём вторичным событиям бесконечно накапливаться.
    if(signalQueue.length>6)signalQueue.splice(0,signalQueue.length-6);
    runNextSignal();
  }
  function showEvent(title,sub){let e=$('#core-event');if(!e){e=document.createElement('div');e.id='core-event';e.innerHTML='<div class="core-event-panel"><small>СОБЫТИЕ CORE</small><strong></strong><span></span><button>ПРОДОЛЖИТЬ</button></div>';document.body.appendChild(e);e.querySelector('button').onclick=()=>e.classList.remove('show')}e.querySelector('strong').textContent=title;e.querySelector('span').textContent=sub;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3200)}
  function tapNumber(amount,critical=false){if(getSettings().numberEffects===false)return;const layer=$('#tap-feedback');if(!layer)return;const x=document.createElement('span');x.className='tap-number'+(critical?' critical':'');x.textContent='+'+fmt(amount);x.style.left=(42+Math.random()*16)+'%';x.style.top=(42+Math.random()*10)+'%';layer.appendChild(x);setTimeout(()=>x.remove(),800)}

  function doTap(){const now=performance.now(),gap=lastTap?now-lastTap:9999;comboCount=gap<=ECONOMY.comboWindowMs?comboCount+1:1;lastTap=now;const mult=Math.min(comboMax(state.coreLevel),1+Math.floor(comboCount/ECONOMY.comboStep)*ECONOMY.comboBonus);const amount=tapPower(state.coreLevel)*mult;state.energy+=amount;state.totalTapped+=amount;state.heat=Math.min(100,(Number(state.heat)||0)+(2.15+amount*.08)*(1-Math.min(.34,(Number(state.modules.flow)||0)*.035+(hasResearch('flow')?.06:0))));tapNumber(amount,mult>1&&comboCount%10===0);tapMomentum=tapMomentum*.45+(1+Math.max(0,Math.min(1,(520-gap)/420))*3.8)*.55;window.CORE_VISUAL_MOMENTUM=tapMomentum;sfx(gap<190?'tap_heavy':'tap',.5);if(mult>1&&comboCount%10===0)sfx('charge',.16);return amount}
  core?.addEventListener('click',()=>{const a=doTap();addSeasonPoints(1);checkAchievements();renderAll();save();});
  // Единый игровой цикл 1.8: расчёт, редкое обновление DOM и сохранение работают из одного requestAnimationFrame.
  let simLast=performance.now(),uiLast=0,saveLast=performance.now(),seasonLast=performance.now();
  function frameLoop(now){
    const dt=Math.min(100,now-simLast)/1000;
    simLast=now;
    const r=autoRate(state.coreLevel);
    if(r){const gain=r*dt;state.energy+=gain;state.totalProduced+=gain;state.heat=Math.min(100,(Number(state.heat)||0)+gain*.18*dt*(1-Math.min(.34,(Number(state.modules.flow)||0)*.035+(hasResearch('flow')?.06:0))))}
    const heat=Math.max(0,Number(state.heat)||0);
    const cooling=(1+(Number(state.modules.cooling)||0)*.07)*(hasResearch('cooling')?1.08:1);
    state.heat=Math.max(0,heat-(2.9+Math.max(0,1-heat/100)*.9)*cooling*dt);
    const protection=Math.max(.38,(1-(Number(state.modules.protection)||0)*.08)*(hasResearch('shielding')?.94:1));
    state.wear=Math.min(100,(Number(state.wear)||0)+(0.00022+heat/100*.00145)*protection*dt);
    if(state.coreLevel<MAX_CORE && state.energy>=upgradeCost(state.coreLevel) && lastCoreReadyNoticeLevel!==state.coreLevel){
      showToast('ЯДРО ГОТОВО','Доступно улучшение ядра');
      lastCoreReadyNoticeLevel=state.coreLevel;
    }
    window.CORE_VISUAL?.tick(now,tapMomentum);
    if(now-uiLast>=100){uiLast=now;renderEconomy();renderSystemState()}
    if(now-saveLast>=10000){saveLast=now;save()}
    if(now-seasonLast>=60000){seasonLast=now;seasonInfo();renderHeaderContext()}
    if(now-anomalyCheckLast>=5000){
      anomalyCheckLast=now;
      const last=Number(state.anomalies?.lastAt)||0;
      if(!activeAnomaly && Date.now()-last>=ANOMALY_COOLDOWN){
        const candidate=anomalyCandidate();
        const chance=candidate==='rupture'?.42:candidate==='overload'?.32:candidate==='flow'?.22:.16;
        if(candidate && Math.random()<chance)triggerAnomaly(candidate);
      }
    }
    requestAnimationFrame(frameLoop);
  }
  requestAnimationFrame(frameLoop);

  function upgradeCore(){if(state.coreLevel>=MAX_CORE)return;if(state.energy<upgradeCost(state.coreLevel))return;const old=state.coreLevel;pendingLevelRollFrom=old;lastCoreReadyNoticeLevel=null;state.energy-=upgradeCost(old);state.coreLevel++;state.upgradesBought++;addSeasonPoints(20);addLog(`Ядро улучшено до уровня ${state.coreLevel}`);checkAchievements();sfx('upgrade',.65);vibrate(14);setCoreVisual();if([5,10,15,20,25].includes(state.coreLevel))showEvent('ЯДРО ЭВОЛЮЦИОНИРОВАЛО',`Стадия ${coreTier()} • уровень ${state.coreLevel}`);else showToast('ЯДРО УСИЛЕНО',`УРОВЕНЬ ${state.coreLevel}`);renderAll();save()}
  function moduleCost(k){const m=MODULES[k],l=state.modules[k]||0;return Math.round(m.cost*Math.pow(m.growth,l))}
  let modulePurchaseLock=false;
  function buyModule(k){
    if(modulePurchaseLock)return;
    const l=state.modules[k]||0;if(l>=5)return;const c=moduleCost(k);if(state.energy<c)return;
    modulePurchaseLock=true;
    state.energy-=c;state.modules[k]=l+1;addSeasonPoints(30);addLog(`Модуль улучшен: ${MODULES[k].name} · ур. ${l+1}`);checkAchievements();sfx('upgrade',.55);showToast('МОДУЛЬ УЛУЧШЕН',`${MODULES[k].name} · УР. ${l+1}`);renderAll();save();window.setTimeout(()=>{modulePurchaseLock=false},120)}

  function renderSystemState(){
    const heat=Math.max(0,Math.min(100,Number(state.heat)||0));
    const wear=Math.max(0,Math.min(100,Number(state.wear)||0));
    const stability=systemStability();
    const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v};
    set('home-heat',Math.round(heat)+'%');
    set('home-wear',Math.round(wear)+'%');
    set('home-stability',Math.round(stability)+'%');
    const bar=(id,v)=>{const e=$('#'+id);if(e)e.style.width=v+'%'};
    bar('home-heat-bar',heat);bar('home-wear-bar',wear);bar('home-stability-bar',stability);
    game?.style.setProperty('--system-heat',heat/100);
    game?.style.setProperty('--system-stability',stability/100);
    game?.classList.toggle('system-hot',heat>=68);
    game?.classList.toggle('system-critical',heat>=88||stability<45);
    game?.classList.toggle('system-worn',wear>=55);
  }

  let pendingLevelRollFrom=null;
  let lastCoreReadyNoticeLevel=null;
  function renderLevelRoller(id,value,animate=false){
    const el=$('#'+id); if(!el)return;
    const nextText=String(value);
    const hasRenderedValue=Object.prototype.hasOwnProperty.call(el.dataset,'levelValue');
    const oldText=hasRenderedValue ? el.dataset.levelValue : '';
    if(hasRenderedValue && oldText===nextText && !animate){return;}
    const oldChars=String(oldText).padStart(nextText.length,' '), newChars=nextText;
    const digits=document.createElement('span'); digits.className='level-digits';
    const len=Math.max(oldChars.length,newChars.length);
    for(let i=0;i<len;i++){
      const a=oldChars[i]??' ', b=newChars[i]??' ';
      const slot=document.createElement('span'); slot.className='level-digit';
      if(animate && a!==b && a!==' '){
        slot.classList.add('is-rolling');
        const oldDigit=document.createElement('span'); oldDigit.textContent=a;
        const newDigit=document.createElement('span'); newDigit.textContent=b;
        slot.append(oldDigit,newDigit);
      }else{
        const digit=document.createElement('span'); digit.textContent=b===' '?'':b; slot.append(digit);
      }
      digits.append(slot);
    }
    el.replaceChildren(digits); el.dataset.levelValue=nextText;
    if(animate){
      el.classList.remove('level-pulse'); void el.offsetWidth; el.classList.add('level-pulse');
      window.setTimeout(()=>el.classList.remove('level-pulse'),1200);
    }
  }
  function levelSparks(){
    const host=$('#upgrade-level-sparks'); if(!host)return;
    host.replaceChildren();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced)return;
    for(let i=0;i<10;i++){
      const e=document.createElement('i'); e.className='upgrade-level-spark';
      const a=(Math.PI*2*i/10)+(Math.random()-.5)*.45, r=28+Math.random()*18;
      e.style.setProperty('--dx',`${Math.cos(a)*r}px`); e.style.setProperty('--dy',`${Math.sin(a)*r}px`);
      e.style.setProperty('--delay',`${Math.random()*90}ms`); host.append(e);
    }
    window.setTimeout(()=>host.replaceChildren(),950);
  }

  function renderEconomy(){const prod=autoRate(state.coreLevel),tap=tapPower(state.coreLevel),next=state.coreLevel<MAX_CORE?tapPower(state.coreLevel+1):tap;const cost=upgradeCost(state.coreLevel);const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v};set('balance',fmt(state.energy));set('production-value','+'+rateFmt(prod));set('core-level',state.coreLevel);set('player-level',state.coreLevel);set('home-player-level',state.coreLevel);set('home-energy',fmt(state.energy));set('home-production','+'+rateFmt(prod));set('home-tap-power',rateFmt(tap));set('home-core-level',state.coreLevel);set('home-resonance-balance',fmt(state.resonanceBalance));set('home-signals',fmt(state.signals));set('profile-player-level',state.coreLevel);set('profile-balance',fmt(state.energy));set('profile-core-level',state.coreLevel);renderLevelRoller('upgrade-level',state.coreLevel, pendingLevelRollFrom!==null && pendingLevelRollFrom!==state.coreLevel);renderLevelRoller('upgrade-next-level',Math.min(MAX_CORE,state.coreLevel+1),false);if(pendingLevelRollFrom!==null && pendingLevelRollFrom!==state.coreLevel){levelSparks();pendingLevelRollFrom=null;}set('upgrade-production',`${rateFmt(prod)} → ${rateFmt(autoRate(Math.min(MAX_CORE,state.coreLevel+1)))}/СЕК`);set('upgrade-tap',`${rateFmt(tap)} → ${rateFmt(next)}`);set('upgrade-cost',state.coreLevel>=MAX_CORE?'МАКС':fmt(cost));set('upgrade-energy-chip',fmt(state.energy));const b=$('#upgrade-buy');if(b){b.disabled=state.coreLevel>=MAX_CORE||state.energy<cost;b.classList.toggle('is-ready',!b.disabled)}setCoreVisual();renderModules()}
  function renderModules(){const host=$('.upgrade-cards');if(!host)return;host.innerHTML=Object.keys(MODULES).map(k=>{const m=MODULES[k],l=state.modules[k]||0,c=moduleCost(k);return `<button class="upgrade-card ${l>=5?'owned':''} ${l<5&&state.energy>=c?'is-ready':''}" data-module="${k}"><span class="upgrade-card-icon"><i class="fa-solid ${({auto:'fa-gears',tap:'fa-hand-pointer',combo:'fa-link',offline:'fa-battery-full',stability:'fa-shield-heart',cooling:'fa-snowflake',protection:'fa-shield-halved',flow:'fa-water'}[k]||'fa-microchip')}"></i></span><span class="upgrade-card-copy"><strong class="module-title">${m.name}</strong><small class="module-desc">${m.desc}</small></span><span class="module-level">УР. ${l}/5</span><span class="upgrade-card-bottom"><b>${l>=5?'МАКС':fmt(c)}</b><em>${l>=5?'МОДУЛЬ':'ЭНЕРГИИ'}</em></span></button>`}).join('')}

  function shopHTML(){const groups=[1,6,11,16,21];return `<div class="core-page-head"><div><small>РЕСУРСНЫЙ ЦЕНТР</small><h2>МАГАЗИН</h2></div><button class="ghost-close" data-close-overlay>×</button></div><div class="shop-tabs">${groups.map((g,i)=>`<button data-shop-tier="${g}" class="${state.coreLevel>=g?'':'locked'}">${i+1}</button>`).join('')}</div><div id="shop-items" class="item-grid"></div>`}
  function renderShop(){const host=$('#core-shop-items');if(!host)return;host.innerHTML=Object.entries(ITEMS).map(([id,it])=>{const locked=state.coreLevel<it.unlock,owned=state.inventory[id]||0;return `<button class="item-card rarity-${it.rarity.toLowerCase()} ${locked?'locked':''}" data-buy-item="${id}" ${locked?'disabled':''}><span class="item-icon"><i class="fa-solid ${it.icon}"></i></span><span class="item-rarity">${it.rarity}</span><strong>${it.name}</strong><small>${locked?'ОТКРОЕТСЯ НА УР. '+it.unlock:it.desc}</small><b>${locked?'ЗАКРЫТО':fmt(it.price)+' ЭНЕРГИИ'}</b><em>×${owned}</em></button>`}).join('');$$('[data-buy-item]',host).forEach(b=>b.onclick=()=>buyItem(b.dataset.buyItem))}
  function buyItem(id){const it=ITEMS[id];if(!it||state.coreLevel<it.unlock||state.energy<it.price)return;state.energy-=it.price;state.inventory[id]=(state.inventory[id]||0)+1;sfx('reward',.45);showToast('ПРЕДМЕТ ПОЛУЧЕН',it.name);renderAll();save()}
  function useItem(id){const n=state.inventory[id]||0;if(!n)return;if(id==='plasma'){state.energy+=120;state.totalProduced+=120;state.inventory[id]--}else if(id==='singularity'){state.resonanceStacks++;state.inventory[id]--;showEvent('СИНГУЛЯРНОСТЬ АКТИВНА','Постоянный стек РЕЗОНАНСА добавлен.')}else return;renderAll();save()}
  function inventoryHTML(){const slots=Object.values(state.inventory).reduce((a,b)=>a+b,0);return `<main class="sub-content core-inventory"><div class="core-page-head"><div><small>ХРАНИЛИЩЕ СИСТЕМЫ</small><h2>ИНВЕНТАРЬ</h2></div><div class="page-stat">${slots}/20</div></div><div class="inventory-grid">${Object.entries(ITEMS).map(([id,it])=>{const n=state.inventory[id]||0;return `<div class="inventory-item rarity-${it.rarity.toLowerCase()} ${n?'has-item':''}"><span class="item-icon"><i class="fa-solid ${it.icon}"></i></span><div><strong>${it.name}</strong><small>${it.rarity}</small></div><b>×${n}</b>${(id==='plasma'||id==='singularity')&&n?`<button data-use-item="${id}">АКТИВИРОВАТЬ</button>`:''}</div>`}).join('')}</div><button class="wide-action" data-open-shop>ОТКРЫТЬ МАГАЗИН</button></main>`}
  function questsHTML(){return `<main class="sub-content core-quests"><div class="core-page-head"><div><small>ЦЕЛИ ОПЕРАТОРА</small><h2>ЗАДАНИЯ</h2></div><div class="page-stat">${QUESTS.filter(q=>state.quests[q.id]).length}/${QUESTS.length}</div></div><div class="quest-list">${QUESTS.map(q=>{const p=questProgress(q);const done=!!state.quests[q.id];return `<div class="quest-card ${done?'done':''}"><div class="quest-icon"><i class="fa-solid ${done?'fa-check':'fa-crosshairs'}"></i></div><div class="quest-copy"><strong>${q.name}</strong><small>${q.desc}</small><div class="quest-bar"><span style="width:${Math.min(100,p/q.goal*100)}%"></span></div><em>${Math.min(q.goal,Math.floor(p))} / ${q.goal}</em></div><b>+${fmt(q.reward)}</b>${!done&&p>=q.goal?`<button data-claim-quest="${q.id}">ЗАБРАТЬ</button>`:''}</div>`}).join('')}</div></main>`}
  function questProgress(q){if(q.type==='taps')return state.totalTapped; if(q.type==='produced')return state.totalProduced; if(q.type==='upgrades')return state.upgradesBought; if(q.type==='modules')return Object.values(state.modules).reduce((a,b)=>a+b,0); if(q.type==='core')return state.coreLevel; if(q.type==='research')return Object.keys(state.research).length; if(q.type==='inventory')return Object.values(state.inventory).reduce((a,b)=>a+b,0); if(q.type==='resonance')return state.resonance; if(q.type==='season')return season.points; return 0}
  function claimQuest(id){const q=QUESTS.find(x=>x.id===id);if(!q||state.quests[id]||questProgress(q)<q.goal)return;state.quests[id]=Date.now();const bonus=hasResearch('lattice')?1.05:1;state.energy+=q.reward*bonus;addSeasonPoints(Math.max(50,Math.floor(q.reward/2)));addLog(`Задание выполнено: ${q.name}`);showToast('ЗАДАНИЕ ВЫПОЛНЕНО',q.name);sfx('reward',.6);renderAll();save()}
  function researchDataList(){return Object.values(RESEARCH).sort((a,b)=>(a.layer||0)-(b.layer||0)||(a.x||0)-(b.x||0))}
  function researchLocked(r){return state.coreLevel<r.unlock||(r.req||[]).some(id=>!hasResearch(id))}
  function researchStatus(r){if(hasResearch(r.id))return 'ИССЛЕДОВАНО';if(state.coreLevel<r.unlock)return `ОТКРОЕТСЯ НА УР. ${r.unlock}`;const missing=(r.req||[]).filter(id=>!hasResearch(id));if(missing.length)return 'ТРЕБУЕТСЯ ПРЕДЫДУЩЕЕ ИССЛЕДОВАНИЕ';if(state.energy<r.cost)return 'НЕДОСТАТОЧНО ЭНЕРГИИ';return 'ДОСТУПНО'}
  function researchHTML(){
    const rs=researchDataList();
    const positions=rs.map(r=>`<button class="research-node ${hasResearch(r.id)?'done':''} ${researchLocked(r)?'locked':''}" style="--x:${r.x}%;--layer:${r.layer}" data-research="${r.id}" aria-label="${r.name}"><span class="research-node-glow"></span><span class="research-node-core"><i class="fa-solid ${r.icon||'fa-flask'}"></i></span><strong>${r.name}</strong><small>${researchStatus(r)}</small></button>`).join('');
    const links=[];
    rs.forEach(r=>(r.req||[]).forEach(req=>{const a=RESEARCH[req];if(!a)return;links.push(`<path class="research-link ${hasResearch(req)&&hasResearch(r.id)?'active':''}" d="M ${a.x*3.6} ${(a.layer*150)+44} C ${a.x*3.6} ${(a.layer*150)+94}, ${r.x*3.6} ${(r.layer*150)-40}, ${r.x*3.6} ${(r.layer*150)+44}"/>`)}));
    return `<div class="research-page-head"><div><small>ИССЛЕДОВАТЕЛЬСКИЙ КОНТУР</small><h2>ИССЛЕДОВАНИЯ</h2><span>ТЕХНОЛОГИИ И ПРОТОКОЛЫ</span></div><div class="research-energy"><small>ЭНЕРГИЯ</small><strong>${fmt(state.energy)}</strong></div></div><div class="research-atmosphere" aria-hidden="true"><i class="research-light research-light-a"></i><i class="research-light research-light-b"></i><i class="research-light research-light-c"></i><div class="research-stars"><i class="research-star s1"></i><i class="research-star s2"></i><i class="research-star s3"></i><i class="research-star s4"></i><i class="research-star s5"></i><i class="research-star s6"></i><i class="research-star s7"></i><i class="research-star s8"></i><i class="research-star s9"></i><i class="research-star s10"></i><i class="research-star s11"></i><i class="research-star s12"></i><i class="research-star s13"></i><i class="research-star s14"></i><i class="research-star s15"></i><i class="research-star s16"></i><i class="research-star s17"></i><i class="research-star s18"></i><i class="research-star s19"></i><i class="research-star s20"></i><i class="research-star s21"></i><i class="research-star s22"></i><i class="research-star s23"></i><i class="research-star s24"></i><i class="research-star s25"></i><i class="research-star s26"></i><i class="research-star s27"></i><i class="research-star s28"></i><i class="research-star s29"></i><i class="research-star s30"></i><i class="research-star s31"></i><i class="research-star s32"></i><i class="research-star s33"></i><i class="research-star s34"></i><i class="research-star s35"></i><i class="research-star s36"></i></div><i class="research-dust research-dust-a"></i><i class="research-dust research-dust-b"></i><i class="research-dust research-dust-c"></i><i class="research-dust research-dust-d"></i></div><div class="research-viewport"><div class="research-depth" aria-hidden="true"></div><div class="research-tree-v2"><svg class="research-links" viewBox="0 0 360 1200" preserveAspectRatio="none" aria-hidden="true">${links.join('')}</svg><div class="research-nodes">${positions}</div></div></div><div class="research-detail" id="research-detail" aria-live="polite" aria-hidden="true"></div>`;
  }
  function openResearchDetail(id){
    const r=RESEARCH[id], panel=$('#research-detail');if(!r||!panel)return;
    const done=hasResearch(id),locked=researchLocked(r),missing=(r.req||[]).filter(x=>!hasResearch(x));
    const opens=(r.opens||[]).map(x=>RESEARCH[x]?.name).filter(Boolean);
    panel.innerHTML=`<div class="research-detail-inner"><button class="research-detail-close" data-research-close aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button><div class="research-detail-icon"><i class="fa-solid ${r.icon||'fa-flask'}"></i></div><div class="research-detail-copy"><small>ИССЛЕДОВАНИЕ</small><h3>${r.name}</h3><p>${r.description}</p><div class="research-detail-section"><span>НАЗНАЧЕНИЕ</span><strong>${r.purpose}</strong></div><div class="research-detail-section"><span>ЭФФЕКТЫ</span>${(r.effects||[]).map(x=>`<b>${x}</b>`).join('')}</div>${opens.length?`<div class="research-detail-section"><span>ОТКРЫВАЕТ</span>${opens.map(x=>`<b>→ ${x}</b>`).join('')}</div>`:''}<div class="research-detail-meta"><span>УР. ЯДРА <b>${r.unlock}</b></span><span>СТОИМОСТЬ <b>${fmt(r.cost)} ЭНЕРГИИ</b></span></div><button class="research-action ${done?'done':''}" data-research-buy="${r.id}" ${done||locked||state.energy<r.cost?'disabled':''}>${done?'✓ ИССЛЕДОВАНО':locked?(state.coreLevel<r.unlock?'НУЖЕН УРОВЕНЬ '+r.unlock:`НУЖНО: ${missing.map(x=>RESEARCH[x]?.name||x).join(' · ')}`):state.energy<r.cost?'НЕДОСТАТОЧНО ЭНЕРГИИ':'ИССЛЕДОВАТЬ'}</button></div></div>`;
    panel.classList.add('show');panel.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>panel.classList.add('visible'));
  }
  function closeResearchDetail(){const p=$('#research-detail');if(!p)return;p.classList.remove('visible');setTimeout(()=>{p.classList.remove('show');p.setAttribute('aria-hidden','true')},240)}
  function buyResearch(id){const r=RESEARCH[id];if(!r)return;if(hasResearch(id)){openResearchDetail(id);return}if(state.coreLevel<r.unlock){showToast('ИССЛЕДОВАНИЕ НЕДОСТУПНО','НУЖЕН УРОВЕНЬ '+r.unlock);return}if((r.req||[]).some(x=>!hasResearch(x))){showToast('ИССЛЕДОВАНИЕ НЕДОСТУПНО','СНАЧАЛА ЗАВЕРШИ ПРЕДЫДУЩИЕ ИССЛЕДОВАНИЯ');return}if(state.energy<r.cost){showToast('НЕДОСТАТОЧНО ЭНЕРГИИ',`НУЖНО ${fmt(r.cost)} • ЕСТЬ ${fmt(state.energy)}`);return}state.energy-=r.cost;state.research[id]=Date.now();addSeasonPoints(150);addLog(`Исследование завершено: ${r.name}`);showToast('ИССЛЕДОВАНИЕ ЗАВЕРШЕНО',r.name);sfx('reward',.5);checkAchievements();renderAll();renderResearchScreen();openResearchDetail(id);save()}
  function resonanceHTML(){const ready=state.coreLevel>=MAX_CORE;return `<div class="resonance-panel ${ready?'ready':''}"><small>НОВЫЙ ЦИКЛ РАЗВИТИЯ</small><h2>РЕЗОНАНС</h2><p>После 25 уровня можно начать новый цикл. Исследования и инвентарь сохраняются, а постоянные усиления остаются с тобой.</p><div class="resonance-stats"><span>ЦИКЛЫ <b>${state.resonance}</b></span><span>СТЕКИ <b>${state.resonanceStacks}</b></span></div><button id="resonance-buy" ${ready?'':'disabled'}>${ready?'АКТИВИРОВАТЬ РЕЗОНАНС':'НУЖЕН УРОВЕНЬ 25'}</button></div>`}
  function activateResonance(){if(state.coreLevel<MAX_CORE)return;if(!confirm('Активировать РЕЗОНАНС? Энергия, уровень ядра и модули сбросятся. Инвентарь и исследования сохранятся.'))return;state.resonance++;addSeasonPoints(500);addLog('Активирован новый цикл РЕЗОНАНС');state.resonanceStacks+=(hasResearch('singular')?1:0)+(hasResearch('synchronization')?1:0);state.energy=100;state.coreLevel=1;state.modules={auto:0,tap:0,combo:0,offline:0};state.upgradesBought=0;showEvent('РЕЗОНАНС АКТИВИРОВАН','Новый цикл развития начат.');renderAll();save()}

  function ensureFeatureScreens(){
    const defs={
      shop:['МАГАЗИН','РЕСУРСНЫЙ ЦЕНТР'],research:['ИССЛЕДОВАНИЯ','ТЕХНОЛОГИИ И ПРОТОКОЛЫ'],resonance:['РЕЗОНАНС','НОВЫЙ ЦИКЛ РАЗВИТИЯ'],season:['СЕЗОН','СЕЗОННАЯ ПРОГРЕССИЯ']
    };
    Object.entries(defs).forEach(([id,[title,kicker]])=>{if(screens[id])return;const el=document.createElement('section');el.id=id+'-screen';el.className='sub-screen hidden';el.innerHTML=`<div class="sub-screen-bg"></div><main class="sub-content feature-screen"><div class="feature-screen-head"><small>${kicker}</small><h2>${title}</h2></div><div class="feature-screen-body"></div></main>`;document.body.appendChild(el);screens[id]=el});
  }
  function renderShopScreen(){const h=screens.shop?.querySelector('.feature-screen-body');if(h)h.innerHTML=`<div class="item-grid">${Object.entries(ITEMS).map(([id,it])=>{const locked=state.coreLevel<it.unlock,owned=state.inventory[id]||0;return `<button class="item-card rarity-${rarityOrder[it.rarity]||1} ${locked?'locked':''}" data-buy-item="${id}" ${locked?'disabled':''}><span class="item-icon"><i class="fa-solid ${it.icon}"></i></span><span class="item-rarity">${it.rarity}</span><strong>${it.name}</strong><small>${locked?'Откроется на уровне '+it.unlock:it.desc}</small><b>${locked?'ЗАКРЫТО':fmt(it.price)+' ЭНЕРГИИ'}</b><em>×${owned}</em></button>`}).join('')}</div>`;$$('[data-buy-item]',h||document).forEach(b=>b.onclick=()=>buyItem(b.dataset.buyItem))}
  function renderResearchScreen(){const h=screens.research?.querySelector('.feature-screen-body');if(!h)return;h.innerHTML=researchHTML();$$('[data-research]',h).forEach(b=>b.onclick=()=>openResearchDetail(b.dataset.research));$('#research-detail')?.addEventListener('click',e=>{if(e.target.closest('[data-research-close]')){closeResearchDetail();return}const b=e.target.closest('[data-research-buy]');if(b)buyResearch(b.dataset.researchBuy)});setTimeout(()=>{$$('.research-link',h).forEach(p=>p.classList.toggle('active',p.classList.contains('active')))},0)}
  function renderResonanceScreen(){const h=screens.resonance?.querySelector('.feature-screen-body');if(h)h.innerHTML=resonanceHTML();$('#resonance-buy',h||document)?.addEventListener('click',activateResonance)}
  function renderSeason(){const h=screens.season?.querySelector('.feature-screen-body');if(!h)return;const info=seasonInfo(),lvl=Math.min(10,Math.floor(info.points/1000)+1),claimed=season.claimed||0;h.innerHTML=`<div class="season-panel"><div class="season-big"><strong>СЕЗОН ${String(season.number).padStart(2,'0')}</strong><span>${info.days} дней до завершения</span></div><div class="season-progress"><span style="width:${Math.min(100,(info.points%1000)/10)}%"></span></div><div class="season-points"><b>${info.points}</b><span>очков сезона · уровень ${lvl}</span></div><div class="season-rewards">${SEASON_REWARDS.slice(1).map((r,i)=>{const n=i+1,done=claimed>=n,ready=info.points>=r&&!done;return `<button class="season-reward ${done?'done':''}" data-season-claim="${n}" ${ready?'':'disabled'}><small>УР. ${n}</small><strong>+${fmt(r/2)}</strong><span>${done?'ПОЛУЧЕНО':ready?'ЗАБРАТЬ':'${fmt(r)} очков'}</span></button>`}).join('')}</div></div>`;$$('[data-season-claim]',h).forEach(b=>b.onclick=()=>claimSeason(Number(b.dataset.seasonClaim)))}
  function claimSeason(level){const r=SEASON_REWARDS[level];if(!r||season.points<r||level!==(season.claimed||0)+1)return;season.claimed=level;state.season={points:season.points,claimed:level};state.energy+=Math.floor(r/2);addLog(`Награда сезона: уровень ${level}`);showToast('НАГРАДА СЕЗОНА',`УРОВЕНЬ ${level}`);localStorage.setItem(SEASON_KEY,JSON.stringify(season));renderAll();renderSeason();save()}
  function renderProfile(){
    const h=screens.profile?.querySelector('.sub-content');
    if(!h)return;
    const totalAch=ACHIEVEMENTS.length;
    const doneAch=ACHIEVEMENTS.filter(a=>!!state.achievements[a.id]).length;
    const constellation=ACHIEVEMENTS.map((a,i)=>{
      const done=!!state.achievements[a.id];
      const p=Math.min(a.goal,achievementProgress(a));
      const pct=a.goal?Math.min(100,p/a.goal*100):0;
      const angle=(i/Math.max(1,totalAch))*Math.PI*2-Math.PI/2;
      const radius=i%2===0?38:30;
      const x=50+Math.cos(angle)*radius;
      const y=50+Math.sin(angle)*radius*.72;
      return `<button class="profile-star ${done?'done':''}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" aria-label="${a.name}" data-profile-achievement="${a.id}"><i></i><span>${done?'✓':Math.round(pct)+'%'}</span></button>`;
    }).join('');
    const logs=(state.logs||[]).slice(0,10).map(x=>`<div class="profile-history-row"><time>${new Date(x.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</time><span>${x.text}</span></div>`).join('')||'<div class="profile-history-empty">ИСТОРИЯ ПОКА ПУСТА</div>';
    const modules=Object.values(state.modules).reduce((a,b)=>a+b,0);
    const researchDone=Object.keys(state.research||{}).length;
    const status=state.coreLevel>=MAX_CORE?'ЯДРО ДОСТИГЛО ПРЕДЕЛА':state.energy>=upgradeCost(state.coreLevel)?'ГОТОВО К МОДЕРНИЗАЦИИ':'СИСТЕМА СТАБИЛЬНА';
    h.innerHTML=`
      <div class="profile-space">
        <div class="profile-orbit profile-orbit-a"></div><div class="profile-orbit profile-orbit-b"></div>
        <div class="profile-operator">
          <div class="profile-avatar profile-avatar-orb ${window.CORE_TELEGRAM?.photo?'has-telegram-photo':''}" ${window.CORE_TELEGRAM?.photo?`style="background-image:url('${window.CORE_TELEGRAM.photo}')"`:''}><span>${window.CORE_TELEGRAM?.initials||'ОП'}</span><i></i></div>
          <div class="profile-identity">
            <div class="profile-kicker">ОПЕРАТОР</div>
            <div class="profile-name">${window.CORE_TELEGRAM?.name||'ТЕНЕВОЙ_ИГРОК'}</div>
            <div class="profile-level">ЯДРО · УРОВЕНЬ <b>${state.coreLevel}</b> <span>•</span> РЕЗОНАНС <b>${state.resonance}</b></div>
          </div>
          <div class="profile-live"><i></i><span>В ИГРЕ</span></div>
        </div>
        <div class="profile-state-line"><span>${status}</span><b>${fmt(state.energy)} ЭНЕРГИИ</b></div>
      </div>
      <div class="profile-metrics">
        <div><small>ВРЕМЯ В СИСТЕМЕ</small><strong>${Math.floor((state.totalTapped||0)/3600)}:${String(Math.floor(((state.totalTapped||0)%3600)/60)).padStart(2,'0')}</strong></div>
        <div><small>ИССЛЕДОВАНИЯ</small><strong>${researchDone} / ${totalAch}</strong></div>
        <div><small>АНОМАЛИИ</small><strong>${fmt(state.anomalies?.count||0)}</strong></div>
        <div><small>МОДУЛИ</small><strong>${fmt(modules)}</strong></div>
      </div>
      <section class="profile-achievements">
        <div class="profile-section-head"><span>ДОСТИЖЕНИЯ</span><b>${doneAch} / ${totalAch}</b></div>
        <div class="profile-constellation"><div class="profile-constellation-core"><i></i><span>ОПЕРАТОР</span></div><div class="profile-star-lines"></div>${constellation}</div>
      </section>
      <section class="profile-history">
        <div class="profile-section-head"><span>ИСТОРИЯ ОПЕРАТОРА</span><b>${Math.min(10,(state.logs||[]).length)} ЗАПИСЕЙ</b></div>
        <div class="profile-history-list">${logs}</div>
      </section>`;
  }

  function ensureFeaturePanels(){
    const qs=$('#quests-screen');if(qs)qs.innerHTML=questsHTML();
    const inv=$('#inventory-screen');if(inv)inv.innerHTML=inventoryHTML();
  }
  function overlay(type){let o=$('#core-overlay');if(o)o.remove();o=document.createElement('div');o.id='core-overlay';o.innerHTML=`<div class="core-overlay-backdrop"></div><div class="core-overlay-panel" id="core-overlay-panel"></div>`;document.body.appendChild(o);const p=$('#core-overlay-panel',o);if(type==='shop')p.innerHTML=shopHTML().replace('id="shop-items"','id="core-shop-items"');if(type==='research')p.innerHTML=researchHTML();if(type==='resonance')p.innerHTML=resonanceHTML();o.classList.add('show');renderShop();p.querySelector('[data-close-overlay]')?.addEventListener('click',()=>o.remove());$('.core-overlay-backdrop',o).onclick=()=>o.remove();$$('[data-buy-item]',o).forEach(b=>b.onclick=()=>buyItem(b.dataset.buyItem));$$('[data-research]',o).forEach(b=>b.onclick=()=>buyResearch(b.dataset.research));$('#resonance-buy',o)?.addEventListener('click',activateResonance)}

  function renderAll(){ensureFeaturePanels();ensureFeatureScreens();renderEconomy();renderSystemState();window.CORE_VISUAL?.update();renderHeaderContext();const q=$('#quests-screen');if(q&&!q.classList.contains('hidden'))q.innerHTML=questsHTML();const i=$('#inventory-screen');if(i&&!i.classList.contains('hidden'))i.innerHTML=inventoryHTML();if(activeScreen==='shop')renderShopScreen();if(activeScreen==='research')renderResearchScreen();if(activeScreen==='resonance')renderResonanceScreen();if(activeScreen==='season')renderSeason();const h=$('#core-feature-host');if(h&&h.dataset.mode==='shop')renderShop();}
  document.addEventListener('click',async e=>{
    const radialToggle=e.target.closest('[data-radial-toggle]');
    if(radialToggle){await unlockAudio();sfx('tab',.35);setRadialMenu(!radialToggle.closest('[data-radial-menu]')?.classList.contains('is-open'));return}
    const radialItem=e.target.closest('[data-radial-screen]');
    if(radialItem){await unlockAudio();sfx('tab',.4);setRadialMenu(false);openScreen(radialItem.dataset.radialScreen);return}
    if(e.target.closest('[data-radial-menu]'))return;
    const nav=e.target.closest('.nav-item');if(nav){await unlockAudio();sfx('tab',.4);openScreen(nav.dataset.screen);return}const av=e.target.closest('.avatar-button');if(av){await unlockAudio();sfx('tab',.4);openScreen('profile');return}if(e.target.closest('[data-back],#section-back')){await unlockAudio();sfx('back',.45);openScreen('home');return}if(e.target.closest('#upgrade-buy')){upgradeCore();return}const mod=e.target.closest('.upgrade-card');if(mod){buyModule(mod.dataset.module);return}if(e.target.closest('[data-open-shop]')){openScreen('shop');return}if(e.target.closest('[data-open-research]')){openScreen('research');return}if(e.target.closest('[data-open-resonance]')){openScreen('resonance');return}if(e.target.closest('[data-open-settings]')){openScreen('settings');return}const pt=e.target.closest('[data-profile-tab]');if(pt){const root=pt.closest('.sub-content');$$('[data-profile-tab]',root).forEach(x=>x.classList.toggle('active',x===pt));$$('[data-profile-panel]',root).forEach(x=>x.classList.toggle('active',x.dataset.profilePanel===pt.dataset.profileTab));return}if(e.target.closest('[data-open-season]')){openScreen('season');return}const cq=e.target.closest('[data-claim-quest]');if(cq){claimQuest(cq.dataset.claimQuest);return}const ui=e.target.closest('[data-use-item]');if(ui){useItem(ui.dataset.useItem);return}});
  document.addEventListener('pointerdown',e=>{if(e.target.closest('.nav-item,.avatar-button,[data-back],.core-button,.settings-tab,[data-setting],[data-action],[data-radial-toggle],[data-radial-screen]'))vibrate(e.target.closest('.core-button')?12:8)},{passive:true});

  // Settings retained and cleaned up.
  const defaults={sounds:true,music:true,vibration:true,animations:true,grid:true,numberEffects:true,criticalEffects:true,batterySaver:false,reducedMotion:false,density:'standard',volume:70};
  const settings={...defaults,...getSettings()};
  function saveSettings(){localStorage.setItem('neonCoreSettings',JSON.stringify(settings));applySettings();const s=$('#save-status');if(s){s.textContent='СОХРАНЕНО';setTimeout(()=>s.textContent='АКТИВНО',900)}}
  function applySettings(){document.body.classList.toggle('settings-no-grid',settings.grid===false);document.body.classList.toggle('settings-reduced-motion',settings.reducedMotion===true);document.body.classList.toggle('settings-no-animation',settings.animations===false);document.body.classList.toggle('settings-battery-saver',settings.batterySaver===true);document.body.dataset.density=settings.density;document.documentElement.style.setProperty('--core-ui-scale',settings.density==='compact'?'.94':settings.density==='comfortable'?'1.04':'1');$$('[data-setting]').forEach(x=>x.checked=!!settings[x.dataset.setting]);const v=$('#volume-range');if(v)v.value=settings.volume;const vv=$('#volume-value');if(vv)vv.textContent=settings.volume+'%';const d=$('#density-value');if(d)d.textContent={compact:'Компактная',standard:'Стандартная',comfortable:'Увеличенная'}[settings.density]||'Стандартная';syncMusic()}
  $$('[data-setting]').forEach(x=>x.addEventListener('change',async()=>{settings[x.dataset.setting]=x.checked;saveSettings();if(['music','sounds'].includes(x.dataset.setting))await unlockAudio()}));
  const vr=$('#volume-range');vr?.addEventListener('input',()=>{settings.volume=Number(vr.value);$('#volume-value').textContent=vr.value+'%';saveSettings()});
  document.addEventListener('click',e=>{if(e.target.closest('[data-action="density"]')){const opts=[['compact','Компактная'],['standard','Стандартная'],['comfortable','Увеличенная']];const sheet=document.createElement('div');sheet.className='settings-sheet open';sheet.innerHTML=`<div class="settings-sheet-backdrop"></div><div class="settings-sheet-panel"><div class="settings-sheet-title">ПЛОТНОСТЬ ИНТЕРФЕЙСА</div>${opts.map(x=>`<button class="settings-choice ${x[0]===settings.density?'active':''}" data-choice="${x[0]}">${x[1]} <i class="fa-solid fa-check"></i></button>`).join('')}</div>`;document.body.appendChild(sheet);sheet.querySelector('.settings-sheet-backdrop').onclick=()=>sheet.remove();$$('[data-choice]',sheet).forEach(b=>b.onclick=()=>{settings.density=b.dataset.choice;saveSettings();sheet.remove()});return}});
  const importInput=$('#settings-import');document.querySelector('[data-action="export"]')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'CORE',type:'settings',version:'1.2',exportedAt:new Date().toISOString(),settings},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='core-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});document.querySelector('[data-action="import"]')?.addEventListener('click',()=>importInput?.click());importInput?.addEventListener('change',async()=>{try{const d=JSON.parse(await importInput.files[0].text());if(d.type!=='settings')throw 0;Object.assign(settings,defaults,d.settings);saveSettings();alert('Настройки CORE восстановлены.')}catch{alert('Не удалось импортировать файл.')}importInput.value='' });document.querySelector('[data-action="reset"]')?.addEventListener('click',()=>{if(confirm('Сбросить настройки CORE?')){Object.assign(settings,defaults);saveSettings()}});
  document.querySelector('[data-action="reset-progress"]')?.addEventListener('click',()=>{if(!confirm('Сбросить игровой прогресс? Все уровни, энергия, предметы, исследования, задания и РЕЗОНАНС будут удалены.'))return;localStorage.removeItem(GAME_KEY);localStorage.removeItem('coreGameStateV4');localStorage.removeItem('coreGameStateV3');state=defaultState();season={number:1,startedAt:Date.now(),points:0,claimed:0};localStorage.setItem(SEASON_KEY,JSON.stringify(season));renderAll();openScreen('home');showToast('ПРОГРЕСС СБРОШЕН','Новая игра начата')});
  $$('.settings-tab').forEach(t=>t.addEventListener('click',()=>{$$('.settings-tab').forEach(x=>x.classList.toggle('active',x===t));$$('.settings-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===t.dataset.tab))}));

  // Данные исследований вынесены в отдельный JSON. Для локального открытия архива сохраняем совместимый резервный набор.
  async function loadResearchData(){
    try{const res=await fetch('data/research.json',{cache:'no-store'});if(!res.ok)throw new Error('research.json');const data=await res.json();Object.assign(RESEARCH,Object.fromEntries((data.research||[]).map(r=>[r.id,r])))}catch(err){Object.assign(RESEARCH,{plasma:{name:'СТАБИЛИЗАЦИЯ ПЛАЗМЫ',description:'Выравнивает плазменный поток.',purpose:'Повышает базовую эффективность энергетического контура.',effects:['Автодобыча +5%'],opens:['resonance','stabilizer'],req:[],unlock:3,cost:600,x:50,layer:0,icon:'fa-atom'},resonance:{name:'РЕЗОНАНС КРИСТАЛЛА',description:'Настраивает ядро на точную передачу импульса.',purpose:'Увеличивает отдачу от прямого взаимодействия.',effects:['Сила импульса +3%'],opens:['focus','memory'],req:['plasma'],unlock:8,cost:1200,x:75,layer:1,icon:'fa-gem'},memory:{name:'КВАНТОВАЯ ПАМЯТЬ',description:'Сохраняет параметры ядра во время отсутствия оператора.',purpose:'Расширяет устойчивость системы вне активной игры.',effects:['Офлайн-генерация +2 часа'],opens:['reserve'],req:['resonance'],unlock:13,cost:1800,x:66,layer:3,icon:'fa-clock-rotate-left'},lattice:{name:'ЭНЕРГЕТИЧЕСКАЯ РЕШЁТКА',description:'Объединяет контуры в согласованную энергетическую сеть.',purpose:'Увеличивает ценность долгосрочных задач.',effects:['Награды заданий +5%'],opens:['signal'],req:['memory'],unlock:18,cost:3000,x:50,layer:5,icon:'fa-diagram-project'},singular:{name:'ПРЕДЕЛ СИНГУЛЯРНОСТИ',description:'Подводит систему к контролируемой предельной плотности.',purpose:'Подготавливает ядро к новому циклу развития.',effects:['+1 стартовый стек РЕЗОНАНСА'],opens:[],req:['lattice'],unlock:23,cost:5000,x:50,layer:6,icon:'fa-star'}})}}
  ensureFeatureScreens();ensureFeaturePanels();applySettings();
  loadResearchData().then(()=>{renderAll();openScreen('home');if(offline>0)setTimeout(()=>showToast('ОФЛАЙН-ЭНЕРГИЯ',`+${fmt(offline)} за время отсутствия`),1200)});
})();
