/* ---------- Инженер катастроф · premium mission engine ---------- */
let BRIDGE_GAME = null;
const BRIDGE_STAGES = ['survey','diagnose','repair','test','result'];
const BRIDGE_FINDINGS = {
  joint: {title:'Разрыв узлового соединения',detail:'На центральной накладке видна свежая трещина. Болты смещены, металл вытянут по диагонали.',status:'КРИТИЧЕСКОЕ ПОВРЕЖДЕНИЕ'},
  deck: {title:'Полотно без критических дефектов',detail:'Дорожная плита цела. Есть следы ударной нагрузки, но нет сквозных трещин.',status:'В НОРМЕ'},
  pier: {title:'Опора сохраняет геометрию',detail:'Осадка не обнаружена. Опорный узел стоит ровно, подвижка фундамента в пределах допуска.',status:'В НОРМЕ'}
};
function bridgeFresh(){
  return {stage:'survey',findings:[],diagnosisCorrect:false,diagnosis:null,repair:null,repairSteps:0,load:20,result:null,message:'',anim:'',animProgress:0,animFrame:0,startedAt:0};
}
function bridgeEsc(s){return esc(String(s));}
function bridgeCapacity(g){return g.diagnosisCorrect&&g.repair==='brace'&&g.repairSteps>=3?26:14;}
function bridgeLaunch(){
  if(BRIDGE_GAME&&BRIDGE_GAME.animFrame)cancelAnimationFrame(BRIDGE_GAME.animFrame);
  BRIDGE_GAME=bridgeFresh();
  if(location.hash==='#game-bridge'){if(typeof render==='function')render();else vBridgeGame();}
  else location.hash='game-bridge';
}
function bridgeStageLabel(stage){return ({survey:'ОБСЛЕДОВАНИЕ',diagnose:'АНАЛИЗ ДАННЫХ',repair:'ВОССТАНОВЛЕНИЕ',test:'НАГРУЗОЧНЫЙ ТЕСТ',result:'ОТЧЁТ МИССИИ'})[stage]||'FIELD OPERATIONS';}
function bridgeMarkup(){
  if(!BRIDGE_GAME)BRIDGE_GAME=bridgeFresh();
  const g=BRIDGE_GAME,cap=bridgeCapacity(g),stageIndex=BRIDGE_STAGES.indexOf(g.stage);
  let controls='';
  if(g.stage==='survey'){
    const rows=[['joint','01','Центральный узел','Ультразвуковой контроль соединения'],['deck','02','Дорожное полотно','Сканирование поверхности'],['pier','03','Береговая опора','Проверка геометрии опоры']];
    controls='<div class="b3-instruction"><span class="b3-eyebrow">ПРОТОКОЛ ОБСЛЕДОВАНИЯ</span><h3>Проверь три контрольные точки</h3><p>Собери данные с объекта. Не делай вывод по одному визуальному признаку.</p></div><div class="b3-scan-list">'+rows.map(r=>{
      const done=g.findings.includes(r[0]),f=BRIDGE_FINDINGS[r[0]];
      return '<button class="b3-scan '+(done?'scanned':'')+'" data-act="bridgeScan" data-v="'+r[0]+'" '+(done?'disabled':'')+'><span class="b3-scan-num">'+r[1]+'</span><span class="b3-scan-copy"><b>'+r[2]+'</b><small>'+r[3]+'</small>'+(done?'<em>'+f.status+'</em><small class="b3-evidence">'+f.detail+'</small>':'')+'</span><span class="b3-scan-state">'+(done?'✓':'＋')+'</span></button>';
    }).join('')+'</div><div class="b3-progress-note"><span>ДАННЫЕ СОБРАНЫ</span><b>'+g.findings.length+' / 3</b><i><em style="width:'+(g.findings.length/3*100)+'%"></em></i></div>';
  }else if(g.stage==='diagnose'){
    controls='<div class="b3-instruction"><span class="b3-eyebrow">АНАЛИЗ ПОВРЕЖДЕНИЙ</span><h3>Что стало причиной аварии?</h3><p>Сопоставь результаты трёх проверок и выбери первопричину. Ошибка не завершит миссию, но повлияет на результат испытания.</p></div><div class="b3-choice-grid">'+
    '<button class="b3-choice" data-act="bridgeDiagnosis" data-v="brace"><span class="b3-choice-icon">⌁</span><b>Разрушение диагональной связи</b><small>Нарушен путь передачи усилий между узлами фермы</small></button>'+
    '<button class="b3-choice" data-act="bridgeDiagnosis" data-v="deck"><span class="b3-choice-icon">▤</span><b>Разрушение дорожной плиты</b><small>Потеря жёсткости проезжей части</small></button>'+
    '<button class="b3-choice" data-act="bridgeDiagnosis" data-v="pier"><span class="b3-choice-icon">▥</span><b>Осадка береговой опоры</b><small>Смещение фундамента и перекос пролёта</small></button></div>';
  }else if(g.stage==='repair'){
    const steps=['Подать новую стальную тягу','Совместить узловые пластины','Затянуть четыре силовых болта'];
    controls='<div class="b3-instruction"><span class="b3-eyebrow">РЕМОНТНЫЙ ПОСТ</span><h3>Восстанови силовую схему</h3><p>Выбери способ ремонта, затем выполни монтаж. Важно не просто закрыть трещину, а вернуть путь передачи нагрузки.</p></div>'+
    '<div class="b3-repair-grid">'+
    '<button class="b3-repair-card '+(g.repair==='brace'?'chosen':'')+'" data-act="bridgeRepairSelect" data-v="brace"><span class="b3-repair-art brace-art">╱</span><b>Новая диагональная тяга</b><small>Высокопрочная сталь · восстановление фермы</small><em>РЕКОМЕНДОВАНО</em></button>'+
    '<button class="b3-repair-card '+(g.repair==='deck'?'chosen':'')+'" data-act="bridgeRepairSelect" data-v="deck"><span class="b3-repair-art deck-art">▰</span><b>Накладка на полотно</b><small>Усиление дорожной плиты</small></button>'+
    '<button class="b3-repair-card '+(g.repair==='weld'?'chosen':'')+'" data-act="bridgeRepairSelect" data-v="weld"><span class="b3-repair-art weld-art">✳</span><b>Локальная сварка</b><small>Заделка видимой трещины</small></button></div>'+
    (g.repair?'<div class="b3-work-order"><div class="b3-work-head"><span class="b3-eyebrow">МОНТАЖНЫЙ ЧЕК-ЛИСТ</span><b>'+g.repairSteps+'/3</b></div><div class="b3-work-track"><i style="width:'+(g.repairSteps/3*100)+'%"></i></div>'+steps.map((s,i)=>'<button class="b3-work-step '+(i<g.repairSteps?'complete':'')+'" data-act="bridgeRepairStep" data-v="'+i+'" '+(i!==g.repairSteps||g.repairSteps>=3?'disabled':'')+'><span>'+(i<g.repairSteps?'✓':String(i+1).padStart(2,'0'))+'</span>'+s+'<small>'+(i<g.repairSteps?'ВЫПОЛНЕНО':i===g.repairSteps?'ВЫПОЛНИТЬ':'ОЖИДАНИЕ')+'</small></button>').join('')+(g.repairSteps>=3?'<button class="btn wide b3-primary" data-act="bridgeGoTest">Перейти к испытанию →</button>':'')+'</div>':'<div class="b3-hint">Выбери ремонтный комплект, чтобы начать монтаж.</div>');
  }else if(g.stage==='test'){
    controls='<div class="b3-instruction"><span class="b3-eyebrow">ПРИЁМОЧНОЕ ИСПЫТАНИЕ</span><h3>Проверь мост под нагрузкой</h3><p>Выбери массу контрольного грузовика. Нагрузка будет приложена постепенно, а датчики покажут реакцию конструкции.</p></div><div class="b3-load-select">'+[12,20,28].map(n=>'<button class="b3-load '+(g.load===n?'selected':'')+'" data-act="bridgeLoad" data-v="'+n+'"><b>'+n+'<small> т</small></b><span>'+(n===12?'ЛЁГКИЙ':n===20?'РАБОЧИЙ':'ТЯЖЁЛЫЙ')+'</span></button>').join('')+'</div><div class="b3-capacity"><div><span>РАСЧЁТНЫЙ ПРЕДЕЛ</span><b>'+cap+' т</b></div><div class="b3-cap-track"><i style="width:'+Math.min(100,g.load/30*100)+'%"></i><em style="left:'+Math.min(100,cap/30*100)+'%"></em></div><small>'+(g.load<=cap?'Нагрузка в пределах расчётного допуска':'ВНИМАНИЕ: нагрузка превышает допустимый предел')+'</small></div><button class="btn wide b3-primary b3-run" data-act="bridgeRunTest">▶  Начать нагрузочное испытание</button>';
  }else{
    const pass=g.result==='pass';
    controls='<div class="b3-result '+(pass?'passed':'failed')+'"><span class="b3-result-mark">'+(pass?'✓':'!')+'</span><span class="b3-eyebrow">'+(pass?'ОБЪЕКТ СДАН':'АВАРИЙНЫЙ СЦЕНАРИЙ')+'</span><h3>'+(pass?'Мост выдержал испытание':'Конструкция разрушена')+'</h3><p>'+bridgeEsc(g.message)+'</p><div class="b3-result-stats"><div><b>'+(g.load)+' т</b><small>Нагрузка</small></div><div><b>'+cap+' т</b><small>Предел</small></div><div><b>'+(pass?(g.diagnosisCorrect&&g.repair==='brace'?'+100':' +55'):'0')+'</b><small>Очки миссии</small></div></div><button class="btn wide b3-primary" data-act="bridgeReset">Повторить миссию</button></div>';
  }
  return '<div class="bridge-game-v3">'+
    '<div class="b3-mission-head"><div><span class="b3-eyebrow">FIELD OPERATIONS / CASE 001</span><h2>Мост «Северный пролёт»</h2><p>Аварийная инженерная операция · сектор 04</p></div><div class="b3-live"><i></i> LIVE INCIDENT</div></div>'+
    '<div class="b3-stagebar">'+BRIDGE_STAGES.map((s,i)=>'<span class="'+(i===stageIndex?'active':i<stageIndex?'done':'')+'"><i>'+(i<stageIndex?'✓':'0'+(i+1))+'</i><small>'+['Осмотр','Диагноз','Ремонт','Тест','Отчёт'][i]+'</small></span>').join('')+'</div>'+
    '<div class="b3-scene-frame"><canvas id="bridge-scene" aria-label="Стилизованная объёмная сцена аварийного моста"></canvas><div class="b3-hud-top"><span><i></i> BR-04 / STRUCTURAL MONITOR</span><b>'+bridgeStageLabel(g.stage)+'</b></div><div class="b3-hud-bottom"><span>ВЕТЕР 4.2 М/С</span><span>ТЕМПЕРАТУРА +08°</span><span>ОБЪЕКТ: МОСТ 04-А</span></div><div class="b3-scan-reticle"></div></div>'+
    '<div class="b3-console"><section class="b3-brief-card"><span class="b3-eyebrow">СВОДКА ОПЕРАЦИИ</span><h3>'+(g.stage==='survey'?'На объекте обнаружена деформация':g.stage==='diagnose'?'Данные обследования готовы':g.stage==='repair'?'Подготовка ремонтной бригады':g.stage==='test'?'Проверка несущей способности':'Операция завершена')+'</h3><p>'+(g.stage==='survey'?'Тяжёлый транспорт вызвал подозрение на повреждение фермы. Проведи инструментальную проверку трёх контрольных точек.':g.stage==='diagnose'?'Сравни результаты ультразвукового сканирования, осмотра полотна и проверки опор.':g.stage==='repair'?'Используй подходящий комплект и выполни монтаж в правильной последовательности.':g.stage==='test'?'Следи за прогибом пролёта и телеметрией во время движения грузовика.':'Оцени результат и попробуй другой инженерный подход.')+'</p><div class="b3-telemetry"><div><small>ПРОГИБ ПРОЛЁТА</small><b>'+(g.anim==='drive'?Math.round(g.animProgress*18)+' мм':g.result==='fail'?'КРИТИЧЕСКИЙ':'2 мм')+'</b></div><div><small>СОСТОЯНИЕ УЗЛОВ</small><b class="'+(g.result==='fail'?'danger':'')+'">'+(g.result==='fail'?'РАЗРУШЕНИЕ':g.repairSteps>=3?'УСИЛЕН':'ТРЕБУЕТ ПРОВЕРКИ')+'</b></div></div></section><section class="b3-control-card">'+controls+'</section></div>'+
    '<div class="b3-footer"><span>PHYSICS ENGINE / STRUCTURAL SIMULATION</span><span>MISSION 01 · BRIDGE FAILURE</span></div></div>';
}
function vBridgeGame(){if(!BRIDGE_GAME)BRIDGE_GAME=bridgeFresh();frame('Инженер катастроф',{back:true,sub:'Операция 01 · Северный пролёт'});setMain(bridgeMarkup());bridgeDraw();}
function bridgeMorphNode(oldNode,newNode){
  if(oldNode.nodeType!==newNode.nodeType||oldNode.nodeName!==newNode.nodeName)return newNode.cloneNode(true);
  if(oldNode.nodeType===Node.TEXT_NODE){if(oldNode.nodeValue!==newNode.nodeValue)oldNode.nodeValue=newNode.nodeValue;return oldNode;}
  if(oldNode.nodeType!==Node.ELEMENT_NODE||oldNode.tagName==='CANVAS')return oldNode;
  for(const a of [...oldNode.attributes])if(!newNode.hasAttribute(a.name))oldNode.removeAttribute(a.name);
  for(const a of [...newNode.attributes])if(oldNode.getAttribute(a.name)!==a.value)oldNode.setAttribute(a.name,a.value);
  const oldChildren=[...oldNode.childNodes],newChildren=[...newNode.childNodes];
  for(let i=0;i<newChildren.length;i++){
    const o=oldChildren[i],n=newChildren[i];
    if(!o)oldNode.appendChild(n.cloneNode(true));
    else if(o.nodeType!==n.nodeType||o.nodeName!==n.nodeName)oldNode.replaceChild(n.cloneNode(true),o);
    else bridgeMorphNode(o,n);
  }
  for(let i=newChildren.length;i<oldChildren.length;i++)if(oldChildren[i].parentNode===oldNode)oldNode.removeChild(oldChildren[i]);
  return oldNode;
}
function bridgeRefresh(){
  const old=document.querySelector('.bridge-game-v3');if(!old){vBridgeGame();return;}
  const y=document.querySelector('#main')?.scrollTop||0,t=document.createElement('template');t.innerHTML=bridgeMarkup().trim();
  bridgeMorphNode(old,t.content.firstElementChild);
  const main=document.querySelector('#main');if(main)main.scrollTop=y;
  bridgeDraw();
}
function bridgeDraw(){
  const c=document.getElementById('bridge-scene');if(!c)return;
  const rect=c.getBoundingClientRect(),cssW=Math.max(320,rect.width||960),cssH=cssW*9/16,dpr=Math.min(2,window.devicePixelRatio||1);
  if(c.width!==Math.round(cssW*dpr)||c.height!==Math.round(cssH*dpr)){c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr);}
  c.style.height=cssH+'px';
  const x=c.getContext('2d');x.setTransform(c.width/1200,0,0,c.height/675,0,0);x.imageSmoothingEnabled=true;
  const g=BRIDGE_GAME||bridgeFresh(),driving=g.anim==='drive',collapsing=g.anim==='collapse',failed=g.result==='fail';
  const cap=bridgeCapacity(g),loadRatio=Math.min(1.8,g.load/cap),driveP=driving?g.animProgress:(collapsing?.56:failed?.56:(g.result==='pass'?1:0));
  const stress=driving?Math.max(0,Math.sin(Math.PI*g.animProgress)*loadRatio):failed?1.2:0;
  const sag=failed?88:stress*34;
  const collapse=collapsing?g.animProgress:failed?1:0;
  const point=(px,py)=>{const influence=Math.max(0,1-Math.abs(px-600)/330);return [px+(collapse?Math.sign(px-600)*collapse*24*influence:0),py+sag*influence+collapse*145*influence];};
  const poly=(pts,fill,stroke,lw)=>{x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=lw||1;x.stroke();}};
  const line=(a,b,color,width,shadow)=>{a=point(a[0],a[1]);b=point(b[0],b[1]);x.save();x.lineCap='round';x.lineJoin='round';x.strokeStyle=color;x.lineWidth=width;if(shadow){x.shadowColor=shadow;x.shadowBlur=12;}x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.restore();};
  const grad=x.createLinearGradient(0,0,0,675);grad.addColorStop(0,'#172a48');grad.addColorStop(.48,'#405c75');grad.addColorStop(1,'#111e32');x.fillStyle=grad;x.fillRect(0,0,1200,675);
  const sun=x.createRadialGradient(890,135,8,890,135,270);sun.addColorStop(0,'rgba(255,190,122,.34)');sun.addColorStop(1,'rgba(255,160,100,0)');x.fillStyle=sun;x.fillRect(600,0,600,430);
  // Layered distant ridges and industrial skyline.
  poly([[0,310],[120,220],[230,278],[350,190],[500,280],[650,205],[790,285],[960,190],[1200,275],[1200,470],[0,470]],'#263c55');
  poly([[0,360],[140,285],[270,345],[430,250],[570,335],[760,260],[910,345],[1080,260],[1200,315],[1200,480],[0,480]],'#304c61');
  x.save();x.globalAlpha=.72;
  [[25,270,70,150],[110,245,55,175],[185,295,82,125],[295,250,65,170],[390,280,78,140],[760,270,66,155],[850,238,78,187],[950,280,65,145],[1040,250,90,175],[1145,290,48,135]].forEach((b,i)=>{x.fillStyle=i%2?'#1a3047':'#20384e';x.fillRect(b[0],b[1],b[2],b[3]);x.fillStyle='rgba(247,185,119,.26)';for(let yy=b[1]+14;yy<b[1]+b[3]-8;yy+=20)for(let xx=b[0]+10;xx<b[0]+b[2]-7;xx+=17)x.fillRect(xx,yy,5,7);});
  x.restore();
  const haze=x.createLinearGradient(0,270,0,480);haze.addColorStop(0,'rgba(164,192,201,0)');haze.addColorStop(1,'rgba(22,48,68,.58)');x.fillStyle=haze;x.fillRect(0,260,1200,230);
  // River with reflections.
  const water=x.createLinearGradient(0,430,0,675);water.addColorStop(0,'#1a667d');water.addColorStop(.4,'#10445f');water.addColorStop(1,'#081f38');x.fillStyle=water;x.fillRect(0,430,1200,245);
  for(let i=0;i<38;i++){const yy=455+(i*37)%200,xx=(i*137)%1200;x.strokeStyle='rgba(125,218,220,'+(0.06+(i%4)*.025)+')';x.lineWidth=1+(i%3);x.beginPath();x.moveTo(xx,yy);x.bezierCurveTo(xx+24,yy-4,xx+54,yy+4,xx+90,yy);x.stroke();}
  // Concrete piers with lit side faces.
  [[260,380],[940,380]].forEach((p,i)=>{const xx=p[0],top=p[1];poly([[xx-48,top],[xx+48,top],[xx+75,530],[xx-72,530]],'#738894','#a9bdc3',3);poly([[xx+48,top],[xx+67,top+7],[xx+93,530],[xx+75,530]],'#435e70');poly([[xx-90,530],[xx+94,530],[xx+110,548],[xx-105,548]],'#354c60');x.fillStyle='rgba(255,195,126,.18)';x.fillRect(xx-38,top+28,6,100);});
  // Bridge deck and its layered fascia.
  const deckY=370;
  poly([[90,deckY],[1110,deckY],[1080,405],[120,405]],'#263c4d','#b3c7ca',3);
  poly([[90,deckY],[1110,deckY],[1100,382],[100,382]],'#8fa3aa','#d5e1dc',2);
  poly([[100,deckY+4],[1100,deckY+4],[1090,378],[110,378]],'#394c5b');
  x.save();x.strokeStyle='#f4ca83';x.lineWidth=4;x.setLineDash([42,34]);x.beginPath();x.moveTo(135,374);x.lineTo(1065,374);x.stroke();x.restore();
  // Steel truss in perspective: rear layer, structural members, front layer.
  const bottom=[150,330,510,690,870,1050].map((px)=>[px,deckY+8]);
  const top=[240,420,600,780,960].map(px=>[px,215]);
  const drawTruss=(offset,color,width,glow)=>{const off=p=>[p[0]+offset,p[1]-offset*.16];for(let i=0;i<bottom.length-1;i++){line(off(bottom[i]),off(bottom[i+1]),color,width,glow);line(off(bottom[i]),off(top[i]),color,width,glow);line(off(top[i]),off(bottom[i+1]),color,width,glow);}for(let i=0;i<top.length-1;i++)line(off(top[i]),off(top[i+1]),color,width,glow);for(let i=1;i<top.length;i++)line(off(top[i]),off(bottom[i+1]),color,width*.72,glow);};
  drawTruss(28,'#304b60',18,null);
  drawTruss(0,'#91a9b3',13,'rgba(84,211,197,.28)');
  // Metallic edge highlights on the truss members.
  for(let i=0;i<bottom.length-1;i++){line(bottom[i],[bottom[i+1][0],bottom[i+1][1]-7],'#d1e0dc',3,null);line(bottom[i],top[i],'#c2d4d5',3,null);}
  // Central damaged connection / replacement brace.
  const braceA=top[2],braceB=bottom[3];
  if(g.stage==='survey'||g.stage==='diagnose'){
    const a=point(braceA[0],braceA[1]),b=point(braceB[0],braceB[1]);
    x.save();x.strokeStyle='#ff9a73';x.lineWidth=13;x.setLineDash([18,12]);x.beginPath();x.moveTo(a[0],a[1]);x.lineTo((a[0]+b[0])/2-10,(a[1]+b[1])/2+12);x.moveTo((a[0]+b[0])/2+14,(a[1]+b[1])/2-8);x.lineTo(b[0],b[1]);x.stroke();x.setLineDash([]);x.restore();
    x.fillStyle='#ff9a73';x.shadowColor='#ff775f';x.shadowBlur=22;x.beginPath();x.arc(600,285,9+Math.sin(performance.now()/260)*2,0,Math.PI*2);x.fill();x.shadowBlur=0;
  }else if(g.repair==='brace'&&g.repairSteps>0){
    line(braceA,braceB,g.repairSteps>=3?'#67edc2':'#e7b86f',g.repairSteps>=3?14:10,'rgba(79,231,188,.45)');
    if(g.repairSteps>=3){const mid=[600,290];x.fillStyle='#a9ffe4';for(let k=0;k<4;k++){x.beginPath();x.arc(mid[0]+(k%2?12:-12),mid[1]+(k<2?-10:10),4,0,Math.PI*2);x.fill();}}
  }else if(g.repair){line(braceA,braceB,'#ff946f',8,'rgba(255,112,91,.3)');}
  // Survey hotspots, one disappears after a scan.
  const spots=[['joint',600,285],['deck',620,376],['pier',940,455]];
  spots.forEach(p=>{if(g.findings.includes(p[0]))return;const pulse=1+Math.sin(performance.now()/280)*.14;x.save();x.strokeStyle='rgba(255,190,123,.9)';x.lineWidth=3;x.shadowColor='#ffad72';x.shadowBlur=15;x.beginPath();x.arc(p[1],p[2],17*pulse,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(p[1]-26,p[2]);x.lineTo(p[1]-10,p[2]);x.moveTo(p[1]+10,p[2]);x.lineTo(p[1]+26,p[2]);x.moveTo(p[1],p[2]-26);x.lineTo(p[1],p[2]-10);x.moveTo(p[1],p[2]+10);x.lineTo(p[1],p[2]+26);x.stroke();x.restore();});
  // Truck: body stays grounded on the road; wheel rotation is tied to travel.
  if(g.stage==='test'||g.stage==='result'||driving||collapsing){
    const tx=driving?145+910*driveP:collapsing?145+910*.56:g.result==='pass'?1050:650;
    const influence=Math.max(0,1-Math.abs(tx-600)/500),ty=deckY-16+sag*influence+collapse*95*influence;
    x.save();x.translate(tx,ty);x.fillStyle='rgba(0,0,0,.36)';x.beginPath();x.ellipse(0,30,84,13,0,0,Math.PI*2);x.fill();
    x.fillStyle='#c16f43';x.beginPath();x.roundRect(-76,-48,135,43,8);x.fill();x.fillStyle='#efad69';x.beginPath();x.roundRect(-70,-55,123,35,7);x.fill();
    x.fillStyle='#e7edf0';x.beginPath();x.moveTo(-30,-54);x.lineTo(-21,-91);x.lineTo(35,-91);x.lineTo(51,-54);x.closePath();x.fill();
    x.fillStyle='#42647b';x.beginPath();x.moveTo(-17,-83);x.lineTo(-12,-59);x.lineTo(38,-59);x.lineTo(30,-83);x.closePath();x.fill();
    x.fillStyle='#ffcf7b';x.fillRect(49,-43,12,12);x.fillStyle='#fff0c6';x.fillRect(61,-41,7,8);
    const angle=driving?driveP*9:collapsing?g.animProgress*12:0;
    [-48,34].forEach(wx=>{x.fillStyle='#101c2a';x.beginPath();x.arc(wx,0,18,0,Math.PI*2);x.fill();x.fillStyle='#9db4bd';x.beginPath();x.arc(wx,0,9,0,Math.PI*2);x.fill();x.save();x.translate(wx,0);x.rotate(angle);x.strokeStyle='#435d6b';x.lineWidth=3;for(let k=0;k<4;k++){x.rotate(Math.PI/2);x.beginPath();x.moveTo(0,-3);x.lineTo(0,-8);x.stroke();}x.restore();});
    x.restore();
  }
  // Dynamic structural warning and falling steel during collapse.
  if(collapsing||failed){
    const p=collapse;x.save();x.globalAlpha=collapsing?Math.min(1,p*2.4):.95;
    [[-70,-15,55,55],[20,-30,115,75],[-10,20,-100,105]].forEach((v,i)=>{x.save();x.translate(600+Math.sin(p*4+i)*p*30,300+p*p*190);x.rotate(p*(i%2?1:-1)*1.1);x.strokeStyle=i===1?'#f6a276':'#b6c9ce';x.lineWidth=13;x.lineCap='round';x.beginPath();x.moveTo(v[0],v[1]);x.lineTo(v[2],v[3]);x.stroke();x.restore();});
    x.restore();
    x.fillStyle='rgba(9,14,24,.34)';x.fillRect(0,0,1200,675);
  }
  // Subtle film grain / vignette and scene edge lighting.
  const vignette=x.createRadialGradient(600,330,260,600,330,760);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(4,9,18,.46)');x.fillStyle=vignette;x.fillRect(0,0,1200,675);
  x.fillStyle='rgba(8,17,29,.7)';x.fillRect(26,24,280,40);x.fillStyle='#d4e6e5';x.font='700 15px sans-serif';x.textAlign='left';x.fillText('NORTH SPAN  /  BR-04',44,50);
  if(driving||collapsing){x.fillStyle='rgba(8,17,29,.82)';x.fillRect(890,24,280,40);x.fillStyle=collapsing?'#ff967b':'#77e8c8';x.textAlign='right';x.fillText(collapsing?'STRUCTURAL FAILURE':'LOAD TEST IN PROGRESS',1150,50);}
}
function bridgeStartAnimation(){
  const g=BRIDGE_GAME;if(!g||g.anim)return;
  g.anim='drive';g.animProgress=0;g.result=null;g.message='Грузовик входит на пролёт. Датчики фиксируют деформацию в реальном времени.';
  bridgeRefresh();
  const start=performance.now(),duration=5700,target=g.load>bridgeCapacity(g)?.56:1;
  const tick=now=>{if(BRIDGE_GAME!==g)return;const raw=Math.min(1,(now-start)/duration),eased=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;g.animProgress=eased*target;bridgeDraw();if(raw<1){g.animFrame=requestAnimationFrame(tick);return;}
    if(g.load>bridgeCapacity(g)){g.anim='collapse';g.animProgress=0;g.message='Критическая перегрузка. Центральный узел теряет устойчивость.';const t0=performance.now();const fall=t=>{if(BRIDGE_GAME!==g)return;const p=Math.min(1,(t-t0)/2300);g.animProgress=p*p;bridgeDraw();if(p<1){g.animFrame=requestAnimationFrame(fall);return;}g.anim='';g.animFrame=0;g.result='fail';g.stage='result';g.message='Мост не выдержал нагрузку '+g.load+' т. Расчётный предел после выбранного ремонта — '+bridgeCapacity(g)+' т. Пролёт потерял устойчивость.';bridgeRefresh();toast('Испытание провалено — зафиксировано разрушение.');};g.animFrame=requestAnimationFrame(fall);
    }else{g.anim='';g.animFrame=0;g.result='pass';g.stage='result';g.message='Грузовик массой '+g.load+' т прошёл пролёт. Прогиб остался в допустимых пределах, узлы сохранили геометрию.';bridgeRefresh();toast('Испытание пройдено!');}
  };
  g.animFrame=requestAnimationFrame(tick);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act^="bridge"]');if(!b||b.disabled)return;
  const d=b.dataset;if(d.act==='bridgeLaunch'){e.preventDefault();bridgeLaunch();return;}
  if(BRIDGE_GAME&&BRIDGE_GAME.anim)return;
  const g=BRIDGE_GAME;if(!g)return;
  if(d.act==='bridgeScan'){
    if(!g.findings.includes(d.v)){g.findings.push(d.v);if(g.findings.length===3){g.stage='diagnose';g.message='Все контрольные точки обследованы. Сопоставь показания.';}}
  }else if(d.act==='bridgeDiagnosis'){
    g.diagnosis=d.v;g.diagnosisCorrect=d.v==='brace';g.stage='repair';g.repair=null;g.repairSteps=0;
    g.message=g.diagnosisCorrect?'Верно: разрушена диагональная связь. Именно она передавала усилия между узлами фермы.':'Диагноз ошибочный. Миссию можно продолжить, но скрытый дефект останется и проявится при испытании.';
    if(!g.diagnosisCorrect)toast('Неверный диагноз. Последствия проявятся на испытании.');
  }else if(d.act==='bridgeRepairSelect'){g.repair=d.v;g.repairSteps=0;}
  else if(d.act==='bridgeRepairStep'){if(Number(d.v)===g.repairSteps&&g.repairSteps<3)g.repairSteps++;}
  else if(d.act==='bridgeGoTest'){if(g.repairSteps>=3)g.stage='test';}
  else if(d.act==='bridgeLoad'){g.load=Number(d.v);}
  else if(d.act==='bridgeRunTest'){bridgeStartAnimation();return;}
  else if(d.act==='bridgeReset'){if(g.animFrame)cancelAnimationFrame(g.animFrame);BRIDGE_GAME=bridgeFresh();}
  bridgeRefresh();
});
window.addEventListener('resize',()=>{if(document.getElementById('bridge-scene'))bridgeDraw();});
