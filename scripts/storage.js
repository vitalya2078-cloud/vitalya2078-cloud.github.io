/* CORE 1.9 — сохранение и восстановление */
(() => {
  'use strict';
  const D=window.CORE_DATA;
  function loadState(){
    try{
      let p=JSON.parse(localStorage.getItem(D.GAME_KEY)||'null');
      if(!p){
        const legacy=JSON.parse(localStorage.getItem('coreGameStateV3')||'null');
        if(legacy){p={...legacy,modules:{...legacy.modules}};Object.keys(p.modules||{}).forEach(k=>{p.modules[k]=p.modules[k]===true?1:Number(p.modules[k])||0})}
      }
      if(!p)return D.defaultState();
      const d=D.defaultState();
      const s={...d,...p,modules:{...d.modules,...(p.modules||{})},inventory:{...(p.inventory||{})},research:{...(p.research||{})},quests:{...(p.quests||{})},achievements:{...(p.achievements||{})},logs:Array.isArray(p.logs)?p.logs:[],season:{...d.season,...(p.season||{})}};
      Object.keys(s.modules).forEach(k=>s.modules[k]=Math.max(0,Math.min(5,Number(s.modules[k])||0)));
      s.coreLevel=Math.max(1,Math.min(D.MAX_CORE,Number(s.coreLevel)||1));
      return s;
    }catch{return D.defaultState()}
  }
  function saveState(state){state.lastSavedAt=Date.now();localStorage.setItem(D.GAME_KEY,JSON.stringify(state))}
  function loadSeason(state){
    try{const p=JSON.parse(localStorage.getItem(D.SEASON_KEY)||'null');if(p&&p.startedAt&&Date.now()-p.startedAt<D.SEASON_LENGTH)return p}catch{}
    const p={number:1,startedAt:Date.now(),points:state.season?.points||0,claimed:state.season?.claimed||0};localStorage.setItem(D.SEASON_KEY,JSON.stringify(p));return p;
  }
  function saveSeason(season){localStorage.setItem(D.SEASON_KEY,JSON.stringify(season))}
  window.CORE_STORAGE={loadState,saveState,loadSeason,saveSeason};
})();
