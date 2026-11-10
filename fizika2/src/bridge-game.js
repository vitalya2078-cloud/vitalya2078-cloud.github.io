/* ---------- Игра лаборатории: Инженер катастроф ---------- */
let BRIDGE_GAME = null;

function bridgeLaunch() { BRIDGE_GAME = bridgeFresh(); location.hash = 'game-bridge'; }

function bridgeFresh() {
  return { stage: 'inspect', inspected: false, repair: null, load: 20, result: null, message: '', anim: '', animProgress: 0, animFrame: 0 };
}
function bridgeEsc(s) { return esc(String(s)); }

function bridgeMarkup() {
  if (!BRIDGE_GAME) BRIDGE_GAME = bridgeFresh();
  const g = BRIDGE_GAME;
  const stageNames = { inspect: '01 · Осмотр', repair: '02 · Ремонт', test: '03 · Испытание', done: 'Миссия выполнена' };
  let body = '';
  if (g.stage === 'inspect') {
    body = '<section class="bridge-brief"><div class="bridge-kicker">АВАРИЙНЫЙ ВЫЗОВ · СЕКТОР 04</div><h2>Мост на грани обрушения</h2><p>После прохождения тяжёлой техники на мосту обнаружены опасные деформации. Найди слабое место, прежде чем конструкция рухнет.</p><div class="bridge-objective"><span>ЗАДАЧА</span><b>Определи, какой элемент конструкции потерял несущую способность.</b></div></section>' +
    '<div class="bridge-scene-wrap"><canvas id="bridge-scene" aria-label="Иллюстрация повреждённого стального моста"></canvas><div class="bridge-scene-caption"><span><i></i> ОБЪЕКТ: СТАЛЬНАЯ ФЕРМА</span><span>ВИД СБОКУ · 08:42</span></div></div>' +
    '<section class="bridge-panel"><div class="bridge-panel-head"><div><span class="bridge-kicker">ЭТАП 1 ИЗ 3</span><h3>Что повреждено?</h3></div><span class="bridge-step">ОСМОТР</span></div><p class="bridge-muted">Осмотри пролёт и выбери наиболее вероятную причину потери устойчивости.</p><div class="bridge-options">' +
    '<button class="bridge-option" data-act="bridgeInspect" data-v="brace"><span class="bridge-option-num">A</span><span><b>Диагональный раскос в центре пролёта</b><small>На соединении видны трещины и следы вырыва заклёпок</small></span><span class="bridge-radio"></span></button>' +
    '<button class="bridge-option" data-act="bridgeInspect" data-v="pier"><span class="bridge-option-num">B</span><span><b>Опорная стойка у берега</b><small>На бетоне есть потемнения от влаги</small></span><span class="bridge-radio"></span></button>' +
    '<button class="bridge-option" data-act="bridgeInspect" data-v="deck"><span class="bridge-option-num">C</span><span><b>Дорожное полотно</b><small>На поверхности заметны следы шин и потёртости</small></span><span class="bridge-radio"></span></button></div></section>';
  } else if (g.stage === 'repair') {
    body = '<section class="bridge-brief compact"><div class="bridge-kicker">ЭТАП 2 ИЗ 3 · ВОССТАНОВЛЕНИЕ</div><h2>Укрепи конструкцию</h2><p>Центральный диагональный раскос повреждён. Он передаёт часть нагрузки между узлами фермы. Выбери инженерное решение.</p></section>' +
    '<div class="bridge-scene-wrap"><canvas id="bridge-scene" aria-label="Мост с выделенным повреждённым раскосом"></canvas><div class="bridge-scene-caption"><span><i></i> ПОВРЕЖДЁННЫЙ УЗЕЛ ВЫДЕЛЕН</span><span>РЕЖИМ: РЕМОНТ</span></div></div>' +
    '<section class="bridge-panel"><div class="bridge-panel-head"><div><span class="bridge-kicker">ВЫБОР МАТЕРИАЛА И РЕШЕНИЯ</span><h3>Как усилить мост?</h3></div><span class="bridge-step">РЕМОНТ</span></div><div class="bridge-options">' +
    '<button class="bridge-option" data-act="bridgeRepair" data-v="brace"><span class="bridge-option-num">01</span><span><b>Установить новый стальной раскос</b><small>Замкнуть силовую схему и передать усилие на соседние узлы</small><em class="bridge-tag good">ИНЖЕНЕРНОЕ РЕШЕНИЕ</em></span><span class="bridge-radio"></span></button>' +
    '<button class="bridge-option" data-act="bridgeRepair" data-v="deck"><span class="bridge-option-num">02</span><span><b>Утолщить дорожное полотно</b><small>Добавить слой металла поверх проезжей части</small></span><span class="bridge-radio"></span></button>' +
    '<button class="bridge-option" data-act="bridgeRepair" data-v="paint"><span class="bridge-option-num">03</span><span><b>Зачистить и покрасить ферму</b><small>Защитить металл от дальнейшей коррозии</small></span><span class="bridge-radio"></span></button></div>' +
    (g.message ? '<div class="bridge-feedback ' + (g.repair === 'brace' ? 'success' : 'warning') + '">' + bridgeEsc(g.message) + '</div>' : '') +
    '<button class="btn line bridge-back-step" data-act="bridgePrev">← Вернуться к осмотру</button></section>';
  } else {
    const cap = g.repair === 'brace' ? 26 : 14;
    body = '<section class="bridge-brief compact"><div class="bridge-kicker">ЭТАП 3 ИЗ 3 · ПРОВЕРКА ПРОЧНОСТИ</div><h2>' + (g.stage === 'done' ? 'Конструкция выдержала!' : 'Испытай мост нагрузкой') + '</h2><p>Расчётная несущая способность после выбранного ремонта: <b>' + cap + ' т</b>. Выбери массу грузовика и запусти проверку.</p></section>' +
    '<div class="bridge-scene-wrap"><canvas id="bridge-scene" aria-label="Испытание моста грузовиком"></canvas><div class="bridge-scene-caption"><span><i></i> НАГРУЗОЧНОЕ ИСПЫТАНИЕ</span><span>РАСЧЁТНАЯ ПРЕДЕЛЬНАЯ НАГРУЗКА: ' + cap + ' Т</span></div></div>' +
    '<section class="bridge-panel"><div class="bridge-panel-head"><div><span class="bridge-kicker">МАССА ИСПЫТАТЕЛЬНОГО ГРУЗА</span><h3>Выбери грузовик</h3></div><span class="bridge-step">ТЕСТ</span></div><div class="bridge-loads">' +
    [12,20,28].map((n)=>'<button class="bridge-load ' + (g.load===n?'selected':'') + '" data-act="bridgeLoad" data-v="' + n + '"><b>' + n + '<small>т</small></b><span>' + (n===12?'Лёгкий':n===20?'Рабочий':'Тяжёлый') + '</span></button>').join('') +
    '</div><div class="bridge-capacity"><div><span>НЕСУЩАЯ СПОСОБНОСТЬ</span><b>' + cap + ' т</b></div><div class="bridge-capacity-track"><i style="width:' + Math.min(100,cap/30*100) + '%"></i></div></div>' +
    (g.message ? '<div class="bridge-feedback ' + (g.result==='fail' || g.result==='light' || g.repair!=='brace'?'warning':'success') + '">' + bridgeEsc(g.message) + '</div>' : '') +
    (g.stage === 'done' ? '<div class="bridge-complete"><span>✓</span><b>Миссия завершена</b><small>Ты восстановил силовую схему и проверил её запас прочности.</small><button class="btn wide" data-act="bridgeReset">Повторить миссию</button></div>' :
    '<button class="btn wide bridge-test-btn" data-act="bridgeRunTest">▶ Запустить испытание</button>' +
    (g.result==='fail' ? '<button class="btn line bridge-back-step" data-act="bridgePrev">Вернуться к ремонту</button>' : '')) +
    '</section>';
  }
  return ('<div class="bridge-game">' +
    '<div class="bridge-progress">' + ['inspect','repair','test'].map((x,i)=>'<span class="' + (g.stage===x || (g.stage==='done'&&x==='test')?'current':'') + (['repair','test'].indexOf(g.stage)>i || g.stage==='done'?' passed':'') + '"><i>' + (i+1) + '</i><small>' + ['Осмотр','Ремонт','Тест'][i] + '</small></span>').join('') + '</div>' +
    body + '<div class="bridge-footnote">ФИЗИКА МИССИИ: силы · равновесие · прочность материалов · запас несущей способности</div></div>');
}

function vBridgeGame(){if(!BRIDGE_GAME)BRIDGE_GAME=bridgeFresh();frame('Инженер катастроф',{back:true,sub:'Миссия 01 · Мост на грани обрушения'});setMain(bridgeMarkup());bridgeDraw();}
function bridgeRefresh(){const old=document.querySelector('.bridge-game');if(!old){vBridgeGame();return;}const y=document.querySelector('#main')?.scrollTop||0;old.outerHTML=bridgeMarkup();const main=document.querySelector('#main');if(main)main.scrollTop=y;bridgeDraw();}

function bridgeDraw() {
  const c = document.getElementById('bridge-scene');
  if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = 960, h = 420;
  c.width = w*dpr; c.height = h*dpr;
  const x = c.getContext('2d'); x.scale(dpr,dpr);
  const g = BRIDGE_GAME || bridgeFresh();
  const driving=g.anim==='drive',collapsing=g.anim==='collapse';
  const ratio=Math.max(0,(g.load-(g.repair==='brace'?14:10))/Math.max(1,(g.repair==='brace'?12:8)));
  const sag=collapsing?58*g.animProgress:(driving?Math.sin(g.animProgress*Math.PI)*Math.min(24,5+ratio*7):(g.result==='fail'?48:0));
  const bend=p=>[p[0],p[1]+Math.sin(Math.max(0,1-Math.abs(p[0]-480)/480)*Math.PI/2)*sag];
  const grad = x.createLinearGradient(0,0,0,h); grad.addColorStop(0,'#172743'); grad.addColorStop(.58,'#263c55'); grad.addColorStop(1,'#142333');
  x.fillStyle=grad; x.fillRect(0,0,w,h);
  x.fillStyle='#31465a'; x.beginPath(); x.moveTo(0,210); x.lineTo(145,150); x.lineTo(280,205); x.lineTo(430,132); x.lineTo(600,205); x.lineTo(760,145); x.lineTo(960,200); x.lineTo(960,300); x.lineTo(0,300); x.fill();
  x.fillStyle='#3d5667'; x.beginPath(); x.moveTo(0,270); x.lineTo(170,220); x.lineTo(300,265); x.lineTo(510,210); x.lineTo(720,265); x.lineTo(870,220); x.lineTo(960,250); x.lineTo(960,330); x.lineTo(0,330); x.fill();
  const water=x.createLinearGradient(0,285,0,420);water.addColorStop(0,'#17617a');water.addColorStop(1,'#092d48');x.fillStyle=water;x.fillRect(0,285,w,135);
  for(let i=0;i<18;i++){x.strokeStyle='rgba(115,220,231,'+(0.08+(i%3)*.035)+')';x.lineWidth=2;x.beginPath();x.moveTo((i*83)%960,315+(i%5)*19);x.lineTo((i*83)%960+45+(i%4)*20,315+(i%5)*19);x.stroke();}
  // concrete piers and footings
  x.fillStyle='#8997a2';x.beginPath();x.moveTo(160,238);x.lineTo(220,238);x.lineTo(236,360);x.lineTo(142,360);x.fill();
  x.fillStyle='#657582';x.fillRect(130,356,120,13);
  x.fillStyle='#8997a2';x.beginPath();x.moveTo(740,238);x.lineTo(800,238);x.lineTo(818,360);x.lineTo(722,360);x.fill();
  x.fillStyle='#657582';x.fillRect(710,356,120,13);
  // deck shadow and road deck
  x.fillStyle='rgba(0,0,0,.3)';x.fillRect(75,226,810,24);
  x.fillStyle='#687987';x.beginPath();x.moveTo(75,211);x.quadraticCurveTo(480,211+sag,885,211);x.lineTo(885,229);x.quadraticCurveTo(480,229+sag,75,229);x.closePath();x.fill();
  x.fillStyle='#d5d5c7';x.beginPath();x.moveTo(75,208);x.quadraticCurveTo(480,208+sag,885,208);x.lineTo(885,212);x.quadraticCurveTo(480,212+sag,75,212);x.closePath();x.fill();
  x.fillStyle='#f2c66d';for(let i=0;i<12;i++)x.fillRect(100+i*66,217,34,2);
  // truss side members
  x.lineCap='round';x.lineJoin='round';
  const pts=[[110,208],[220,92],[330,208],[440,92],[550,208],[660,92],[770,208],[850,120]];
  function member(a,b,color,width){a=bend(a);b=bend(b);x.strokeStyle=color;x.lineWidth=width;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();}
  for(let i=0;i<pts.length-1;i++)member(pts[i],pts[i+1],'#aebbc4',13);
  for(let i=0;i<pts.length-2;i+=2)member(pts[i],pts[i+2],'#91a2af',10);
  for(let i=0;i<pts.length;i++)member(pts[i],[pts[i][0],208],'#9aabb6',8);
  for(let i=0;i<pts.length-1;i++)member([pts[i][0],208],pts[i+1],'#8296a5',7);
  // rivet joints
  pts.forEach(p=>{p=bend(p);x.fillStyle='#d5e0e4';x.beginPath();x.arc(p[0],p[1],5,0,Math.PI*2);x.fill();});
  // central damaged diagonal / replacement brace
  if(g.stage==='repair'||g.stage==='test'||g.stage==='done'){
    if(g.repair==='brace'||g.stage==='test'||g.stage==='done'){
      member([440,92],[550,208],'#40d6ad',10);
      x.strokeStyle='rgba(64,214,173,.3)';x.lineWidth=22;x.beginPath();x.moveTo(440,92);x.lineTo(550,208);x.stroke();
    } else {
      x.strokeStyle='#ff786d';x.lineWidth=9;x.setLineDash([12,8]);x.beginPath();x.moveTo(440,92);x.lineTo(550,208);x.stroke();x.setLineDash([]);
    }
  } else {
    x.strokeStyle='#ff786d';x.lineWidth=5;x.beginPath();x.moveTo(440,92);x.lineTo(482,136);x.moveTo(492,147);x.lineTo(550,208);x.stroke();
    x.fillStyle='#ff786d';x.beginPath();x.arc(486,141,15,0,Math.PI*2);x.fill();
    x.fillStyle='#fff';x.font='bold 14px sans-serif';x.textAlign='center';x.fillText('!',486,146);
  }
  // vehicle during test
  if(g.stage==='test'||g.stage==='done'){
    const failed=g.result==='fail'||collapsing;
    const truckX=driving?110+760*g.animProgress:(collapsing?110+760*.55:(g.stage==='done'?790:500));
    const truckY=178+Math.sin(Math.max(0,1-Math.abs(truckX-480)/480)*Math.PI/2)*sag+(collapsing?g.animProgress*90:0);
    x.save();x.translate(truckX,truckY);
    x.fillStyle='#e7a64b';x.fillRect(-60,-28,105,28);x.fillStyle='#d9e5e8';x.fillRect(-34,-49,50,22);
    x.fillStyle='#f3c66d';x.fillRect(10,-22,25,14);x.fillStyle='#1a2738';
    [-39,22].forEach(xx=>{x.beginPath();x.arc(xx,2,12,0,Math.PI*2);x.fill();x.fillStyle='#aebbc4';x.beginPath();x.arc(xx,2,5,0,Math.PI*2);x.fill();x.fillStyle='#1a2738';});
    x.restore();
    if(failed){x.strokeStyle='#ff655f';x.lineWidth=4;x.beginPath();x.moveTo(450,211+sag);x.lineTo(480,235+sag);x.lineTo(510,211+sag);x.stroke();}
  }
  // atmospheric lighting and status label
  const glow=x.createRadialGradient(480,110,10,480,110,330);glow.addColorStop(0,'rgba(100,178,220,.15)');glow.addColorStop(1,'rgba(100,178,220,0)');x.fillStyle=glow;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(7,13,25,.58)';x.fillRect(20,18,230,35);
  x.fillStyle='#c6d5e1';x.font='600 13px sans-serif';x.textAlign='left';x.fillText(g.stage==='inspect'?'BR-04 / STRUCTURAL SCAN':g.stage==='repair'?'BR-04 / REPAIR MODE':'BR-04 / LOAD TEST',34,41);
  if(g.stage==='inspect'){x.strokeStyle='rgba(255,120,109,.85)';x.lineWidth=2;x.beginPath();x.arc(486,141,28,0,Math.PI*2);x.stroke();}
  if(collapsing){x.save();x.translate(480,205+sag*.35);x.rotate(.25+g.animProgress*.65);x.strokeStyle='#ff786d';x.lineWidth=12;x.lineCap='round';x.beginPath();x.moveTo(-58,-20);x.lineTo(-8,12);x.stroke();x.rotate(-.7);x.beginPath();x.moveTo(8,12);x.lineTo(62,-24);x.stroke();x.restore();}
  if(driving||collapsing){x.fillStyle='rgba(5,12,22,.78)';x.fillRect(700,18,240,35);x.fillStyle=collapsing?'#ff8276':'#8be4ca';x.font='bold 12px sans-serif';x.textAlign='right';x.fillText(collapsing?'КРИТИЧЕСКАЯ ДЕФОРМАЦИЯ':'ГРУЗОВИК В ДВИЖЕНИИ',925,40);}
}
function bridgeStartAnimation(){const g=BRIDGE_GAME;if(!g)return;g.anim='drive';g.animProgress=0;g.result=null;g.message='Грузовик въезжает на пролёт. Следи за прогибом конструкции.';bridgeRefresh();const start=performance.now();const tick=now=>{if(BRIDGE_GAME!==g)return;const target=g.load>(g.repair==='brace'?26:14)?.55:1;g.animProgress=Math.min(target,(now-start)/4200*target);bridgeDraw();if(g.animProgress<target){g.animFrame=requestAnimationFrame(tick);return;}const cap=g.repair==='brace'?26:14;if(g.load>cap){g.anim='collapse';g.animProgress=0;g.message='Перегрузка! Центральный пролёт теряет устойчивость.';const t0=performance.now();const fall=t=>{if(BRIDGE_GAME!==g)return;g.animProgress=Math.min(1,(t-t0)/1500);bridgeDraw();if(g.animProgress<1){g.animFrame=requestAnimationFrame(fall);return;}g.anim='';g.result='fail';g.stage='test';g.message='Мост не выдержал '+g.load+' т: расчётный предел — '+cap+' т. Пролёт прогнулся и разрушился. Вернись к ремонту.';bridgeRefresh();toast('Испытание провалено — мост разрушен.');};g.animFrame=requestAnimationFrame(fall);}else{g.anim='';g.result='pass';g.stage='done';g.message='Грузовик массой '+g.load+' т пересёк мост. Конструкция выдержала нагрузку '+cap+' т.';bridgeRefresh();toast('Мост выдержал испытание!');}};g.animFrame=requestAnimationFrame(tick);}

document.addEventListener('click', e => {
  const b=e.target.closest('[data-act^="bridge"]'); if(!b||b.disabled)return;
  const d=b.dataset;
  if(d.act==='bridgeLaunch') return;
  if(BRIDGE_GAME&&BRIDGE_GAME.anim&&d.act!=='bridgeReset')return;
  const g=BRIDGE_GAME; if(!g)return;
  if(d.act==='bridgeInspect'){
    if(d.v==='brace'){g.inspected=true;g.stage='repair';g.message='Верно. Диагональный раскос передаёт усилия между узлами фермы. Его повреждение нарушило силовую схему.';}
    else {g.message='Осмотр продолжен: этот элемент не объясняет потерю устойчивости пролёта. Ищи повреждение в силовой ферме.';toast('Проверь центральную часть пролёта.');}
  } else if(d.act==='bridgeRepair'){
    g.repair=d.v;g.stage='test';
    g.message=d.v==='brace'?'Стальной раскос восстановил путь передачи усилий. Расчётная несущая способность выросла с 14 до 26 тонн.':'Это не устраняет разрыв силовой схемы. Несущая способность почти не изменилась и остаётся около 14 тонн.';
    g.result=null;
  } else if(d.act==='bridgeLoad'){g.load=Number(d.v);g.result=null;g.message='';}
  else if(d.act==='bridgeRunTest'){
    if(g.anim)return;
    if(g.load<20){g.result='light';g.stage='test';g.message='Нагрузка слишком мала для контрольного испытания. Выбери рабочий грузовик массой 20 т.';}
    else {bridgeStartAnimation();return;}
  } else if(d.act==='bridgePrev'){g.stage='repair';g.result=null;g.message='Выбери решение, которое восстановит диагональную связь между узлами.';}
  else if(d.act==='bridgeReset'){if(g.animFrame)cancelAnimationFrame(g.animFrame);BRIDGE_GAME=bridgeFresh();}
  bridgeRefresh();
});

window.addEventListener('resize',()=>{if(document.getElementById('bridge-scene'))bridgeDraw();});
