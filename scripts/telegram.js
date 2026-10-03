(function(){
  'use strict';
  const tg=window.Telegram&&window.Telegram.WebApp;
  const fallback={first_name:'ТЕНЕВОЙ',last_name:'ИГРОК',username:'',photo_url:''};
  const user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user ? tg.initDataUnsafe.user : fallback;
  const fullName=[user.first_name,user.last_name].filter(Boolean).join(' ').trim()||'ТЕНЕВОЙ ИГРОК';
  const shortName=(user.first_name||'ОПЕРАТОР').trim();
  const initials=[user.first_name,user.last_name].filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'ОП';
  window.CORE_TELEGRAM={
    connected:!!(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user),
    user:user,
    name:fullName,
    shortName:shortName,
    username:user.username||'',
    initials:initials,
    photo:user.photo_url||''
  };
  function apply(){
    const d=window.CORE_TELEGRAM;
    document.documentElement.classList.toggle('telegram-connected',d.connected);
    document.querySelectorAll('.profile-name,.nickname').forEach(el=>el.textContent=d.name);
    document.querySelectorAll('.profile-avatar span,.home-avatar span,.avatar span').forEach(el=>el.textContent=d.initials);
    document.querySelectorAll('.profile-avatar,.home-avatar,.avatar').forEach(el=>{
      if(d.photo){el.style.backgroundImage=`url("${d.photo.replace(/"/g,'%22')}")`;el.classList.add('has-telegram-photo');}
    });
    document.querySelectorAll('[data-telegram-username]').forEach(el=>el.textContent=d.username?('@'+d.username):'TELEGRAM');
  }
  window.CORE_TELEGRAM.apply=apply;
  if(tg){
    try{tg.ready();tg.expand();}catch(e){}
    if(tg.setHeaderColor)try{tg.setHeaderColor('#05060d')}catch(e){}
    if(tg.setBackgroundColor)try{tg.setBackgroundColor('#05060d')}catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
