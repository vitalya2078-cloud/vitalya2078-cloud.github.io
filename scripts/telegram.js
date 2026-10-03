(function(){
  'use strict';
  const fallback={first_name:'ТЕНЕВОЙ',last_name:'ИГРОК',username:'',photo_url:''};

  function readTelegram(){
    const tg=window.Telegram&&window.Telegram.WebApp;
    const user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user ? tg.initDataUnsafe.user : fallback;
    const fullName=[user.first_name,user.last_name].filter(Boolean).join(' ').trim()||'ТЕНЕВОЙ ИГРОК';
    const shortName=(user.first_name||'ОПЕРАТОР').trim();
    const initials=[user.first_name,user.last_name].filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'ОП';
    return {
      tg,
      connected:!!(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user),
      user,
      name:fullName,
      shortName,
      username:user.username||'',
      initials,
      photo:user.photo_url||''
    };
  }

  function apply(){
    const d=readTelegram();
    window.CORE_TELEGRAM=d;
    document.documentElement.classList.toggle('telegram-connected',d.connected);
    document.querySelectorAll('.profile-name,.nickname,.home-identity-copy strong').forEach(el=>el.textContent=d.name);
    document.querySelectorAll('.profile-avatar span,.home-avatar span,.avatar span').forEach(el=>el.textContent=d.initials);
    document.querySelectorAll('.profile-avatar,.home-avatar,.avatar').forEach(el=>{
      if(d.photo){
        el.style.backgroundImage=`url("${d.photo.replace(/"/g,'%22')}")`;
        el.classList.add('has-telegram-photo');
      }
    });
    document.querySelectorAll('[data-telegram-username]').forEach(el=>el.textContent=d.username?('@'+d.username):'TELEGRAM');
    return d;
  }

  function init(){
    const d=apply();
    const tg=d.tg;
    if(tg){
      try{tg.ready();tg.expand();}catch(e){}
      if(tg.setHeaderColor)try{tg.setHeaderColor('#05060d')}catch(e){}
      if(tg.setBackgroundColor)try{tg.setBackgroundColor('#05060d')}catch(e){}
      // Telegram may finish exposing initData just after the first frame.
      setTimeout(apply,120);
      setTimeout(apply,500);
    }
  }

  window.CORE_TELEGRAM={connected:false,apply:init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
