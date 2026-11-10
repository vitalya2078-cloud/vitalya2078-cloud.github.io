/* ---------- Игра лаборатории: Инженер катастроф ---------- */
let BRIDGE_GAME = null;

function bridgeFresh() {
  return { stage: 'inspect', inspected: false, repair: null, load: 20, result: null, message: '' };
}
function bridgeEsc(s) { return esc(String(s)); }

function vBridgeGame() {
  if (!BRIDGE_GAME) BRIDGE_GAME = bridgeFresh();
  const g = BRIDGE_GAME;
  const stageNames = { inspect: '01 · Осмотр', repair: '02 · Ремонт', test: '03 · Испытание', done: 'Миссия выполнена' };
  frame('Инженер катастроф', { back: true, sub: 'Миссия 01 · Мост на грани обрушения' });
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
    (g.result ? '<div class="bridge-feedback ' + (g.result==='pass'?'success':'warning') + '">' + bridgeEsc(g.message) + '</div>' : '') +
    (g.stage === 'done' ? '<div class="bridge-complete"><span>✓</span><b>Миссия завершена</b><small>Ты восстановил силовую схему и проверил её запас прочности.</small><button class="btn wide" data-act="bridgeReset">Повторить миссию</button></div>' :
    '<button class="btn wide bridge-test-btn" data-act="bridgeRunTest">▶ Запустить испытание</button>' +
    (g.result==='fail' ? '<button class="btn line bridge-back-step" data-act="bridgePrev">Вернуться к ремонту</button>' : '')) +
    '</section>';
  }
  setMain('<div class="bridge-game">' +
    '<div class="bridge-progress">' + ['inspect','repair','test'].map((x,i)=>'<span class="' + (g.stage===x || (g.stage==='done'&&x==='test')?'current':'') + (['repair','test'].indexOf(g.stage)>i || g.stage==='done'?' passed':'') + '"><i>' + (i+1) + '</i><small>' + ['Осмотр','Ремонт','Тест'][i] + '</small></span>').join('') + '</div>' +
    body + '<div class="bridge-footnote">ФИЗИКА МИССИИ: силы · равновесие · прочность материалов</div></div>');
  bridgeDraw();
}

function bridgeDraw() {
  const c = document.getElementById('bridge-scene');
  if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = 960, h = 420;
  c.width = w*dpr; c.height = h*dpr;
  const x = c.getContext('2d'); x.scale(dpr,dpr);
  const g = BRIDGE_GAME || bridgeFresh();
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
  x.fillStyle='#687987';x.fillRect(75,211,810,18);
  x.fillStyle='#d5d5c7';x.fillRect(75,208,810,4);
  x.fillStyle='#f2c66d';for(let i=0;i<12;i++)x.fillRect(100+i*66,217,34,2);
  // truss side members
  x.lineCap='round';x.lineJoin='round';
  const pts=[[110,208],[220,92],[330,208],[440,92],[550,208],[660,92],[770,208],[850,120]];
  function member(a,b,color,width){x.strokeStyle=color;x.lineWidth=width;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();}
  for(let i=0;i<pts.length-1;i++)member(pts[i],pts[i+1],'#aebbc4',13);
  for(let i=0;i<pts.length-2;i+=2)member(pts[i],pts[i+2],'#91a2af',10);
  for(let i=0;i<pts.length;i++)member(pts[i],[pts[i][0],208],'#9aabb6',8);
  for(let i=0;i<pts.length-1;i++)member([pts[i][0],208],pts[i+1],'#8296a5',7);
  // rivet joints
  pts.forEach(p=>{x.fillStyle='#d5e0e4';x.beginPath();x.arc(p[0],p[1],5,0,Math.PI*2);x.fill();});
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
    const failed=g.result==='fail';
    x.save();x.translate(500,failed?190:178);
    x.fillStyle='#e7a64b';x.fillRect(-60,-28,105,28);x.fillStyle='#d9e5e8';x.fillRect(-34,-49,50,22);
    x.fillStyle='#f3c66d';x.fillRect(10,-22,25,14);x.fillStyle='#1a2738';
    [-39,22].forEach(xx=>{x.beginPath();x.arc(xx,2,12,0,Math.PI*2);x.fill();x.fillStyle='#aebbc4';x.beginPath();x.arc(xx,2,5,0,Math.PI*2);x.fill();x.fillStyle='#1a2738';});
    x.restore();
    if(failed){x.strokeStyle='#ff655f';x.lineWidth=4;x.beginPath();x.moveTo(480,211);x.lineTo(495,225);x.lineTo(510,211);x.stroke();}
  }
  // atmospheric lighting and status label
  const glow=x.createRadialGradient(480,110,10,480,110,330);glow.addColorStop(0,'rgba(100,178,220,.15)');glow.addColorStop(1,'rgba(100,178,220,0)');x.fillStyle=glow;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(7,13,25,.58)';x.fillRect(20,18,230,35);
  x.fillStyle='#c6d5e1';x.font='600 13px sans-serif';x.textAlign='left';x.fillText(g.stage==='inspect'?'BR-04 / STRUCTURAL SCAN':g.stage==='repair'?'BR-04 / REPAIR MODE':'BR-04 / LOAD TEST',34,41);
  if(g.stage==='inspect'){x.strokeStyle='rgba(255,120,109,.85)';x.lineWidth=2;x.beginPath();x.arc(486,141,28,0,Math.PI*2);x.stroke();}
}

document.addEventListener('click', e => {
  const b=e.target.closest('[data-act^="bridge"]'); if(!b||b.disabled)return;
  const d=b.dataset, g=BRIDGE_GAME; if(!g)return;
  if(d.act==='bridgeLaunch'){BRIDGE_GAME=bridgeFresh();location.hash='game-bridge';return;}
  if(d.act==='bridgeInspect'){
    if(d.v==='brace'){g.inspected=true;g.stage='repair';g.message='Верно. Диагональный раскос передаёт усилия между узлами фермы. Его повреждение нарушило силовую схему.';}
    else {g.message='Осмотр продолжен: этот элемент не объясняет потерю устойчивости пролёта. Ищи повреждение в силовой ферме.';toast('Проверь центральную часть пролёта.');}
  } else if(d.act==='bridgeRepair'){
    g.repair=d.v;g.stage='test';
    g.message=d.v==='brace'?'Стальной раскос восстановил путь передачи усилий. Расчётная несущая способность выросла с 14 до 26 тонн.':'Это не устраняет разрыв силовой схемы. Несущая способность почти не изменилась и остаётся около 14 тонн.';
    g.result=null;
  } else if(d.act==='bridgeLoad'){g.load=Number(d.v);g.result=null;g.message='';}
  else if(d.act==='bridgeRunTest'){
    const cap=g.repair==='brace'?26:14;
    if(g.load<=cap){g.result='pass';g.stage='done';g.message='Испытание пройдено: нагрузка ' + g.load + ' т не превышает расчётную несущую способность ' + cap + ' т. Мост сохраняет равновесие и устойчивость.';toast('Мост выдержал испытание!');}
    else {g.result='fail';g.stage='test';g.message='Опасная перегрузка: ' + g.load + ' т при допустимых ' + cap + ' т. Элементы фермы не выдерживают усилие. Вернись к ремонту и пересмотри решение.';toast('Испытание провалено — конструкция перегружена.');}
  } else if(d.act==='bridgePrev'){g.stage='repair';g.result=null;g.message='Выбери решение, которое восстановит диагональную связь между узлами.';}
  else if(d.act==='bridgeReset'){BRIDGE_GAME=bridgeFresh();}
  vBridgeGame();
});

window.addEventListener('resize',()=>{if(document.getElementById('bridge-scene'))bridgeDraw();});
