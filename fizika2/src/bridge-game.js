/* ---------- Игра лаборатории: Инженер катастроф ---------- */
let BRIDGE_GAME = null;

function bridgeLaunch() {
  if (BRIDGE_GAME && BRIDGE_GAME.anim && BRIDGE_GAME.animFrame) cancelAnimationFrame(BRIDGE_GAME.animFrame);
  BRIDGE_GAME = bridgeFresh();
  if (location.hash === '#game-bridge') {
    if (typeof render === 'function') render();
    else vBridgeGame();
  } else {
    location.hash = 'game-bridge';
  }
}

function bridgeFresh() {
  return { stage: 'inspect', inspected: false, diagnosisCorrect: false, repair: null, load: 20, result: null, message: '', anim: '', animProgress: 0, animFrame: 0 };
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
    const cap = g.repair === 'brace' && g.diagnosisCorrect ? 26 : 14;
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
function bridgeMorphNode(oldNode,newNode){
  if(oldNode.nodeType!==newNode.nodeType||oldNode.nodeName!==newNode.nodeName)return newNode.cloneNode(true);
  if(oldNode.nodeType===Node.TEXT_NODE){if(oldNode.nodeValue!==newNode.nodeValue)oldNode.nodeValue=newNode.nodeValue;return oldNode;}
  if(oldNode.nodeType!==Node.ELEMENT_NODE||oldNode.tagName==='CANVAS')return oldNode;
  for(const a of [...oldNode.attributes])if(!newNode.hasAttribute(a.name))oldNode.removeAttribute(a.name);
  for(const a of [...newNode.attributes])if(oldNode.getAttribute(a.name)!==a.value)oldNode.setAttribute(a.name,a.value);
  for(let i=0;i<Math.max(oldNode.childNodes.length,newNode.childNodes.length);i++){
    const o=oldNode.childNodes[i],n=newNode.childNodes[i];
    if(!n){if(o)oldNode.removeChild(o);}
    else if(!o)oldNode.appendChild(n.cloneNode(true));
    else if(o.nodeType!==n.nodeType||o.nodeName!==n.nodeName)oldNode.replaceChild(n.cloneNode(true),o);
    else bridgeMorphNode(o,n);
  }
  return oldNode;
}
function bridgeRefresh(){
  const old=document.querySelector('.bridge-game');if(!old){vBridgeGame();return;}
  const y=document.querySelector('#main')?.scrollTop||0;
  const t=document.createElement('template');t.innerHTML=bridgeMarkup().trim();
  bridgeMorphNode(old,t.content.firstElementChild);
  const main=document.querySelector('#main');if(main)main.scrollTop=y;
  bridgeDraw();
}

function bridgeDraw() {
  const c = document.getElementById('bridge-scene');
  if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = 960, h = 420;
  // Keep the backing store stable: changing canvas.width/height on every frame
  // clears the context and causes visible flashes during animation.
  if (c.width !== w*dpr || c.height !== h*dpr) { c.width = w*dpr; c.height = h*dpr; }
  const x = c.getContext('2d');
  x.setTransform(dpr,0,0,dpr,0,0);
  x.imageSmoothingEnabled = true;
  const g = BRIDGE_GAME || bridgeFresh();
  const driving=g.anim==='drive',collapsing=g.anim==='collapse',broken=g.result==='fail';
  const ratio=Math.max(0,(g.load-(g.repair==='brace'?14:10))/Math.max(1,(g.repair==='brace'?12:8)));
  const collapseT=collapsing?g.animProgress:(broken?1:0);
  const sag=collapsing?78*g.animProgress:(driving?Math.sin(g.animProgress*Math.PI)*Math.min(24,5+ratio*7):(broken?48:0));
  const bend=p=>{
    const influence=Math.max(0,1-Math.abs(p[0]-480)/205);
    const drop=collapseT?Math.pow(collapseT,1.55)*145*influence:0;
    const shear=collapseT?Math.pow(collapseT,1.4)*(p[0]<480?-1:1)*17*influence:0;
    return [p[0]+shear,p[1]+Math.sin(Math.max(0,1-Math.abs(p[0]-480)/480)*Math.PI/2)*sag+drop];
  };
  const grad = x.createLinearGradient(0,0,0,h); grad.addColorStop(0,'#172743'); grad.addColorStop(.58,'#263c55'); grad.addColorStop(1,'#142333');
  x.fillStyle=grad; x.fillRect(0,0,w,h);
  x.fillStyle='#31465a'; x.beginPath(); x.moveTo(0,210); x.lineTo(145,150); x.lineTo(280,205); x.lineTo(430,132); x.lineTo(600,205); x.lineTo(760,145); x.lineTo(960,200); x.lineTo(960,300); x.lineTo(0,300); x.fill();
  x.fillStyle='#3d5667'; x.beginPath(); x.moveTo(0,270); x.lineTo(170,220); x.lineTo(300,265); x.lineTo(510,210); x.lineTo(720,265); x.lineTo(870,220); x.lineTo(960,250); x.lineTo(960,330); x.lineTo(0,330); x.fill();
  // distant industrial skyline, softened by atmospheric haze
  x.save();x.globalAlpha=.68;
  const buildings=[[18,206,54,76],[78,188,42,94],[126,218,62,64],[208,194,48,88],[266,211,58,71],[330,183,52,99],[395,207,46,75],[548,199,60,83],[620,180,48,102],[682,210,56,72],[756,191,50,91],[824,205,64,77],[900,184,42,98]];
  buildings.forEach((b,i)=>{x.fillStyle=i%2?'#263d54':'#1d344b';x.fillRect(b[0],b[1],b[2],b[3]);x.fillStyle='rgba(109,190,211,.28)';for(let yy=b[1]+10;yy<b[1]+b[3]-6;yy+=14)for(let xx=b[0]+8;xx<b[0]+b[2]-5;xx+=13)x.fillRect(xx,yy,4,5);});
  x.restore();
  const haze=x.createLinearGradient(0,175,0,290);haze.addColorStop(0,'rgba(89,157,190,0)');haze.addColorStop(1,'rgba(20,48,68,.62)');x.fillStyle=haze;x.fillRect(0,175,w,115);
  const water=x.createLinearGradient(0,285,0,420);water.addColorStop(0,'#17617a');water.addColorStop(1,'#092d48');x.fillStyle=water;x.fillRect(0,285,w,135);
  for(let i=0;i<18;i++){x.strokeStyle='rgba(115,220,231,'+(0.08+(i%3)*.035)+')';x.lineWidth=2;x.beginPath();x.moveTo((i*83)%960,315+(i%5)*19);x.lineTo((i*83)%960+45+(i%4)*20,315+(i%5)*19);x.stroke();}
  // concrete piers and footings
  x.fillStyle='#8997a2';x.beginPath();x.moveTo(160,238);x.lineTo(220,238);x.lineTo(236,360);x.lineTo(142,360);x.fill();
  x.fillStyle='#657582';x.fillRect(130,356,120,13);
  x.fillStyle='#8997a2';x.beginPath();x.moveTo(740,238);x.lineTo(800,238);x.lineTo(818,360);x.lineTo(722,360);x.fill();
  x.fillStyle='#657582';x.fillRect(710,356,120,13);
  // deck shadow and road deck
  x.fillStyle='rgba(0,0,0,.3)';x.fillRect(75,226,810,24);
  x.fillStyle='#687987';x.beginPath();x.moveTo(75,211);x.quadraticCurveTo(480,211+sag*2,885,211);x.lineTo(885,229);x.quadraticCurveTo(480,229+sag*2,75,229);x.closePath();x.fill();
  x.fillStyle='#d5d5c7';x.beginPath();x.moveTo(75,208);x.quadraticCurveTo(480,208+sag*2,885,208);x.lineTo(885,212);x.quadraticCurveTo(480,212+sag*2,75,212);x.closePath();x.fill();
  x.fillStyle='#f2c66d';for(let i=0;i<12;i++)x.fillRect(100+i*66,217,34,2);
  // guard rails, reflective studs and edge lighting
  x.strokeStyle='#9aabb4';x.lineWidth=5;x.beginPath();x.moveTo(75,201);x.lineTo(885,201);x.stroke();
  x.strokeStyle='rgba(111,223,211,.5)';x.lineWidth=2;x.beginPath();x.moveTo(75,198);x.lineTo(885,198);x.stroke();
  for(let i=0;i<17;i++){const xx=92+i*48;x.fillStyle=i%2?'#75d9cb':'#f1c36c';x.shadowColor=x.fillStyle;x.shadowBlur=8;x.beginPath();x.arc(xx,205,2.5,0,Math.PI*2);x.fill();}x.shadowBlur=0;

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
    if(g.repair==='brace'&&g.diagnosisCorrect){
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
    const roadSag=Math.max(0,1-Math.pow((truckX-480)/405,2))*sag;
    const truckY=208+roadSag-14+(collapsing?Math.pow(g.animProgress,1.7)*112:0)+(broken?112:0);
    x.save();x.translate(truckX,truckY);
    x.fillStyle='rgba(0,0,0,.34)';x.beginPath();x.ellipse(-5,13,62,7,0,0,Math.PI*2);x.fill();
    x.fillStyle='#b96b32';x.fillRect(-61,-26,107,27);x.fillStyle='#e7a64b';x.fillRect(-58,-29,101,24);
    x.fillStyle='#d89a4d';x.fillRect(-60,-31,98,5);
    x.fillStyle='#d9e5e8';x.beginPath();x.moveTo(-34,-30);x.lineTo(-28,-52);x.lineTo(10,-52);x.lineTo(19,-30);x.closePath();x.fill();
    x.fillStyle='#36566a';x.beginPath();x.moveTo(-24,-47);x.lineTo(-19,-31);x.lineTo(8,-31);x.lineTo(3,-47);x.closePath();x.fill();
    x.strokeStyle='rgba(255,255,255,.45)';x.lineWidth=2;x.beginPath();x.moveTo(-18,-45);x.lineTo(-14,-34);x.stroke();
    x.fillStyle='#f3c66d';x.fillRect(11,-22,25,14);x.fillStyle='#fff0b2';x.fillRect(40,-19,6,7);
    // Rotating wheel hubs make the vehicle feel physically in motion.
    const wheelAngle=driving?g.animProgress*760/12:(collapsing?g.animProgress*18:0);
    [-39,22].forEach(xx=>{
      x.fillStyle='#111d2b';x.beginPath();x.arc(xx,2,12,0,Math.PI*2);x.fill();
      x.fillStyle='#aebbc4';x.beginPath();x.arc(xx,2,6,0,Math.PI*2);x.fill();
      x.save();x.translate(xx,2);x.rotate(wheelAngle);x.strokeStyle='#526b7d';x.lineWidth=2;
      for(let k=0;k<4;k++){x.rotate(Math.PI/2);x.beginPath();x.moveTo(0,-2);x.lineTo(0,-5);x.stroke();}
      x.restore();
    });
    x.strokeStyle='#f4c66d';x.lineWidth=2;x.beginPath();x.moveTo(-55,-2);x.lineTo(37,-2);x.stroke();
    x.restore();
    if(failed){x.strokeStyle='#ff655f';x.lineWidth=4;x.beginPath();x.moveTo(450,211+sag);x.lineTo(480,235+sag);x.lineTo(510,211+sag);x.stroke();}
  }
  // atmospheric lighting and status label
  const glow=x.createRadialGradient(480,110,10,480,110,330);glow.addColorStop(0,'rgba(100,178,220,.15)');glow.addColorStop(1,'rgba(100,178,220,0)');x.fillStyle=glow;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(7,13,25,.58)';x.fillRect(20,18,230,35);
  x.fillStyle='#c6d5e1';x.font='600 13px sans-serif';x.textAlign='left';x.fillText(g.stage==='inspect'?'BR-04 / STRUCTURAL SCAN':g.stage==='repair'?'BR-04 / REPAIR MODE':'BR-04 / LOAD TEST',34,41);
  if(g.stage==='inspect'){x.strokeStyle='rgba(255,120,109,.85)';x.lineWidth=2;x.beginPath();x.arc(486,141,28,0,Math.PI*2);x.stroke();}
  if(collapsing||broken){
    const p=collapseT;
    // Detached steel members rotate and fall instead of the bridge simply switching state.
    x.save();x.globalAlpha=collapsing?Math.min(1,p*2.2):.96;
    const fallY=205+Math.pow(p,1.45)*150;
    x.translate(480,fallY);x.rotate(.18+p*.82);
    x.strokeStyle='#ff8276';x.lineCap='round';x.lineWidth=13;
    x.beginPath();x.moveTo(-82,-28);x.lineTo(-8,24);x.stroke();
    x.save();x.rotate(-.92);x.beginPath();x.moveTo(4,20);x.lineTo(88,-35);x.stroke();x.restore();
    x.strokeStyle='#b7c5cd';x.lineWidth=8;x.beginPath();x.moveTo(-48,-56);x.lineTo(38,54);x.stroke();
    x.restore();
    // Small fragments and dust are deterministic, so every frame remains stable.
    for(let i=0;i<13;i++){
      const seed=i*37.7, t=p;
      const px=480+Math.sin(seed)*((18+i*7)+t*34);
      const py=218+((i*29)%83)+t*t*(75+(i%4)*24);
      x.fillStyle=i%3===0?'rgba(255,132,105,.9)':'rgba(190,205,211,.78)';
      x.save();x.translate(px,py);x.rotate(seed+t*2);x.fillRect(-3,-2,6,4);x.restore();
    }
    if(collapsing){
      x.strokeStyle='rgba(255,111,98,'+(.25+p*.65)+')';x.lineWidth=3;
      x.beginPath();x.moveTo(430,210+sag);x.lineTo(462,228+sag);x.lineTo(480,218+sag);x.lineTo(505,239+sag);x.lineTo(535,210+sag);x.stroke();
    }
  }
  if(driving||collapsing){x.fillStyle='rgba(5,12,22,.78)';x.fillRect(700,18,240,35);x.fillStyle=collapsing?'#ff8276':'#8be4ca';x.font='bold 12px sans-serif';x.textAlign='right';x.fillText(collapsing?'КРИТИЧЕСКАЯ ДЕФОРМАЦИЯ':'ГРУЗОВИК В ДВИЖЕНИИ',925,40);}
}
function bridgeStartAnimation(){
  const g=BRIDGE_GAME;if(!g)return;
  const cap=g.repair==='brace'&&g.diagnosisCorrect?26:14;
  g.anim='drive';g.animProgress=0;g.result=null;
  g.message='Грузовик въезжает на пролёт. Следи за прогибом конструкции.';
  bridgeRefresh();
  const start=performance.now(),duration=4600,target=g.load>cap?.55:1;
  const tick=now=>{
    if(BRIDGE_GAME!==g)return;
    const raw=Math.min(1,(now-start)/duration);
    // Smooth acceleration and deceleration; progress remains continuous at 60 fps.
    const eased=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
    g.animProgress=eased*target;bridgeDraw();
    if(raw<1){g.animFrame=requestAnimationFrame(tick);return;}
    if(g.load>cap){
      g.anim='collapse';g.animProgress=0;g.message='Перегрузка! Центральный пролёт теряет устойчивость.';
      const t0=performance.now();
      const fall=t=>{
        if(BRIDGE_GAME!==g)return;
        const raw=Math.min(1,(t-t0)/2100);
        // Gravity-like acceleration gives the collapse weight and a readable build-up.
        g.animProgress=raw*raw;bridgeDraw();
        if(raw<1){g.animFrame=requestAnimationFrame(fall);return;}
        g.anim='';g.result='fail';g.stage='test';
        g.message='Мост не выдержал '+g.load+' т: расчётный предел — '+cap+' т. Пролёт прогнулся и разрушился. Вернись к ремонту.';
        bridgeRefresh();toast('Испытание провалено — мост разрушен.');
      };
      g.animFrame=requestAnimationFrame(fall);
    }else{
      g.anim='';g.result='pass';g.stage='done';
      g.message='Грузовик массой '+g.load+' т пересёк мост. Конструкция выдержала нагрузку '+cap+' т.';
      bridgeRefresh();toast('Мост выдержал испытание!');
    }
  };
  g.animFrame=requestAnimationFrame(tick);
}

document.addEventListener('click', e => {
  const b=e.target.closest('[data-act^="bridge"]'); if(!b||b.disabled)return;
  const d=b.dataset;
  if(d.act==='bridgeLaunch') return;
  if(BRIDGE_GAME&&BRIDGE_GAME.anim&&d.act!=='bridgeReset')return;
  const g=BRIDGE_GAME; if(!g)return;
  if(d.act==='bridgeInspect'){
    if(d.v==='brace'){g.inspected=true;g.diagnosisCorrect=true;g.stage='repair';g.message='Верно. Диагональный раскос передаёт усилия между узлами фермы. Его повреждение нарушило силовую схему.';}
    else {g.inspected=true;g.diagnosisCorrect=false;g.stage='repair';g.message='Диагноз неверный: выбранный элемент не разорвал силовую схему. Продолжай ремонт, но мост останется ослабленным — испытание покажет последствия.';toast('Неверный диагноз. Миссия продолжается — проверь последствия на испытании.');}
  } else if(d.act==='bridgeRepair'){
    g.repair=d.v;g.stage='test';
    g.message=d.v==='brace'&&g.diagnosisCorrect?'Стальной раскос восстановил путь передачи усилий. Расчётная несущая способность выросла до 26 тонн.':(d.v==='brace'?'Решение верное, но исходный дефект определён неправильно. Остались скрытые повреждения: предел — 14 тонн.':'Это не устраняет разрыв силовой схемы. Несущая способность остаётся около 14 тонн.');
    g.result=null;
  } else if(d.act==='bridgeLoad'){g.load=Number(d.v);g.result=null;g.message='';}
  else if(d.act==='bridgeRunTest'){
    if(g.anim)return;
    bridgeStartAnimation();return;
  } else if(d.act==='bridgePrev'){g.stage='repair';g.result=null;g.message='Выбери решение, которое восстановит диагональную связь между узлами.';}
  else if(d.act==='bridgeReset'){if(g.animFrame)cancelAnimationFrame(g.animFrame);BRIDGE_GAME=bridgeFresh();}
  bridgeRefresh();
});

window.addEventListener('resize',()=>{if(document.getElementById('bridge-scene'))bridgeDraw();});
