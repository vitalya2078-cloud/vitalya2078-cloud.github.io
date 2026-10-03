/* CORE 1.9 — данные и конфигурация */
(() => {
  'use strict';
  const ECONOMY = { startEnergy:100, baseTap:1, upgradeBaseCost:75, upgradeGrowth:1.34, comboWindowMs:720, comboStep:10, comboBonus:.10 };
  const MODULES = {
    auto:{name:'АВТОДОБЫЧА',cost:250,growth:1.68,rates:[0,.35,.72,1.2,1.85,2.65],desc:'Пассивная генерация энергии.'},
    tap:{name:'ИМПУЛЬСНЫЙ УСИЛИТЕЛЬ',cost:200,growth:1.55,desc:'Усиливает энергию за ручной импульс.'},
    combo:{name:'КОМБО-МАТРИЦА',cost:350,growth:1.55,desc:'Расширяет бонус серии тапов.'},
    offline:{name:'КОНТУР ХРАНЕНИЯ',cost:500,growth:1.55,desc:'Увеличивает офлайн-лимит и эффективность.'},
    stability:{name:'СТАБИЛИЗАЦИЯ',cost:650,growth:1.62,desc:'Повышает базовую устойчивость ядра.'},
    cooling:{name:'ОХЛАЖДЕНИЕ',cost:700,growth:1.62,desc:'Ускоряет снижение перегрева.'},
    protection:{name:'ЗАЩИТА',cost:800,growth:1.64,desc:'Замедляет накопление износа.'},
    flow:{name:'КОНТРОЛЬ ПОТОКА',cost:900,growth:1.66,desc:'Снижает потери эффективности под нагрузкой.'}
  };
  const ITEMS = {
    plasma:{name:'ПЛАЗМЕННАЯ ЯЧЕЙКА',rarity:'ОБЫЧНЫЙ',price:180,unlock:1,desc:'Мгновенно добавляет 120 энергии.',icon:'fa-bolt'},
    stabilizer:{name:'СТАБИЛИЗАТОР',rarity:'НЕОБЫЧНЫЙ',price:420,unlock:6,desc:'+2% к автодобыче навсегда.',icon:'fa-shield-halved'},
    quantum:{name:'КВАНТОВЫЙ ОСКОЛОК',rarity:'РЕДКИЙ',price:900,unlock:11,desc:'+5% к силе ручного импульса навсегда.',icon:'fa-diamond'},
    reactor:{name:'ЯЧЕЙКА РЕАКТОРА',rarity:'ЭПИЧЕСКИЙ',price:2200,unlock:16,desc:'+8% к офлайн-эффективности.',icon:'fa-atom'},
    singularity:{name:'ЗАРОДЫШ СИНГУЛЯРНОСТИ',rarity:'ЛЕГЕНДАРНЫЙ',price:6500,unlock:21,desc:'+1 постоянный бонус РЕЗОНАНСА после активации.',icon:'fa-star'}
  };
  const RESEARCH = {};
  const QUESTS = [
    {id:'taps',name:'ПЕРВЫЙ ИМПУЛЬС',desc:'Сделать 50 тапов',goal:50,reward:120,type:'taps'},
    {id:'energy',name:'ЗАПАС ЭНЕРГИИ',desc:'Накопить 500 произведённой энергии',goal:500,reward:220,type:'produced'},
    {id:'upgrade',name:'РАЗВИТИЕ',desc:'Купить 3 улучшения ядра',goal:3,reward:300,type:'upgrades'},
    {id:'module',name:'МОДУЛЬНАЯ СЕТЬ',desc:'Улучшить любой модуль до 1 уровня',goal:1,reward:350,type:'modules'},
    {id:'core5',name:'СТАБИЛИЗАЦИЯ',desc:'Достичь 5 уровня ядра',goal:5,reward:500,type:'core'},
    {id:'research1',name:'ПЕРВОЕ ИССЛЕДОВАНИЕ',desc:'Завершить 1 исследование',goal:1,reward:650,type:'research'},
    {id:'items3',name:'ПОЛЕВОЙ КОМПЛЕКТ',desc:'Собрать 3 предмета',goal:3,reward:550,type:'inventory'},
    {id:'core10',name:'РЕЗОНАНС',desc:'Достичь 10 уровня ядра',goal:10,reward:900,type:'core'},
    {id:'season500',name:'СЕЗОННЫЙ ИМПУЛЬС',desc:'Набрать 500 очков сезона',goal:500,reward:750,type:'season'},
    {id:'modules5',name:'УСИЛЕННАЯ СЕТЬ',desc:'Набрать 5 уровней модулей',goal:5,reward:700,type:'modules'},
    {id:'produced2500',name:'ЭНЕРГЕТИЧЕСКИЙ ПОТОК',desc:'Произвести 2 500 энергии',goal:2500,reward:800,type:'produced'}
  ];
  const ACHIEVEMENTS = [
    {id:'a_taps',name:'ПЕРВЫЙ ИМПУЛЬС',desc:'Сделать 100 тапов',goal:100,type:'taps',reward:250},
    {id:'a_energy',name:'ЭНЕРГЕТИЧЕСКИЙ РЕЗЕРВ',desc:'Произвести 5 000 энергии',goal:5000,type:'produced',reward:500},
    {id:'a_core10',name:'СТАБИЛЬНОЕ ЯДРО',desc:'Достичь 10 уровня ядра',goal:10,type:'core',reward:800},
    {id:'a_core25',name:'АКТИВНОЕ ЯДРО',desc:'Достичь 25 уровня ядра',goal:25,type:'core',reward:2500},
    {id:'a_modules',name:'МОДУЛЬНАЯ СЕТЬ',desc:'Набрать 10 уровней модулей',goal:10,type:'modules',reward:700},
    {id:'a_research',name:'ИССЛЕДОВАТЕЛЬ',desc:'Завершить 3 исследования',goal:3,type:'research',reward:1000},
    {id:'a_inventory',name:'ХРАНИЛИЩЕ',desc:'Собрать 5 предметов',goal:5,type:'inventory',reward:600},
    {id:'a_resonance',name:'НОВЫЙ ЦИКЛ',desc:'Активировать РЕЗОНАНС',goal:1,type:'resonance',reward:3000}
  ];
  const SEASON_REWARDS=[0,250,500,900,1400,2200,3200,4500,6200,8500,11000];
  const rarityOrder={ОБЫЧНЫЙ:1,НЕОБЫЧНЫЙ:2,РЕДКИЙ:3,ЭПИЧЕСКИЙ:4,ЛЕГЕНДАРНЫЙ:5};
  const GAME_KEY='coreGameStateV5', SEASON_KEY='coreSeasonV1', SEASON_LENGTH=14*24*60*60*1000, MAX_CORE=25;
  const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(Math.max(0,Math.floor(Number(n)||0)));
  const rateFmt=n=>{n=Number(n)||0;return Number.isInteger(n)?String(n):n.toFixed(1).replace('.',',')};
  const defaultState=()=>({version:7,energy:100,resonanceBalance:0,signals:0,coreLevel:1,totalTapped:0,totalProduced:0,upgradesBought:0,modules:{auto:0,tap:0,combo:0,offline:0,stability:0,cooling:0,protection:0,flow:0},inventory:{},research:{},quests:{},achievements:{},logs:[],lastSavedAt:Date.now(),lastOfflineGain:0,resonance:0,resonanceStacks:0,heat:8,wear:0,season:{points:0,claimed:0},anomalies:{lastAt:0,count:0}});
  window.CORE_DATA={ECONOMY,MODULES,ITEMS,RESEARCH,QUESTS,ACHIEVEMENTS,SEASON_REWARDS,rarityOrder,GAME_KEY,SEASON_KEY,SEASON_LENGTH,MAX_CORE,fmt,rateFmt,defaultState};
})();
