/* CORE 1.9 — Canvas-визуальный движок ядра */
(() => {
  'use strict';
  const q = s => document.querySelector(s);
  const game = q('#game');
  const area = q('.core-area');
  if (!game || !area) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'core-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  area.insertBefore(canvas, area.firstChild);
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  // Полноэкранный космический слой: отдельный canvas, чтобы частицы и длинные орбиты жили за пределами core-area.
  const spaceCanvas = document.createElement('canvas');
  spaceCanvas.className = 'core-space-canvas';
  spaceCanvas.setAttribute('aria-hidden', 'true');
  game.insertBefore(spaceCanvas, game.firstChild);
  const sctx = spaceCanvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!sctx) return;
  let sw=0, sh=0, sdpr=1;
  const stars = Array.from({length:135}, (_,i)=>({u:Math.random(),v:Math.random(),r:.28+Math.random()*1.35,a:.13+Math.random()*.52,p:Math.random()*6.28,s:.12+Math.random()*.72,z:.15+Math.random()*.85}));
  const spaceDust = Array.from({length:34}, (_,i)=>({u:Math.random(),v:Math.random(),r:.45+Math.random()*1.7,a:.08+Math.random()*.22,p:Math.random()*6.28,s:.18+Math.random()*.5,z:.45+Math.random()*.55}));
  function resizeSpace(){ const r=game.getBoundingClientRect(); sw=Math.max(1,Math.round(r.width)); sh=Math.max(1,Math.round(r.height)); sdpr=Math.min(2,window.devicePixelRatio||1); spaceCanvas.width=sw*sdpr; spaceCanvas.height=sh*sdpr; spaceCanvas.style.width=sw+'px'; spaceCanvas.style.height=sh+'px'; sctx.setTransform(sdpr,0,0,sdpr,0,0); }
  resizeSpace();
  const spaceRO='ResizeObserver' in window?new ResizeObserver(resizeSpace):null; spaceRO?.observe(game);

  const zone = document.createElement('div');
  zone.className = 'home-zone';
  zone.innerHTML = `
    <div class="zone-halo" aria-hidden="true"></div>
    <div class="zone-grid" aria-hidden="true"></div>
    <button class="zone-node n1" data-zone-action="upgrade" aria-label="Прокачка"><i class="fa-solid fa-chart-line"></i><span class="node-badge" id="zone-upgrade-badge">1</span></button>
    <button class="zone-node n2" data-zone-action="research" aria-label="Исследования"><i class="fa-solid fa-flask"></i><span class="node-badge" id="zone-research-badge">0</span></button>
    <button class="zone-node n3" data-zone-action="quests" aria-label="Задания"><i class="fa-solid fa-list-check"></i><span class="node-badge" id="zone-quests-badge">0</span></button>
    <button class="zone-node n4" data-zone-action="inventory" aria-label="Инвентарь"><i class="fa-solid fa-box-open"></i><span class="node-badge" id="zone-inventory-badge">0</span></button>
    <button class="zone-node resonance-node" data-zone-action="resonance" aria-label="Резонанс"><i class="fa-solid fa-atom"></i><span class="node-badge" id="zone-resonance-badge">0</span></button>`;
  game.appendChild(zone);

  const action = name => {
    if (window.CORE?.openScreen) { window.CORE.openScreen(name); return; }
    const map = { upgrade:'[data-screen="upgrade"]', quests:'[data-screen="quests"]', inventory:'[data-screen="inventory"]', research:'[data-screen="research"]', resonance:'[data-screen="resonance"]' };
    const el = q(map[name]); if (el) el.click();
  };
  zone.addEventListener('click', e => {
    const b = e.target.closest('[data-zone-action]');
    if (!b) return;
    e.preventDefault();
    action(b.dataset.zoneAction);
  });

  const coreButton = q('.core-button');
  // Жидкое ядро теперь живёт за счёт непрерывной деформации слоёв CSS.
  // Тап влияет только на игровую экономику; визуального возмущения ядра нет.
  const fluidCanvas = q('.core-fluid-canvas');
  const fluidCtx = null;
  let fluidWidth = 1, fluidHeight = 1, fluidDpr = 1;
  function resizeFluid() {
    if (!coreButton) return;
    const r = coreButton.getBoundingClientRect();
    fluidWidth = Math.max(1, Math.round(r.width));
    fluidHeight = Math.max(1, Math.round(r.height));
    fluidDpr = Math.min(2, window.devicePixelRatio || 1);
  }
  resizeFluid();
  const fluidRO = 'ResizeObserver' in window ? new ResizeObserver(resizeFluid) : null;
  fluidRO?.observe(coreButton);


  let width = 0, height = 0, dpr = 1;
  let last = performance.now();
  let angles = [32, -54, 71];
  let flash = 0;
  let shock = 0;
  let time = 0;
  let charge = 0;
  const volumeA = q('.core-volume-a');
  const volumeB = q('.core-volume-b');
  const volumeC = q('.core-volume-c');
  // Визуальный рост ядра по стадиям. Размер меняется мягко и только визуально:
  // механика, орбиты и рабочая зона остаются прежними.
  function updateCoreScale() {
    if (!coreButton) return;
    const level = parseInt(q('#home-core-level')?.textContent || '1', 10) || 1;
    const stage = Math.max(0, Math.min(5, Math.floor((level - 1) / 5)));
    // Размер не растёт: уровень меняет только пластику жидкости.
    coreButton.style.setProperty('--core-scale', '1');
    coreButton.style.setProperty('--core-stage', stage);
  }
  updateCoreScale();

  function resize() {
    const rect = area.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(area);
  window.addEventListener('resize', resize, { passive:true });
  resize();

  function settingsScale() {
    const b = document.body;
    if (b.classList.contains('settings-no-animation')) return 0;
    if (b.classList.contains('settings-reduced-motion')) return .16;
    if (b.classList.contains('settings-battery-saver')) return .45;
    return 1;
  }

  function glow(x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('ALPHA', alpha));
    g.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }

  function orbit(cx, cy, r, angle, rx, ry, alpha, dash = []) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(rx, ry);
    ctx.setLineDash(dash);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(139,132,255,${alpha})`;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  function particle(cx, cy, r, angle, size, color, speed) {
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * .74;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    return angle + speed;
  }


  function render(now, tapMomentum = 1) {
    const dt = Math.min(50, now-last)/1000;
    last = now;
    const scale = settingsScale();
    updateCoreScale();
    time += dt * scale;
    const momentum = window.CORE_VISUAL_MOMENTUM || 1;
    angles[0] = (angles[0] + 42 * momentum * scale * dt) % 360;
    angles[1] = (angles[1] - 35 * momentum * scale * dt) % 360;
    angles[2] = (angles[2] + 50 * momentum * scale * dt) % 360;
    flash = Math.max(0, flash - dt*3.6);
    shock = Math.max(0, shock - dt*2.3);

    // Жидкое ядро: физическая модель кольцевой поверхности.
    // Это дискретизированное уравнение затухающей волны:
    // a = c²·∇²u − γ·v − k·u. Тап добавляет локальный импульс скорости.
    const level = parseInt(q('#home-core-level')?.textContent || '1', 10) || 1;
    const stage = Math.min(1, Math.max(0, (level - 1) / 24));
    const impact = coreButton?.classList.contains('liquid-hit') ? 1 : 0;
    const floatX = Math.sin(time * .43) * 2.8 + Math.sin(time * .19 + 1.2) * 1.1;
    const floatY = Math.cos(time * .37) * 2.5 + Math.sin(time * .23) * 1.0;
    const fluid = 1 + stage * .55;
    if (coreButton) {
      coreButton.style.setProperty('--float-x', `${floatX.toFixed(2)}px`);
      coreButton.style.setProperty('--float-y', `${floatY.toFixed(2)}px`);
      coreButton.style.setProperty('--fluid-energy', fluid.toFixed(2));
    }

    // Внутренняя жидкость движется постоянно и спокойно.
    // Никакого импульсного возмущения от тапа: меняется только форма и плотность слоёв.
    const layerA = 1 + Math.sin(time*.82) * (.024 + stage*.014);
    const layerB = 1 + Math.sin(time*.68 + 1.4) * (.030 + stage*.016);
    const layerC = 1 + Math.cos(time*.61) * (.022 + stage*.012);
    const plasmaDrift = Math.sin(time * (.72 + stage*.08)) * (3.2 + stage*1.4);
    if (volumeA) volumeA.style.transform = `translate(calc(-50% + ${plasmaDrift + Math.sin(time*.9)*1.4}px),calc(-50% + ${Math.cos(time*.63)*2}px)) rotate(${time*4.8}deg) scale(${layerA},${2-layerA})`;
    if (volumeB) volumeB.style.transform = `translate(calc(-50% + ${-plasmaDrift*.72}px),calc(-50% + ${Math.sin(time*.51)*2.4}px)) rotate(${-time*3.5+18}deg) scale(${layerB},${2-layerB})`;
    if (volumeC) volumeC.style.transform = `translate(calc(-50% + ${Math.cos(time*.58)*2.2}px),calc(-50% + ${plasmaDrift*.5}px)) rotate(${time*2.6-24}deg) scale(${layerC},${2-layerC})`;

    const nucleus = q('.core-nucleus');
    if (nucleus) {
      nucleus.style.transform = `translate(calc(-50% + ${Math.sin(time*.47)*1.1}px),calc(-50% + ${Math.cos(time*.41)*1.0}px)) scale(${1 + Math.sin(time*.9)*.022},${1 - Math.sin(time*.73)*.018})`;
    }

    ctx.clearRect(0,0,width,height);
    // Пространство вокруг ядра: звёздные частицы + широкие живые неоновые траектории.
    sctx.clearRect(0,0,sw,sh);
    const scx=sw*.5, scy=sh*.46;
    const starScale=settingsScale();
    // Мягкий параллакс: дальние звёзды почти стоят, ближние чуть быстрее смещаются,
    // создавая ощущение, что ядро медленно летит через пространство.
    const flightX = time*.0028*starScale;
    const flightY = time*.00135*starScale;
    stars.forEach((st,i)=>{
      st.p += .004*st.s*starScale;
      const tw=st.a*(.62+.38*Math.sin(st.p));
      const depth=.35 + st.z*.65;
      const x=((((st.u + flightX*depth)%1)+1)%1)*sw;
      const y=((((st.v + flightY*depth + Math.sin(st.p*.31)*.0015*depth)%1)+1)%1)*sh;
      sctx.fillStyle=`rgba(145,169,255,${tw})`;
      sctx.shadowColor='rgba(115,130,255,.75)';
      sctx.shadowBlur=st.r*5;
      sctx.beginPath(); sctx.arc(x,y,st.r,0,Math.PI*2); sctx.fill();
    });
    // Ближняя космическая пыль: чуть сильнее участвует в параллаксе, но остаётся почти невесомой.
    spaceDust.forEach((d,i)=>{
      d.p += .0025*d.s*starScale;
      const driftX=(time*.0038*d.z*starScale)%1;
      const driftY=(time*.0019*d.z*starScale)%1;
      const x=((((d.u + driftX + Math.sin(d.p)*.0015*d.z)%1)+1)%1)*sw;
      const y=((((d.v + driftY + Math.cos(d.p*.7)*.001*d.z)%1)+1)%1)*sh;
      const a=d.a*(.55+.45*Math.sin(d.p));
      sctx.fillStyle=`rgba(194,213,255,${a})`;
      sctx.shadowColor='rgba(130,170,255,.6)'; sctx.shadowBlur=5+d.r*3;
      sctx.beginPath(); sctx.arc(x,y,d.r*(.8+d.z*.45),0,Math.PI*2); sctx.fill();
    });
    sctx.shadowBlur=0;

    // Космический фон намеренно оставлен без пролетающих крупных объектов:
    // пространство живёт частицами, глубиной и орбитами, не перетягивая внимание с ядра.
    sctx.shadowBlur=0;
    const maxR=Math.max(sw,sh)*.56;
    [0,1,2,3,4].forEach(i=>{ const rr=maxR*(.42+i*.11); const ang=time*(.035+i*.012)+(i*1.13); sctx.save(); sctx.translate(scx,scy); sctx.rotate(ang); sctx.scale(1,.36+i*.055); sctx.strokeStyle=`rgba(105,111,255,${.10-i*.012})`; sctx.lineWidth=1.15+i*.22; sctx.shadowColor='rgba(91,111,255,.75)'; sctx.shadowBlur=9+i*3; sctx.beginPath(); sctx.arc(0,0,rr,0,Math.PI*2); sctx.stroke(); sctx.strokeStyle=`rgba(89,224,255,${.035+i*.008})`; sctx.lineWidth=.65; sctx.shadowBlur=15; sctx.beginPath(); sctx.arc(0,0,rr*1.006,0,Math.PI*2); sctx.stroke(); sctx.restore(); });
    sctx.shadowBlur=0;
    const cx = width/2, cy = height/2;
    const base = Math.min(width,height) * .245;
    const pulse = (.5 + .5*Math.sin(time*2.8))*.55 + flash*.75;
    const ring1 = base*2.05, ring2=base*1.63, ring3=base*1.25;

    orbit(cx,cy,ring1,time*.20,1,.66,.28);
    orbit(cx,cy,ring2,-time*.31,.72,1,.26);
    orbit(cx,cy,ring3,time*.48,1,.78,.30,[2,5]);
    orbit(cx,cy,ring1*1.13,-time*.08,1,.66,.08);

    if (shock>0) {
      ctx.strokeStyle = `rgba(160,150,255,${shock*.38})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx,cy,ring3*(1+shock*.28),0,Math.PI*2); ctx.stroke();
    }

    const p1 = (time*.65)% (Math.PI*2);
    const p2 = (-time*.43+2.2)% (Math.PI*2);
    particle(cx,cy,ring1,p1,1.6,'rgba(117,218,255,.9)',0);
    particle(cx,cy,ring2,p2,1.4,'rgba(177,164,255,.85)',0);
    particle(cx,cy,ring3,time*1.1,1.1,'rgba(222,218,255,.72)',0);

  }

  function update() {
    const level = q('#home-core-level')?.textContent || '1';
    const balance = parseFloat((q('#balance')?.textContent || q('#home-energy')?.textContent || '0').replace(/[^0-9.]/g,'')) || 0;
    const lvlNum = parseInt(level,10) || 1;
    charge = Math.min(100, Math.round((balance / Math.max(1,75*Math.pow(1.34,Math.max(0,lvlNum-1))))*100));
    const research = q('#research-screen')?.querySelectorAll('.research-card.done').length || 0;
    const quests = q('#quests-screen')?.querySelectorAll('.quest-card.done').length || 0;
    const inv = [...document.querySelectorAll('.inventory-item b')].reduce((a,x)=>a+(parseInt(x.textContent.replace(/[^0-9]/g,''),10)||0),0);
    const resonance = q('#home-resonance')?.textContent || '0';
    q('#zone-upgrade-badge').textContent = level;
    q('#zone-research-badge').textContent = research;
    q('#zone-quests-badge').textContent = quests;
    q('#zone-inventory-badge').textContent = inv;
    q('#zone-resonance-badge').textContent = resonance;
    zone.style.setProperty('--charge', charge+'%');
  }

  window.CORE_VISUAL = { tick: render, update, resize };
  window.CORE_VISUAL_MOMENTUM = 1;
  update();
})();
