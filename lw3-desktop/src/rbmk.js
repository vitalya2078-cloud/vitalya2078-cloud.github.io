/* =====================================================================
   Тренажёр «Пульт РБМК-1000»: интерфейс, режимы, смены, аварии, разбор.
   Физика — rbmk-core.js (RB). Экран — SCREEN === 'rbmk', вход — раздел «Тренажёр РБМК».
   Режимы: карьера (7 смен), свободная смена, «Ночь 25–26 апреля 1986 г.».
   Результаты курсанта — store, ключ workKey(id) + '-rbmk'.
   ===================================================================== */
const rbKey = id => workKey(id) + '-rbmk';
const rbLoad = () => Object.assign({ career: {}, free: 0, history: { played: 0, safe: 0, crash: 0 }, shifts: 0, crashes: 0 }, store.get(rbKey(PROFILE.id), {}));
const rbSave = R => store.set(rbKey(PROFILE.id), R);
const RBN = v => (Math.round(v * 3200)).toLocaleString('ru-RU');
const rbClock = (s, sec) => { s = ((s % 86400) + 86400) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + (sec ? ':' + String(Math.floor(s) % 60).padStart(2, '0') : ''); };
const rbTimes = n => { n = Math.round(n); const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'раза' : 'раз'); };
const RB_GRADE = sc => sc >= 95 ? 'S' : sc >= 85 ? 'A' : sc >= 70 ? 'B' : sc >= 50 ? 'C' : 'D';

/* ---------- смены карьеры ---------- */
const RB_SHIFTS = [
  { t: 'Стажёр: стержни ручного регулирования', dur: 150, start: { P: 1 }, lock: ['ar'], target: 1, tol: 0.035,
    brief: 'Автоматический регулятор отключён. Держите тепловую мощность 3200 МВт стержнями РР: W или ↑ — выводить (мощность растёт), S или ↓ — погружать. Двигайте стержни понемногу и следите за периодом: реактор отвечает не сразу.',
    goal: 'Держать 3200 ± 110 МВт' },
  { t: 'Автоматический регулятор и диспетчер', dur: 180, start: { P: 1 }, target: 1, tol: 0.035,
    brief: 'Включите АР — он держит заданную мощность группой из 12 стержней. Диспетчер энергосистемы будет менять задание: меняйте уставку АР. Если стержни АР дойдут до края, регулятор отключится — тогда подправьте положение стержней РР.',
    goal: 'Выполнять задания диспетчера ± 110 МВт', events: [[25, 'disp', 0.75], [100, 'disp', 0.9], [150, 'disp', 1]] },
  { t: 'Главные циркуляционные насосы', dur: 180, start: { P: 1 }, target: 1, tol: 0.04,
    brief: 'Работают 6 ГЦН, 2 — в резерве (ГЦН-4 и ГЦН-8). У одного из насосов растёт вибрация подшипников. Включите резервный насос той же половины и отключите неисправный, пока он не остановился аварийно. Расход через реактор не должен падать.',
    goal: 'Заменить неисправный ГЦН, мощность 3200 ± 130 МВт', events: [[30, 'vib', 1], [110, 'vib', 5]] },
  { t: 'Питательная вода и давление', dur: 200, start: { P: 1 }, target: 1, tol: 0.04,
    brief: 'Барабаны-сепараторы: давление пара около 7,0 МПа, уровень воды около 0 мм. Отключится питательный насос (ПЭН) — включите резервный, иначе упадёт уровень. Потом откажет регулятор турбин — давление придётся держать клапаном сброса пара БРУ-К (клавиша Q) и нагрузкой турбин.',
    goal: 'Уровень −300…+300 мм, давление 6,6…7,4 МПа', events: [[35, 'pen', 0], [110, 'tgreg', 1]] },
  { t: 'Ксенон: снижение мощности', dur: 240, start: { P: 1 }, target: 1, tol: 0.05, speed: true,
    brief: 'Диспетчер снизит мощность до 50 %. После снижения в зоне накапливается ксенон-135: он поглощает нейтроны, и для поддержания мощности придётся выводить стержни. Следите за оперативным запасом реактивности (ОЗР) — он не должен быть меньше 15 стержней. Можно ускорить время (кнопка ×5).',
    goal: 'Выполнять задания, ОЗР не меньше 15', events: [[20, 'disp', 0.5], [170, 'disp', 0.8]] },
  { t: 'Плановый останов и йодная яма', dur: 260, start: { P: 0.6 }, target: 0.6, tol: 0.06, speed: true,
    brief: 'Нужно остановить реактор. Снизьте мощность до 600–1000 МВт, убедитесь, что ОЗР не меньше 15, и нажмите АЗ-5 (откройте крышку кнопки). После останова ксенон продолжит накапливаться: понаблюдайте «йодную яму» с ускорением времени и найдите, через сколько часов отравление максимально.',
    goal: 'Безопасный останов, найти максимум ксенона', events: [[15, 'disp', 0.25]], shutdown: true },
  { t: 'Ночь 25–26 апреля 1986 года', history: true }
];

/* ---------- состояние игры ---------- */
let RBG = null;
const RB_SYS = { ar: 'АР', pumps: 'ГЦН', feed: 'ПЭН' };
function rbNew(mode, k) {
  const sh = mode === 'career' ? RB_SHIFTS[k] : null;
  if (mode === 'history' || (sh && sh.history)) return rbNewHistory(mode === 'career' ? k : null);
  const o = sh ? sh.start : { P: 1 };
  const S = RB.fresh({ P: o.P, clock: 8 * 3600 });
  if (sh && sh.lock && sh.lock.includes('ar')) S.ar.on = false;
  return { mode, k, sh, S, t: 0, speed: 1, paused: false, target: sh ? sh.target : 1, tol: sh ? sh.tol : 0.04, ev: (sh && sh.events || []).map(e => e.slice()), score: { dev: 0, devN: 0, ozr: 0, alarm: 0, az: 0, events: [] },
    faults: [], nextFault: 45 + Math.random() * 40, nextDisp: 60 + Math.random() * 60, alarms: {}, cover: false, done: null, ack: {}, sensor: null, xePeak: { x: 0, t: 0 }, log: [] };
}
/* «Ночь 25–26 апреля»: начинаем в 23:10, мощность 1600 МВт, ОЗР около 16, ксенон повышен. Дальше — решения курсанта. */
function rbNewHistory(k) {
  const S = RB.fresh({ P: 0.5, RR: 0.29, USP: 0.2, xe: [0.85, 1.12], clock: 23 * 3600 + 10 * 60 });
  S.ar.on = true; S.ar.set = 0.5; S.eccs = false; S.acc = 20;   // время ксенона и часов: 1 с = 20 с   // САОР отключена ещё днём 25 апреля по программе испытаний
  return { mode: k == null ? 'history' : 'career', k, sh: k == null ? null : RB_SHIFTS[k], S, t: 0, speed: 1, paused: false, target: 0.5, tol: 0.1, ev: [], hist: { step: 'reduce', choices: [], dropDone: false, testT: null },
    score: { dev: 0, devN: 0, ozr: 0, alarm: 0, az: 0, events: [] }, faults: [], alarms: {}, cover: false, done: null, ack: {}, sensor: null, xePeak: { x: 0, t: 0 }, log: [] };
}
const rbHist = () => RBG && RBG.hist;
function rbLog(kind, text) { const G = RBG; if (!G) return; G.log.unshift({ c: rbClock(G.S.clock), kind, text }); if (G.log.length > 60) G.log.pop(); rbDirty.log = true; if (kind === 'bad') rbSnd.alarm(); else if (kind === 'warn') rbSnd.beep(660, 0.12); }
const rbDirty = { log: true, all: true };

/* ---------- звук (WebAudio, без файлов) ---------- */
const rbSnd = (() => {
  let ac = null, on = true, siren = null;
  try { on = localStorage.getItem('fz-rb-snd') !== '0'; } catch (e) {}
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; };
  const tone = (f, d, type = 'square', vol = 0.05) => { if (!on) return; const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d); };
  return {
    get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('fz-rb-snd', on ? '1' : '0'); } catch (e) {} if (!on) this.sirenOff(); },
    beep: (f, d) => tone(f, d), click: () => tone(1800 + Math.random() * 600, 0.012, 'square', 0.025),
    alarm() { tone(880, 0.18); setTimeout(() => tone(660, 0.18), 200); },
    sirenOn() { if (!on || siren) return; const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 620; l.frequency.value = 0.8; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency); g.gain.value = 0.035; o.connect(g); g.connect(a.destination); o.start(); l.start(); siren = { o, l, g }; },
    boom(v = 1) { if (!on) return; const a = ctx(); if (!a) return; const n = Math.round(a.sampleRate * 2.2), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'lowpass'; f.frequency.value = 240; g.gain.value = 0.6 * v; s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); },
    drone(onn) { if (onn) { if (!on || this._dr) return; const a = ctx(); if (!a) return; const g = a.createGain(), o = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 82.4; f.type = 'lowpass'; f.frequency.value = 160; g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(0.05, a.currentTime + 3); o.connect(f); o2.connect(f); f.connect(g); g.connect(a.destination); o.start(); o2.start(); this._dr = { o, o2, g, a }; }
      else if (this._dr) { const d = this._dr; this._dr = null; try { d.g.gain.linearRampToValueAtTime(0, d.a.currentTime + 1); setTimeout(() => { try { d.o.stop(); d.o2.stop(); } catch (e) {} }, 1100); } catch (e) {} } },
    sirenOff() { if (siren) { try { siren.o.stop(); siren.l.stop(); } catch (e) {} siren = null; } }
  };
})();

/* ---------- раздел программы: выбор режима ---------- */
function pgRbmk() {
  const R = rbLoad(), done = k => R.career[k], open = k => k === 0 || !!R.career[k - 1];
  const card = (k, s) => `<button class="rb-shc ${done(k) ? 'done' : ''} ${open(k) ? '' : 'rb-locked'}" data-rb="start" data-m="career" data-k="${k}" ${open(k) ? '' : 'disabled'}>
      <span class="rb-shn">${k + 1}</span><span class="rb-sht"><b>${esc(s.t)}</b><small>${s.history ? 'Реконструкция событий по шагам' : esc(s.goal)}</small></span>
      <span class="rb-shg">${done(k) ? `<i class="g-${done(k).g}" title="${done(k).hints ? 'с подсказками' : ''}">${done(k).g}</i>${done(k).hints ? '<small class="rb-hmk">подсказки</small>' : ''}` : open(k) ? ic('chevron-right') : ic('lock')}</span></button>`;
  return pgHead('Тренажёр «Пульт РБМК-1000»', 'Вы — старший инженер управления реактором 4-го энергоблока. Физика реактора считается по-настоящему: кинетика нейтронов, ксенон, паровой эффект, концевой эффект стержней.') +
    `<div class="rb-hero"><img src="img/rbmk/cover-main.webp" alt=""><div><b>Пульт РБМК-1000</b><span>Карьера из 7 смен, свободная смена и реконструкция ночи 26 апреля. 2D-пульт, 3D-вид реактора и энергоблока, вкладка «Задача» с рисками.</span></div></div>
    <div class="rb-land">
      <section class="fz-tile rb-modes">
        <button class="rb-mode" data-rb="start" data-m="free"><img src="img/rbmk/cover-free.webp" alt="">${ic('atom')}<b>Свободная смена</b><span>Без конца: диспетчер меняет задания, случаются неисправности. Сложность растёт.</span><em>${R.free ? 'Рекорд: ' + Math.floor(R.free / 60) + ' мин ' + (R.free % 60) + ' с' : 'Ещё не играли'}</em></button>
        <button class="rb-mode hist" data-rb="start" data-m="history"><img src="img/rbmk/cover-night.webp" alt="">${ic('history')}<b>Ночь 25–26 апреля 1986 г.</b><span>Испытание выбега турбогенератора. Можно повторить решения смены — или поступить по регламенту.</span><em>${R.history.played ? `Сыграно: ${R.history.played} · без аварии: ${R.history.safe}` : 'Ещё не играли'}</em></button>
        <button class="rb-mode help" data-rb="help"><img src="img/rbmk/cover-help.webp" alt="">${ic('book-open')}<b>Как устроен РБМК</b><span>Стержни, ОЗР, ксенон, паровой и концевой эффекты, защиты. Коротко и по делу.</span><em>Справка · клавиша H</em></button>
      </section>
      <section class="fz-tile"><h2>${ic('graduation-cap')} Карьера: 7 смен</h2><p class="mute">Каждая смена добавляет новую систему. Следующая открывается после предыдущей.</p><div class="rb-shifts">${RB_SHIFTS.map((s, k) => card(k, s)).join('')}</div></section>
    </div>`;
}

/* ---------- экран пульта ---------- */
function vRbmk() {
  const G = RBG; if (!G) { SCREEN = 'labs'; return render(); }
  document.body.classList.add('noside', 'rbscr'); ui.side.innerHTML = '';
  const S = G.S, title = G.mode === 'free' ? 'Свободная смена' : G.mode === 'history' ? 'Ночь 25–26 апреля 1986 г.' : `Смена ${G.k + 1}. ${G.sh.t}`;
  const pump = i => `<button class="rb-pump" data-rb="pump" data-v="${i}" id="rb-pump${i}"><img src="img/rbmk/pump.webp" alt=""><b>ГЦН-${i + 1}</b><span class="st"></span><span class="rb-mini"><i></i></span><small class="fl"></small></button>`;
  ui.main.innerHTML = `<div class="rb">
    <header class="rb-top">
      <button class="btn line" data-rb="exit">${ic('chevron-left')} Выйти</button>
      <div class="rb-tt"><b>Пульт РБМК-1000 · 4-й энергоблок</b><small>${esc(title)}</small></div>
      <div class="rb-tabs" role="tablist"><button data-rb="view" data-v="2d" class="on" title="Пульт (V)">${ic('sliders-horizontal')} 2D</button><button data-rb="view" data-v="3d" title="3D-вид (V)">${ic('box')} 3D</button><button data-rb="view" data-v="elec" title="Электрическая часть (E)">${ic('zap')} Электрика</button><button data-rb="view" data-v="task" title="Задача, способы, риски (T)">${ic('list-checks')} Задача</button></div>
      <div class="rb-clock"><small>Время</small><b id="rb-clock">--:--</b></div>
      <div class="rb-goal"><small>Задание</small><b id="rb-goal"></b><i id="rb-prog"><s></s></i></div>
      <div class="rb-score"><small>Оценка</small><b id="rb-score">—</b></div>
      <div class="rb-tbtn">
        <button class="btn line" data-rb="speed" id="rb-speed" title="Ускорить время">×1</button>
        <button class="btn line" data-rb="pause" id="rb-pause" title="Пауза (пробел)">${ic('pause')}</button>
        <button class="btn line" data-rb="snd" id="rb-snd" title="Звук">${ic(rbSnd.on ? 'volume-2' : 'volume-x')}</button>
        <button class="btn line rb-hbtn ${G.hints ? 'on' : ''}" data-rb="hints" id="rb-hbtn" title="Живые подсказки (L). С подсказками высшая оценка — A">${ic('lightbulb')} <span>${G.hints ? 'Подсказки: вкл' : 'Подсказки: выкл'}</span></button>
        <button class="btn line" data-rb="help" title="Справка (H)">${ic('circle-help')}</button>
      </div>
    </header>
    <div class="rb-ann" id="rb-ann">${RB_ANN.map(([k, t]) => `<span data-a="${k}">${t}</span>`).join('')}</div>
    <div class="rb-grid">
      <section class="rb-col">
        <div class="rb-p"><h3><img class="rb-h3i" src="img/rbmk/core.webp" alt="">Картограмма активной зоны</h3><canvas id="rb-core" width="360" height="300"></canvas>
          <div class="rb-leg"><span><i class="lg-rr"></i>РР</span><span><i class="lg-ar"></i>АР</span><span><i class="lg-usp"></i>УСП</span><span class="mute">цвет — мощность каналов</span></div></div>
        <div class="rb-p rb-ax"><h3>Поле по высоте</h3><div class="rb-axw"><canvas id="rb-axial" width="70" height="140"></canvas><div class="rb-axt"><p><b id="rb-axv">—</b><br><small>смещение потока к низу зоны</small></p><p class="mute small">Когда мощность мала, ксенона много, а стержни выведены, поток прижимается к низу — и концевой эффект стержней становится опасным.</p></div></div></div>
        <div class="rb-p"><h3>Отравление</h3>
          <div class="rb-bar"><span>Ксенон-135</span><i><s id="rb-xe"></s></i><b id="rb-xev">—</b></div>
          <div class="rb-bar io"><span>Иод-135</span><i><s id="rb-io"></s></i><b id="rb-iov">—</b></div>
          <p class="mute small" id="rb-xet"></p></div>
      </section>
      <section class="rb-col">
        <div class="rb-big">
          <div><small>Тепловая мощность</small><b id="rb-pt">—</b><em>МВт</em></div>
          <div><small>Электрическая</small><b id="rb-pe">—</b><em>МВт</em></div>
          <div><small>Период разгона</small><b id="rb-per">—</b><em>с</em></div>
          <div><small>Реактивность</small><b id="rb-rho">—</b><em>β</em></div>
        </div>
        <div class="rb-p rb-chart"><h3>Самописец мощности <span class="mute small" id="rb-chl">3 мин</span><button class="fz-lnk" data-rb="chart" id="rb-chm">составляющие реактивности</button></h3><canvas id="rb-chart" width="560" height="190"></canvas></div>
        <div class="rb-p rb-rods"><h3>${ic('sliders-horizontal')} Органы регулирования</h3>
          <div class="rb-ozr"><div><small>ОЗР — оперативный запас реактивности</small><b id="rb-ozr">—</b><em>стержней</em></div><i id="rb-ozrb"><s></s><u style="left:${15 / 60 * 100}%"></u></i><span class="mute small">минимум по регламенту — 15</span></div>
          <div class="rb-rod"><span><b>РР</b><small>130 стержней, ручные</small></span><div class="rb-rodv"><i><s id="rb-rr"></s></i><b id="rb-rrv">—</b></div>
            <div class="rb-btns"><button class="btn line" data-rb="rod" data-g="RR" data-v="-1" title="Вывести (W, ↑)">▲</button><button class="btn line" data-rb="rod" data-g="RR" data-v="1" title="Погрузить (S, ↓)">▼</button></div></div>
          <div class="rb-rod"><span><b>УСП</b><small>24 укороченных, снизу</small></span><div class="rb-rodv"><i><s id="rb-usp"></s></i><b id="rb-uspv">—</b></div>
            <div class="rb-btns"><button class="btn line" data-rb="rod" data-g="USP" data-v="-1" title="Вывести (A)">▲</button><button class="btn line" data-rb="rod" data-g="USP" data-v="1" title="Погрузить (D)">▼</button></div></div>
          <div class="rb-rod rb-arr"><span><b>АР</b><small>12 стержней, автомат</small></span><div class="rb-rodv"><i><s id="rb-ar"></s></i><b id="rb-arv">—</b></div>
            <div class="rb-btns"><button class="btn line" data-rb="ar" id="rb-arbtn">—</button><span class="rb-arauto"><button class="btn line" data-rb="arset" data-v="-0.025" title="Уставка −80 МВт">−</button><b class="rb-arset" id="rb-arset">—</b><button class="btn line" data-rb="arset" data-v="0.025" title="Уставка +80 МВт">+</button></span>
              <span class="rb-arman"><button class="btn line" data-rb="rod" data-g="AR" data-v="-1" title="Вывести вручную">▲</button><button class="btn line" data-rb="rod" data-g="AR" data-v="1" title="Погрузить вручную">▼</button></span></div></div>
          <div class="rb-az"><div class="rb-azc ${G.cover ? 'open' : ''}" id="rb-azc">${rbAzHtml()}</div>
            <p class="small"><b>Аварийная защита</b><br><span class="mute">все стержни вниз со скоростью 0,4 м/с: полное погружение за 18 с</span></p></div>
        </div>
      </section>
      <section class="rb-col">
        <div class="rb-p"><h3>Главные циркуляционные насосы <span class="mute small" id="rb-flow"></span></h3><div class="rb-pumps"><div><small>Левая половина</small>${[0, 1, 2, 3].map(pump).join('')}</div><div><small>Правая половина</small>${[4, 5, 6, 7].map(pump).join('')}</div></div></div>
        <div class="rb-p rb-bs"><h3><img class="rb-h3i" src="img/rbmk/drum.webp" alt="">Барабаны-сепараторы</h3>
          <div class="rb-gauges"><div class="rb-gauge"><canvas id="rb-press" width="150" height="96"></canvas><b id="rb-pv">—</b><small>давление, МПа</small></div>
            <div class="rb-lvl"><i><s id="rb-lvl"></s><u></u></i><b id="rb-lv">—</b><small>уровень, мм</small></div></div>
          <div class="rb-rowb"><button class="btn line" data-rb="bru" id="rb-bru">БРУ-К: закрыт</button><button class="btn line" data-rb="fwauto" id="rb-fwa">Питание: авто</button></div>
          <div class="rb-rowb">${[0, 1, 2].map(i => `<button class="btn line rb-pen" data-rb="pen" data-v="${i}" id="rb-pen${i}">ПЭН-${i + 1}</button>`).join('')}</div>
          <div class="rb-rowb">${[0, 1].map(i => `<button class="btn line rb-tg" data-rb="tg" data-v="${i}" id="rb-tg${i}">ТГ-${i + 7}</button>`).join('')}<button class="btn line" data-rb="tgauto" id="rb-tga">Регулятор ТГ</button><button class="btn line" data-rb="eccs" id="rb-eccs">САОР</button><button class="btn line" data-rb="view" data-v="elec" title="Электрическая часть (E)">${ic('zap')} Электрика</button></div>
        </div>
        <div class="rb-p rb-prot ${G.hist ? '' : 'hid'}" id="rb-prot"><h3>Защиты (по программе испытаний)</h3><div class="rb-rowb">
          ${[['tg', 'Останов 2 ТГ'], ['level', 'Уровень БС'], ['press', 'Давление БС'], ['period', 'По периоду']].map(([k, t]) => `<button class="btn line" data-rb="prot" data-v="${k}" id="rb-prot-${k}">${t}</button>`).join('')}</div></div>
        <div class="rb-p rb-task ${G.hist ? '' : 'hid'}" id="rb-task"></div>
        <div class="rb-p rb-logp"><h3>Журнал смены</h3><div class="rb-log" id="rb-log"></div></div>
      </section>
    </div>
    <div class="rb-3dw" id="rb-3dw" hidden><div class="rb-3dc" id="rb-3dc"></div>
      <div class="rb-3dhud">
        <div class="rb-3dnum"><div><small>Мощность</small><b id="rb-pt3">—</b><em>МВт</em></div><div><small>Период</small><b id="rb-per3">—</b><em>с</em></div><div><small>ОЗР</small><b id="rb-ozr3">—</b><em>стержней</em></div>
          <div><small>Давление</small><b id="rb-p3">—</b><em>МПа</em></div><div><small>Уровень</small><b id="rb-l3">—</b><em>мм</em></div><div><small>Расход</small><b id="rb-g3">—</b><em>тыс. м³/ч</em></div></div>
        <div class="r3-main"><div class="r3-hrods" id="r3-hudrods"></div><div class="rb-az rb-az3"><div class="rb-azc ${G.cover ? 'open' : ''}">${rbAzHtml()}</div></div></div>
        <div class="rb-3dsc"><button class="btn line" data-rb="scene" data-v="unit">${ic('factory')} Энергоблок</button><button class="btn line" data-rb="scene" data-v="core">${ic('atom')} Реактор в разрезе</button><button class="btn line" data-rb="scene" data-v="desk">${ic('sliders-horizontal')} Щит управления</button></div>
        <div class="r3-views" id="r3-views"></div>
        <div class="rb-3dinfo" id="rb-3dinfo"></div>
        <div class="r3-opts"><button class="btn line ${r3LblOn() ? 'on' : ''}" data-rb="r3lbl" id="r3-lblb">${ic('tag')} Подписи</button><button class="btn line" data-rb="r3q" id="r3-qb">${ic('gauge')} ${R3Q() === 'low' ? 'Качество: простое' : 'Качество: высокое'}</button></div>
        <p class="mute small">Мышь — вращать, колесо — приблизить. Стержни: W/S, A/D. Подсказки: L.</p></div></div>
    <div class="rb-taskw" id="rb-taskw" hidden></div>
    <div class="rb-elecw" id="rb-elecw" hidden></div>
    <div class="rb-hint" id="rb-hint" hidden></div>
    <div class="rb-crashbar" id="rb-crashbar" hidden></div>
    <div class="rb-ov" id="rb-ov" hidden></div>
  </div>`;
  G.view = G.view || '2d'; rbView();
  rbDirty.log = true; rbUpdate(true);
  if (!G.started) rbBrief();
  rbLoop();
}
function rbView() {
  const G = RBG; if (!G || !$('.rb')) return; const v = G.view || '2d';
  $('.rb-grid').hidden = v !== '2d'; $('#rb-3dw').hidden = v !== '3d'; $('#rb-taskw').hidden = v !== 'task'; $('#rb-elecw').hidden = v !== 'elec'; if (v === 'elec') { $('#rb-elecw').innerHTML = rbElecHtml(); rbElecTick(); }
  document.querySelectorAll('.rb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === '3d') r3Show(); else r3Hide();
  if (v === 'task') { if (G.started && !G.done && !G.paused) { G.paused = true; G.taskPaused = true; } $('#rb-taskw').innerHTML = rbTaskHtml() + (G.taskPaused ? `<p class="rb-tpause">${ic('pause')} Смена на паузе, пока открыта вкладка «Задача».</p>` : ''); }
  else if (G.taskPaused) { G.taskPaused = false; G.paused = false; }
}
// кнопка АЗ-5 картинками: закрытая крышка — щелчок открывает; открытая — верх (крышка) закрывает, кнопка — АЗ-5
const rbAzHtml = () => `<button class="rb-cover" data-rb="cover" title="Открыть крышку АЗ-5"><img src="img/rbmk/az-closed.webp" alt="Крышка АЗ-5"></button>
  <span class="rb-azopen"><img src="img/rbmk/az-open.webp" alt=""><button class="rb-azlid" data-rb="cover" title="Закрыть крышку"></button><button class="rb-azb" data-rb="az" title="АЗ-5">АЗ-5</button></span>`;
const RB_ANN = [['az', 'АЗ-5'], ['ozr', 'ОЗР < 15'], ['per', 'Период < 20 с'], ['pw', 'Мощность > 105 %'], ['press', 'Давление БС'], ['lvl', 'Уровень БС'], ['pump', 'ГЦН'], ['arof', 'АР отключён'], ['xe', 'Ксенон'], ['fault', 'Неисправность']];

/* ---------- игровой цикл ---------- */
let rbRaf = 0, rbLast = 0, rbKeys = {};
function rbLoop() {
  cancelAnimationFrame(rbRaf); rbLast = performance.now();
  const f = now => {
    if (SCREEN !== 'rbmk' || !RBG) return;
    const dt = Math.min(0.1, (now - rbLast) / 1000); rbLast = now;
    if (!RBG.paused && RBG.started && !RBG.done) rbTick(dt * RBG.speed);
    if (RBG.crash) rbCrashLoop(dt);
    rbUpdate(); rbHintLoop(now); if (RBG.view === 'elec' && now - (RBG._elAt || 0) > 120) { RBG._elAt = now; rbElecTick(); } if (RBG.view === '3d' && !rbEpiS) r3Frame(); /* под эпилогом 3D не рисуем */ rbRaf = requestAnimationFrame(f);
  };
  rbRaf = requestAnimationFrame(f);
}
// продвинуть игру на dt секунд (мелкими шагами); экспортируется для тестов
function rbTick(dt) {
  const G = RBG; let left = dt;
  while (left > 1e-9 && !G.done) { const h = Math.min(1 / 30, left); left -= h; rbStep(h); }
}
function rbStep(h) {
  const G = RBG, S = G.S;
  // клавиши: стержни двигаются, пока клавиша нажата (Shift — быстрее)
  const fast = rbKeys.Shift ? 4 : 1;
  S.rodCmd.RR = ((rbKeys.s ? 1 : 0) - (rbKeys.w ? 1 : 0)) * 0.0015 * fast;
  S.rodCmd.USP = ((rbKeys.d ? 1 : 0) - (rbKeys.a ? 1 : 0)) * 0.003 * fast;
  if (G.stuck > 0) S.rodCmd.RR = 0;
  S.rodCmd.AR = 0;
  if (G.btnRod && !(G.stuck > 0 && G.btnRod.g === 'RR') && !(G.btnRod.g === 'AR' && S.ar.on)) { S.rodCmd[G.btnRod.g] = G.btnRod.v * (G.btnRod.g === 'RR' ? 0.0015 : 0.003) * fast; }
  const before = { az: S.az, ar: S.ar.on, ev: S.ev.length };
  RB.step(S, h); G.t += h; rbElecStep(h);
  for (let i = before.ev; i < S.ev.length; i++) rbLog(S.ev[i].kind, S.ev[i].text);
  if (!before.az && S.az) { G.score.az++; G.score.events.push({ t: G.t, text: 'АЗ-5' }); }
  // насосы: вибрация растёт у неисправного; при 100 — аварийный останов
  S.pumps.forEach((q, i) => {
    if (q.fault && q.on) q.vib = Math.min(100, q.vib + q.fault * h);
    else q.vib += ((q.on ? 14 : 3) - q.vib) * 0.05 * h;
    if (q.on && q.vib >= 100) { q.on = false; q.coast = true; q.fault = 0; rbLog('bad', `ГЦН-${i + 1} остановлен защитой по вибрации подшипников`); G.score.events.push({ t: G.t, text: `аварийный останов ГЦН-${i + 1}` }); G.score.alarm += 3; }
  });
  // ксенон: следим за максимумом после останова
  if (S.P < 0.02 && S.X > G.xePeak.x) G.xePeak = { x: S.X, t: G.t, clock: S.clock };
  // режимы
  if (G.hist) rbHistStep(h); else rbShiftStep(h);
  // оценка
  if (!S.az && G.started) {
    const tg = G.target, dev = Math.abs(S.P - tg) / Math.max(0.05, tg);
    G.score.dev += Math.min(1, dev / G.tol) * h; G.score.devN += h;
    if (RB.ozr(S) < 15 && S.P > 0.02) G.score.ozr += h;
  }
  rbAlarms(h);
  if (S.broken && !G.crash) rbCrashStart();
}
function rbAlarms(h) {
  const G = RBG, S = G.S, A = {};
  A.az = S.az; A.ozr = !S.az && RB.ozr(S) < 15; A.per = S.period > 0 && S.period < 20 && S.P > 0.003; A.pw = S.P > 1.05;
  A.press = S.p > 7.45 || S.p < 6.4; A.lvl = Math.abs(S.lvl) > 300; A.pump = S.pumps.some(q => q.on && (q.vib > 60 || q.cav > 0.2)) || S.G < 0.95 && S.P > 0.3;
  A.arof = !S.ar.on && !S.az && !(G.sh && G.sh.lock && G.sh.lock.includes('ar')); A.xe = S.X > 1.35; A.fault = G.faults.some(f => !f.fixed);
  const red = ['az', 'ozr', 'per', 'pw', 'press', 'lvl'].some(k => A[k] && k !== 'az');
  if (red && !G._sir) { G._sir = true; rbSnd.sirenOn(); } else if (!red && G._sir) { G._sir = false; rbSnd.sirenOff(); }
  Object.keys(A).forEach(k => { if (A[k] && !G.alarms[k] && k !== 'az' && k !== 'arof') rbLog('warn', 'Сигнал: ' + RB_ANN.find(a => a[0] === k)[1]); });
  if (A.ozr || A.per || A.pw || A.press || A.lvl) G.score.alarm += h * 0.5;
  G.alarms = A;
}

/* ---------- смены и свободный режим ---------- */
function rbShiftStep(h) {
  const G = RBG, S = G.S, sh = G.sh;
  // запланированные события смены
  G.ev.forEach(e => { if (!e.done && G.t >= e[0]) { e.done = true; rbEvent(e[1], e[2]); } });
  if (G.mode === 'free') {
    G.nextDisp -= h; G.nextFault -= h;
    if (G.nextDisp <= 0 && !S.az) { G.nextDisp = 70 + Math.random() * 70; const opts = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1].filter(v => Math.abs(v - G.target) > 0.04); rbEvent('disp', opts[Math.floor(Math.random() * opts.length)]); }
    if (G.nextFault <= 0 && !S.az) { const lvl = Math.min(3, 1 + G.t / 300); G.nextFault = (90 + Math.random() * 60) / lvl; const f = ['vib', 'pen', 'tgreg', 'rod', 'sensor'][Math.floor(Math.random() * 5)]; rbEvent(f, Math.floor(Math.random() * 8)); }
    if (S.az && S.P < 0.05 && !G.done) rbEnd('az');
  } else if (sh) {
    if (sh.shutdown) {
      if (S.az && !G.shutAt) { G.shutAt = G.t; G.shutOzr = S.azFrom ? S.azFrom.ozr : 0; G.shutP = S.azFrom ? S.azFrom.P : 0; G.target = 0; rbLog('ok', 'Реактор заглушен. Следите за ксеноном: включите ускорение времени.'); }
      if (G.shutAt && G.t - G.shutAt > 30 && S.X < G.xePeak.x - 0.02) return rbEnd('done');
      if (G.t > sh.dur * 3) rbEnd('done');
    } else {
      if (S.az && S.P < 0.05) return rbEnd('az');
      if (G.t >= sh.dur) rbEnd('done');
    }
  }
}
function rbEvent(kind, v) {
  const G = RBG, S = G.S;
  if (kind === 'disp') { G.target = v; if (!S.ar.on) rbLog('warn', `Диспетчер: нагрузка ${RBN(v)} МВт (тепл.). Выведите реактор на новую мощность.`); else rbLog('warn', `Диспетчер: нагрузка ${RBN(v)} МВт (тепл.). Измените уставку АР.`); rbSnd.beep(990, 0.2); }
  if (kind === 'vib') { const i = [0, 1, 2, 4, 5, 6].filter(j => S.pumps[j].on)[v % 5] ?? 1; S.pumps[i].fault = 2.2 + Math.random(); G.faults.push({ kind, i, fixed: false }); rbLog('warn', `ГЦН-${i + 1}: растёт вибрация подшипников. Включите резервный насос и отключите ГЦН-${i + 1}.`); }
  if (kind === 'pen') { const i = S.fwPumps.findIndex(x => x); if (i >= 0) { S.fwPumps[i] = false; G.faults.push({ kind, i, fixed: false }); rbLog('bad', `Отключился ПЭН-${i + 1}: питательной воды не хватает. Включите резервный ПЭН.`); } }
  if (kind === 'tgreg') { S.tgAuto = false; G.faults.push({ kind, fixed: false, at: G.t }); rbLog('bad', 'Отказ регулятора турбин: давление в барабанах придётся держать вручную (БРУ-К — клавиша Q, нагрузка ТГ).'); }
  if (kind === 'rod') { G.stuck = 20; G.faults.push({ kind, fixed: false }); rbLog('warn', 'Заело привод группы РР на 20 секунд. Мощность держите автоматом АР или стержнями УСП.'); }
  if (kind === 'sensor') { const i = [0, 1, 2, 4, 5, 6].filter(j => S.pumps[j].on)[v % 5] ?? 0; G.sensor = { i, k: Math.random() < 0.5 ? 0.35 : 1.7 }; G.faults.push({ kind, i, fixed: false }); rbLog('warn', `Расходомер одного из ГЦН показывает неверно. Сравните сумму расходов с общим расходом и откалибруйте датчик (нажмите на насос с правой кнопкой мыши).`); }
}

/* ---------- «Ночь 25–26 апреля»: шаги ---------- */
const RB_HSTEPS = {
  reduce: { t: '23:10. Диспетчер «Киевэнерго» разрешил продолжить снижение мощности для испытаний. По программе испытание выбега турбогенератора ТГ-8 надо проводить на мощности 700–1000 МВт.', task: 'Снизьте мощность до 700–1000 МВт уставкой АР или стержнями.' },
  drop: { t: '00:28. При переходе с локального автоматического регулятора на общий мощность провалилась почти до нуля — около 30 МВт. В зоне быстро накапливается ксенон.', task: 'Решение за вами.' },
  raise: { t: 'Решено поднимать мощность. Ксенона становится больше, и чтобы удержать реактор, приходится выводить всё больше стержней. ОЗР падает.', task: 'Поднимите мощность до 200 МВт стержнями РР (W). Следите за ОЗР.' },
  pumps: { t: '01:03–01:07. По программе к шести работающим ГЦН подключили ещё два — все восемь. Расход через реактор вырос, вода на входе почти кипит.', task: 'Включите резервные ГЦН-4 и ГЦН-8.' },
  prot: { t: 'Чтобы иметь возможность повторить испытание, защиту по останову двух турбогенераторов заблокировали. Защиты по уровню и давлению в барабанах также выведены.', task: 'Заблокируйте защиты (панель «Защиты») и начните испытание.' },
  test: { t: 'Испытание начато: стопорные клапаны ТГ-8 закрыты. Четыре ГЦН питаются от выбегающего генератора: их обороты падают, расход уменьшается, пара в каналах становится больше.', task: 'Идёт испытание выбега. Наблюдайте за мощностью.' },
  az: { t: 'Прошло 36 секунд, испытание закончено. Начальник смены командует заглушить реактор (в 1986 г. — 01:23:40).', task: 'Нажмите АЗ-5 — или найдите другой путь.' },
};
function rbHistStep(h) {
  const G = RBG, S = G.S, H = G.hist;
  if (H.step === 'reduce' && S.P <= 0.32 && S.P >= 0.2) { G.target = S.P; H.at700 = (H.at700 || 0) + h; if (H.at700 > 8) rbHistGo('drop'); }
  if (H.step === 'drop' && !H.dropDone) { H.dropDone = true; S.ar.on = false; S.rods.RR = Math.min(1, S.rods.RR + 0.10); G.target = 0.01; G.paused = true; rbChoice(); }
  if (H.step === 'raise') { G.target = 0.0625; if (S.P >= 0.045 && S.P <= 0.09) { H.atP = (H.atP || 0) + h; if (H.atP > 6) rbHistGo('pumps'); } else H.atP = 0; }
  if (H.step === 'pumps' && S.pumps.every(q => q.on)) rbHistGo('prot');
  if (H.step === 'test') { H.testT += h; if (H.testT >= 36) rbHistGo('az'); }
  if (H.step === 'az') { H.azWait = (H.azWait || 0) + h; if (S.az && S.P < 0.01 && !S.broken) rbEnd('safe'); if (!S.az && S.P < 0.004) rbEnd('safe'); if (H.azWait > 90 && !S.broken) rbEnd('safe'); }
  if (['raise', 'pumps', 'prot'].includes(H.step) && S.az && S.P < 0.01 && !S.broken) { H.choices.push('Реактор заглушен до начала испытания'); rbEnd('safe'); }
}
function rbHistGo(step) {
  const G = RBG, H = G.hist; H.step = step; const st = RB_HSTEPS[step];
  if (step === 'drop') G.S.clock = 28 * 60;   // 00:28 — провал мощности; дальше часы идут сами (1 с = 20 с)
  if (st) rbLog('warn', st.t);
  if (step === 'test') { H.testT = 0; const S = G.S; S.acc = 1; S.tg[1].on = false; [4, 5, 6, 7].forEach(i => { S.pumps[i].on = false; S.pumps[i].coast = true; }); H.choices.push('Испытание начато при ОЗР ' + RB.ozr(S).toFixed(1) + ' и мощности ' + RBN(S.P) + ' МВт'); }
  rbDirty.task = true;
}
const rbHistEarly = () => { const c = RBG.S.clock; return c > 12 * 3600 || c < 83 * 60; };
function rbChoice() {
  const G = RBG, S = G.S;
  rbOverlay(`<div class="rb-dlg"><span class="rb-tag bad">${ic('triangle-alert')} 00:28 · провал мощности</span><h2>Что делать?</h2>
    <p>${RB_HSTEPS.drop.t}</p><p>Сейчас ОЗР — <b>${RB.ozr(S).toFixed(1)}</b> стержня. Регламент требует не менее 15, а при меньшем запасе реактор следует заглушить. Ксенон будет только нарастать.</p>
    <div class="rb-opts"><button class="btn" data-rb="hchoice" data-v="stop">${ic('shield-check')} Заглушить реактор и отложить испытание</button>
    <button class="btn line" data-rb="hchoice" data-v="raise">${ic('trending-up')} Поднимать мощность и продолжить испытание (как в 1986 г.)</button></div></div>`);
}

/* ---------- окна поверх пульта ---------- */
function rbOverlay(html) { const o = $('#rb-ov'); if (!o) return; o.innerHTML = html; o.hidden = false; }
function rbOverlayClose() { const o = $('#rb-ov'); if (o) { o.hidden = true; o.innerHTML = ''; } }
function rbBrief() {
  const G = RBG; G.paused = true;
  const b = G.hist ? `<p>Вы — старший инженер управления реактором 4-го блока Чернобыльской АЭС. Сегодня после остановки на ремонт проводят испытание: хватит ли энергии выбегающего турбогенератора, чтобы питать насосы до запуска дизель-генераторов.</p><p>${RB_HSTEPS.reduce.t}</p><p class="mute small">Реконструкция учебная: время сжато, физика упрощена, но основные эффекты — ксенон, паровой и концевой эффекты, малый ОЗР — работают так же. Можно повторить решения смены, а можно поступить по регламенту.</p>`
    : G.mode === 'free' ? '<p>Держите мощность по заданию диспетчера, следите за насосами, барабанами-сепараторами и ОЗР. Неисправности будут случаться всё чаще. Смена идёт, пока реактор работает.</p>'
    : `<p>${esc(G.sh.brief)}</p>`;
  rbOverlay(`<div class="rb-dlg"><span class="rb-tag">${G.hist ? 'Историческая реконструкция' : G.mode === 'free' ? 'Свободная смена' : 'Смена ' + (G.k + 1) + ' из 7'}</span><h2>${G.hist ? 'Ночь 25–26 апреля 1986 г.' : G.mode === 'free' ? 'Свободная смена' : esc(G.sh.t)}</h2>${b}
    <div class="rb-keys"><span>${kbd('W')} ${kbd('↑')} вывести РР</span><span>${kbd('S')} ${kbd('↓')} погрузить РР</span><span>${kbd('Shift')} быстрее</span><span>${kbd('A')} ${kbd('D')} УСП</span><span>${kbd('Q')} БРУ-К</span><span>${kbd('Пробел')} пауза</span><span>${kbd('H')} справка</span><span>${kbd('V')} 2D / 3D</span><span>${kbd('T')} задача и риски</span></div>
    <div class="rb-opts"><button class="btn" data-rb="go" data-primary>${ic('play')} Принять смену ${kbd('Enter')}</button></div></div>`);
}
function rbHelpHtml() {
  const sec = [['Оперативный запас реактивности (ОЗР)', 'Сколько стержней «в запасе» погружено в зону, в пересчёте на полностью погружённые. Чем меньше ОЗР, тем больше стержней стоит у верхнего концевика. Регламент 1986 г. — не меньше 15 стержней; после аварии — не меньше 43–48.'],
    ['Период разгона', 'Время, за которое мощность растёт в e ≈ 2,7 раза. Реактором можно управлять только благодаря запаздывающим нейтронам (их доля β ≈ 0,65 %): если реактивность больше β, мощность растёт за доли секунды. Защита срабатывает при периоде меньше 15–20 с.'],
    ['Реактивность в β', 'ρ = (k − 1)/k. Здесь она показана в долях β: 1 β — порог разгона на мгновенных нейтронах. Её складывают стержни, пар, температура топлива (эффект Доплера, гасит разгон), ксенон и концевой эффект.'],
    ['Паровой (пустотный) эффект', 'Вода в РБМК не только охлаждает, но и поглощает нейтроны. Если её превращается в пар больше, поглощение уменьшается — реактивность растёт. У РБМК 1986 г. этот эффект был положительным и большим; на малой мощности он не компенсировался эффектом Доплера.'],
    ['Ксенон-135 и йодная яма', 'Иод-135 (T½ = 6,6 ч) распадается в ксенон-135 (T½ = 9,1 ч) — сильнейший поглотитель нейтронов. На мощности ксенон выгорает; после снижения мощности или останова он накапливается, и реактор «проваливается в йодную яму»: поднять мощность можно, только выводя стержни. В тренажёре время для ксенона ускорено в 60 раз.'],
    ['Концевой эффект стержней', 'Под поглотителем стержня РБМК висел графитовый вытеснитель, а под ним — столб воды. При движении стержня из верхнего положения вытеснитель сначала выдавливает воду из низа зоны: реактивность там растёт. Если стержней у верхнего концевика много (малый ОЗР) и поток прижат к низу, нажатие АЗ-5 в первые секунды разгоняет реактор.'],
    ['Защиты', 'АЗ-5 срабатывает сама: мощность больше 110 %, период меньше 15 с, давление в барабанах больше 8 МПа, уровень меньше −600 мм, отключены оба турбогенератора. Отключать защиты нельзя.']];
  return `<div class="rb-help">${sec.map(([t, p]) => `<div><b>${t}</b><p>${p}</p></div>`).join('')}</div>`;
}
function rbHelp() {
  const G = RBG; if (G) G.paused = true;
  rbOverlay(`<div class="rb-dlg wide"><span class="rb-tag">${ic('book-open')} Справка</span><h2>Как устроен РБМК-1000</h2>${rbHelpHtml()}
    <div class="rb-opts"><button class="btn" data-rb="close" data-primary>Понятно ${kbd('Enter')}</button></div></div>`);
}
/* ---------- конец смены, разбор ---------- */
function rbEnd(kind) {
  const G = RBG; if (G.done) return; G.done = kind; rbSnd.sirenOff();
  const S = G.S, R = rbLoad();
  const sc = Math.max(0, Math.round(100 - (G.score.devN ? G.score.dev / G.score.devN * 40 : 0) - G.score.ozr * 0.4 - G.score.alarm * 1.2 - (kind === 'az' ? 20 : 0)));
  let g = kind === 'crash' ? 'X' : RB_GRADE(sc);
  if (G.usedHints && g === 'S') g = 'A';   // с подсказками высшая оценка недоступна
  if (G.sh && G.sh.shutdown && kind !== 'crash') { const okShut = G.shutOzr >= 15 && G.shutP <= 0.4; if (!okShut) g = g === 'S' || g === 'A' ? 'B' : g; }
  R.shifts++; if (kind === 'crash') R.crashes++;
  if (G.mode === 'free') R.free = Math.max(R.free, Math.round(G.t));
  if (G.hist) { R.history.played++; if (kind === 'crash') R.history.crash++; else R.history.safe++; }
  if (G.mode === 'career' && kind !== 'crash' && (G.hist ? kind === 'safe' : true)) { const prev = R.career[G.k]; if (!prev || 'SABCD'.indexOf(g) < 'SABCD'.indexOf(prev.g)) R.career[G.k] = { g, sc, at: new Date().toISOString(), hints: !!G.usedHints }; }
  rbSave(R);
  const a = RB.analyse(S), hist = G.hist, bk = S.broken ? S.broken.kind : '';
  const reasons = [];
  if (kind === 'crash') {
    if (a.az && a.ozrAz != null && a.ozrAz < 15) reasons.push(`АЗ-5 нажата при ОЗР <b>${a.ozrAz.toFixed(1)}</b> стержня (минимум 15). Почти все стержни стояли у верхнего концевика: графитовые вытеснители в первые секунды вытеснили воду из низа зоны — концевой эффект добавил до <b>+${a.peakTip.toFixed(2)} β</b>.`);
    if (a.dVoid > 0.2) reasons.push(`Пар в каналах добавил <b>+${a.dVoid.toFixed(2)} β</b>: при росте мощности вода вскипала, а у РБМК паровой эффект положительный.`);
    if (a.PAz != null && a.PAz < 0.25) reasons.push(`Мощность перед АЗ-5 была всего <b>${RBN(a.PAz)} МВт</b>. На малой мощности эффект Доплера не успевает погасить паровой эффект — реактор неустойчив.`);
    if (hist && !a.prot.tg) reasons.push('Защита по останову двух турбогенераторов была заблокирована — реактор не заглушился в начале испытания, когда запас ещё позволял.');
    if (hist && a.pumps >= 8) reasons.push('Все 8 ГЦН: вода на входе в каналы была почти на линии насыщения, и при падении расхода на выбеге пар образовывался сразу.');
    if (bk === 'drum') reasons.push('Давление в барабанах-сепараторах превысило прочность: следите за давлением и клапанами сброса пара.');
    if (bk === 'dryout') reasons.push('Уровень воды в барабанах упал так низко, что каналы остались без воды: следите за питательными насосами.');
    if (!reasons.length) reasons.push('Реактивность превысила β: мощность росла на мгновенных нейтронах, и аварийная защита уже не успевала.');
  }
  const ttl = kind === 'crash' ? (bk === 'reactor' ? 'Разгон реактора на мгновенных нейтронах' : bk === 'drum' ? 'Разрыв барабана-сепаратора' : 'Осушение каналов') : { az: 'Реактор заглушен защитой', done: 'Смена сдана', safe: 'Авария не произошла' }[kind];
  const lead = kind === 'crash' ? (bk === 'reactor' ? `За несколько секунд мощность выросла до <b>${RBN(a.maxP)} МВт</b> — примерно в ${rbTimes(a.maxP)} больше номинала. Каналы разрушились, пар поднял верхнюю плиту реактора.` : 'Оборудование разрушено.')
    : kind === 'az' ? 'Сработала аварийная защита: смена закончена досрочно.'
    : kind === 'safe' ? (hist ? ((G.hist.choices.includes('Реактор заглушен до начала испытания') || G.hist.choices.includes('stop')) ? 'Вы поступили по регламенту: при малом запасе реактивности реактор глушат, а испытание откладывают. Именно это и следовало сделать в ту ночь.' : 'Реактор остановлен без разрушения.') : '')
    : 'Смена закончена.';
  const chart = `<canvas id="rb-post" width="620" height="180"></canvas>`;
  const xe = G.sh && G.sh.shutdown && G.xePeak.x ? `<p>Максимум ксенона после останова: <b>${(G.xePeak.x * 100).toFixed(0)} %</b> от равновесного при номинале, через <b>${((G.xePeak.t - (G.shutAt || 0)) * RB.TIME_ACC / 3600).toFixed(1)} ч</b>. В это время поднять мощность невозможно — не хватает запаса реактивности. Через сутки-двое ксенон распадётся, и реактор можно будет пустить.</p>` : '';
  rbOverlay(`<div class="rb-dlg wide ${kind === 'crash' ? 'crash' : ''}"><span class="rb-tag ${kind === 'crash' ? 'bad' : kind === 'az' ? 'warn' : 'ok'}">${kind === 'crash' ? ic('triangle-alert') + ' Авария' : ic('clipboard-list') + ' Итог смены'}</span>
    <h2>${ttl}</h2><p>${lead}</p>${xe}
    ${kind === 'crash' ? `<div class="rb-why"><b>${ic('search')} Почему так произошло</b><ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
    <div class="rb-post"><b>Последние минуты: мощность и составляющие реактивности</b>${chart}<div class="rb-pleg"><span class="c-p">мощность</span><span class="c-tip">концевой эффект</span><span class="c-void">пар</span><span class="c-dop">Доплер</span><span class="c-rods">стержни</span></div></div>
    <div class="rb-res"><div><small>Время смены</small><b>${Math.floor(G.t / 60)}:${String(Math.floor(G.t % 60)).padStart(2, '0')}</b></div><div><small>Срабатываний АЗ-5</small><b>${G.score.az}</b></div><div><small>ОЗР < 15</small><b>${Math.round(G.score.ozr)} с</b></div><div><small>Оценка</small><b class="g-${g}">${g === 'X' ? '—' : g}</b>${G.usedHints ? '<em class="rb-hmk">с подсказками</em>' : ''}</div></div>
    ${kind === 'crash' ? `<p class="mute small">Как надо было: держать ОЗР не меньше 15 стержней, не работать на мощности ниже 700 МВт, не блокировать защиты; при провале мощности — заглушить реактор и ждать распада ксенона.</p>` : ''}
    <div class="rb-opts"><button class="btn" data-rb="again" data-primary>${ic('rotate-ccw')} Ещё раз ${kbd('Enter')}</button><button class="btn line" data-rb="exit">${ic('chevron-left')} К выбору режима</button>${kind === 'crash' && bk === 'reactor' ? `<button class="btn line" data-rb="epi">${ic('history')} Как это было в 1986 году</button>` : ''}${kind === 'crash' && r3Supported() ? `<button class="btn line" data-rb="crashreplay">${ic('box')} Посмотреть аварию ещё раз</button>` : ''}${kind === 'crash' ? `<button class="btn line" data-rb="help">${ic('book-open')} Справка по физике</button>` : ''}</div></div>`);
  G.endHtml = $('#rb-ov') ? $('#rb-ov').innerHTML : ''; $('.rb') && $('.rb').classList.remove('rb-crashing', 'rb-lost'); $('#rb-crashbar') && ($('#rb-crashbar').hidden = true); rbHintShow(null);
  rbPostChart();
}
function rbPostChart() {
  const c = $('#rb-post'); if (!c) return; const S = RBG.S, h = S.hist.slice(-160); if (!h.length) return;
  const x = c.getContext('2d'), W = c.width, H = c.height, t0 = h[0].t, t1 = h[h.length - 1].t || 1;
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim() || '#888';
  x.clearRect(0, 0, W, H); x.strokeStyle = col('--line'); x.lineWidth = 1; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
  const X = t => (t - t0) / Math.max(1e-6, t1 - t0) * (W - 10) + 5;
  const line = (f, c2, sc) => { x.strokeStyle = c2; x.lineWidth = 2; x.beginPath(); h.forEach((q, i) => { const v = f(q); const y = H / 2 - v * sc; i ? x.lineTo(X(q.t), y) : x.moveTo(X(q.t), y); }); x.stroke(); };
  const mp = Math.max(...h.map(q => q.P), 0.01);
  x.strokeStyle = col('--acc'); x.lineWidth = 2.5; x.beginPath(); h.forEach((q, i) => { const y = H - 6 - Math.log10(1 + q.P / mp * 99) / 2 * (H - 12); i ? x.lineTo(X(q.t), y) : x.moveTo(X(q.t), y); }); x.stroke();
  const r0 = h[0]; line(q => q.tip || 0, '#e11d48', 40); line(q => (q.void || 0) - (r0.void || 0), '#0ea5e9', 40); line(q => (q.dop || 0) - (r0.dop || 0), '#16a34a', 40); line(q => (q.rods || 0) - (r0.rods || 0), '#8b5cf6', 10);
}

/* ---------- обновление пульта ---------- */
let rbChartMode = 'p';
function rbUpdate(force) {
  const G = RBG; if (!G || !$('.rb')) return; const S = G.S, set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  set('rb-clock', rbClock(S.clock, G.hist && (G.hist.step === 'test' || G.hist.step === 'az')));
  set('rb-pt', RBN(S.P)); set('rb-pt3', RBN(S.P)); set('rb-ozr3', RB.ozr(S).toFixed(1)); set('rb-per3', !isFinite(S.period) || Math.abs(S.period) > 999 ? '∞' : (S.period > 0 ? '+' : '') + S.period.toFixed(0)); const pe = S.tg.reduce((a, t) => a + (t.on ? Math.max(0, t.load) : 0), 0) * 1000 * Math.min(1, S.P / 0.3 + 0.2); set('rb-pe', Math.round(Math.max(0, pe)).toLocaleString('ru-RU'));
  set('rb-per', !isFinite(S.period) || Math.abs(S.period) > 999 ? '∞' : (S.period > 0 ? '+' : '') + S.period.toFixed(0)); set('rb-rho', (S.rho >= 0 ? '+' : '') + S.rho.toFixed(2));
  const oz = RB.ozr(S); set('rb-ozr', oz.toFixed(1)); const ob = $('#rb-ozrb s'); if (ob) ob.style.width = Math.min(100, oz / 60 * 100) + '%'; $('#rb-ozrb') && $('#rb-ozrb').classList.toggle('bad', oz < 15);
  const rod = (id, v) => { const e = document.getElementById(id); if (e) e.style.width = (v * 100).toFixed(1) + '%'; set(id + 'v', (v * 100).toFixed(1) + ' %'); };
  rod('rb-rr', S.rods.RR); rod('rb-usp', S.rods.USP); rod('rb-ar', S.rods.AR);
  set('rb-arset', RBN(S.ar.set)); const arb = $('#rb-arbtn'); if (arb) { const lock = G.sh && G.sh.lock && G.sh.lock.includes('ar'); arb.textContent = lock ? 'АР заблокирован' : S.ar.on ? 'АР включён' : 'Включить АР'; arb.classList.toggle('on', S.ar.on); arb.disabled = !!lock || S.az; const row = arb.closest('.rb-rod'); if (row) row.classList.toggle('man', !S.ar.on); }
  set('rb-xev', (S.X * 100).toFixed(0) + ' %'); set('rb-iov', (S.I * 100).toFixed(0) + ' %');
  const xb = $('#rb-xe'); if (xb) xb.style.width = Math.min(100, S.X / 2.2 * 100) + '%'; const ib = $('#rb-io'); if (ib) ib.style.width = Math.min(100, S.I / 1.6 * 100) + '%';
  set('rb-xet', S.P < 0.005 ? (S.X > G.xePeak.x - 0.005 ? 'Реактор заглушен: ксенон накапливается — «йодная яма».' : 'Ксенон распадается: максимум отравления пройден.') : S.P < 0.15 && S.X > 1.05 ? 'Мощность мала: ксенон выгорает медленно и накапливается.' : S.X > 1.1 ? 'Отравление выше равновесного: для поддержания мощности выводят стержни.' : 'Отравление в норме.');
  set('rb-axv', (S.axial * 100).toFixed(0) + ' %');
  set('rb-pv', S.p.toFixed(2)); set('rb-lv', (S.lvl > 0 ? '+' : '') + S.lvl.toFixed(0)); const lb = $('#rb-lvl'); if (lb) lb.style.height = Math.max(0, Math.min(100, (S.lvl + 900) / 1800 * 100)) + '%';
  set('rb-flow', `расход ${Math.round(S.G * 48)} тыс. м³/ч`);
  S.pumps.forEach((q, i) => { const b = document.getElementById('rb-pump' + i); if (!b) return; b.classList.toggle('on', q.on); b.classList.toggle('warn', q.on && q.vib > 60); b.classList.toggle('cav', q.cav > 0.2);
    const st = b.querySelector('.st'), fl = b.querySelector('.fl'), mi = b.querySelector('.rb-mini i'); const shown = q.spin * 8 * (G.sensor && G.sensor.i === i ? G.sensor.k : 1);
    if (st) st.textContent = q.on ? (q.cav > 0.2 ? 'кавитация' : 'работает') : q.spin > 0.05 ? 'выбег' : 'резерв'; if (fl) fl.textContent = shown.toFixed(1) + ' тыс. м³/ч'; if (mi) mi.style.width = Math.min(100, q.vib) + '%'; });
  S.fwPumps.forEach((on, i) => { const b = document.getElementById('rb-pen' + i); if (b) b.classList.toggle('on', on); });
  S.tg.forEach((t, i) => { const b = document.getElementById('rb-tg' + i); if (!b) return; b.classList.toggle('on', t.on); const g = G.E && G.E.tg[i], tx = g ? `ТГ-${i + 7} · ${Math.round(g.P)} МВт · ${g.f.toFixed(1).replace('.', ',')} Гц` : 'ТГ-' + (i + 7); if (b.textContent !== tx) b.textContent = tx; });
  const tga = $('#rb-tga'); if (tga) { tga.classList.toggle('on', S.tgAuto); tga.textContent = S.tgAuto ? 'Регулятор ТГ: авто' : 'Регулятор ТГ: ручн.'; }
  const fwa = $('#rb-fwa'); if (fwa) { fwa.classList.toggle('on', S.fwAuto); fwa.textContent = S.fwAuto ? 'Питание: авто' : 'Питание: ручн.'; }
  const bru = $('#rb-bru'); if (bru) { bru.classList.toggle('on', S.bru > 0); bru.textContent = S.bru > 0 ? 'БРУ-К: открыт' : 'БРУ-К: закрыт'; }
  const ec = $('#rb-eccs'); if (ec) { ec.classList.toggle('on', S.eccs); ec.textContent = S.eccs ? 'САОР: готова' : 'САОР: отключена'; }
  if (G.hist) Object.keys(S.prot).forEach(k => { const b = document.getElementById('rb-prot-' + k); if (b) { b.classList.toggle('on', S.prot[k]); b.classList.toggle('off', !S.prot[k]); } });
  // задание и оценка
  const goal = G.hist ? (RB_HSTEPS[G.hist.step] ? RB_HSTEPS[G.hist.step].task : '') : G.sh && G.sh.shutdown && G.shutAt ? 'Наблюдайте йодную яму (×5, ×20)' : `${RBN(G.target)} ± ${Math.round(G.tol * G.target * 3200)} МВт`;
  set('rb-goal', goal); const pr = $('#rb-prog s'); if (pr) pr.style.width = (G.hist ? 0 : Math.min(100, G.t / ((G.sh && G.sh.dur) || 600) * 100)) + '%';
  const sc = G.score.devN ? Math.max(0, Math.round(100 - G.score.dev / G.score.devN * 40 - G.score.ozr * 0.4 - G.score.alarm * 1.2)) : null; set('rb-score', sc == null ? '—' : RB_GRADE(sc) + ' · ' + sc);
  set('rb-speed', '×' + G.speed); const ps = $('#rb-pause'); if (ps) ps.classList.toggle('on', G.paused);
  // табло
  const an = $('#rb-ann'); if (an) an.querySelectorAll('span').forEach(s => s.className = G.alarms[s.dataset.a] ? (['az', 'ozr', 'per', 'pw', 'press', 'lvl'].includes(s.dataset.a) ? 'red' : 'amber') : '');
  document.querySelectorAll('.rb-azc').forEach(azc => { azc.classList.toggle('open', G.cover); azc.classList.toggle('fired', S.az); });
  // журнал
  if (rbDirty.log) { rbDirty.log = false; const L = $('#rb-log'); if (L) L.innerHTML = G.log.map(l => `<p class="${l.kind}"><b>${l.c}</b> ${esc(l.text)}</p>`).join('') || '<p class="mute">Записей нет.</p>'; }
  if (G.hist && (rbDirty.task || force)) { rbDirty.task = false; const T = $('#rb-task'), st = RB_HSTEPS[G.hist.step]; if (T && st) T.innerHTML = `<h3>${ic('list-checks')} Ход событий</h3><p>${st.t}</p><p class="rb-do">${st.task}</p>${G.hist.step === 'prot' ? `<button class="btn" data-rb="htest" id="rb-htest">${ic('play')} Начать испытание выбега ТГ-8</button><p class="mute small" id="rb-htw"></p>` : ''}`; }
  if (G.hist && G.hist.step === 'prot') { const w = $('#rb-htw'), early = rbHistEarly(); if (w) w.textContent = early ? `Испытание — в 01:23. Сейчас ${rbClock(S.clock)}: держите мощность, ксенон растёт (можно ×5).` : 'Время испытания.'; const hb = $('#rb-htest'); if (hb) hb.disabled = early; }
  if ((G.view || '2d') === '2d') rbDraw();   // скрытые холсты 2D-пульта не перерисовываем
  // щелчки счётчика на малой мощности
  if (!G.paused && G.started && S.P < 0.02 && S.P > 1e-5 && Math.random() < Math.min(0.6, S.P * 400)) rbSnd.click();
}
function rbDraw() {
  const G = RBG, S = G.S, css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim() || '#888';
  // картограмма: каналы по кругу, цвет — мощность канала
  const c = $('#rb-core');
  if (c) {
    const x = c.getContext('2d'), W = c.width, H = c.height, R = Math.min(W, H) / 2 - 6, cx = W / 2, cy = H / 2, n = 23, cell = (2 * R) / n;
    if (!G.noise) G.noise = Array.from({ length: n * n }, () => 0.85 + Math.random() * 0.3);
    x.clearRect(0, 0, W, H); x.fillStyle = col('--card2'); x.beginPath(); x.arc(cx, cy, R + 4, 0, Math.PI * 2); x.fill();
    const pmax = Math.max(0.001, S.P);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const px = cx - R + (i + 0.5) * cell, py = cy - R + (j + 0.5) * cell, r = Math.hypot(px - cx, py - cy) / R; if (r > 0.98) continue;
      const rod = (i % 4 === 1 && j % 4 === 1) ? 'RR' : (i % 8 === 3 && j % 8 === 3) ? 'AR' : (i % 6 === 4 && j % 6 === 0) ? 'USP' : null;
      if (rod) { const ins = S.rods[rod]; x.fillStyle = rod === 'RR' ? '#64748b' : rod === 'AR' ? '#f59e0b' : '#8b5cf6'; x.fillRect(px - cell * 0.4, py - cell * 0.4, cell * 0.8, cell * 0.8); x.fillStyle = col('--card'); x.fillRect(px - cell * 0.28, py - cell * 0.28, cell * 0.56, cell * 0.56 * (1 - ins)); continue; }
      const loc = S.P * (1.25 - 0.55 * r * r) * G.noise[i * n + j];
      const v = Math.max(0, Math.min(1, Math.log10(1 + loc * 60) / Math.log10(1 + 1.4 * 60)));
      x.fillStyle = `hsl(${(220 - v * 220).toFixed(0)}, 85%, ${(28 + v * 30).toFixed(0)}%)`; x.fillRect(px - cell * 0.46, py - cell * 0.46, cell * 0.92, cell * 0.92);
    }
    if (S.broken) { x.fillStyle = 'rgba(225,29,72,.55)'; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill(); }
  }
  // поле по высоте
  const a = $('#rb-axial');
  if (a) { const x = a.getContext('2d'), W = a.width, H = a.height; x.clearRect(0, 0, W, H); x.fillStyle = col('--card2'); x.fillRect(8, 4, W - 16, H - 8);
    x.strokeStyle = col('--acc'); x.lineWidth = 3; x.beginPath(); for (let k = 0; k <= 40; k++) { const z = k / 40, f = Math.sin(Math.PI * Math.max(0.02, Math.min(0.98, z))) * (1 + S.axial * 1.6 * (z - 0.5) * 2) ; const px = 10 + Math.max(0, f) / 1.9 * (W - 20), py = 6 + z * (H - 12); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.fillStyle = col('--mute'); x.font = '10px sans-serif'; x.fillText('верх', 10, 14); x.fillText('низ', 10, H - 8); }
  // самописец
  const ch = $('#rb-chart');
  if (ch) { const x = ch.getContext('2d'), W = ch.width, H = ch.height, h = S.hist.slice(-720); x.clearRect(0, 0, W, H);
    x.strokeStyle = col('--line'); x.lineWidth = 1; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(0, H * k / 4); x.lineTo(W, H * k / 4); x.stroke(); }
    if (h.length > 1) {
      const t1 = h[h.length - 1].t, t0 = t1 - 180, X = t => (t - t0) / 180 * W;
      if (rbChartMode === 'p') {
        const Y = p => H - 4 - Math.min(1, p / 1.2) * (H - 10);
        if (!S.az) { x.fillStyle = 'rgba(34,197,94,.13)'; x.fillRect(0, Y(G.target * (1 + G.tol)), W, Y(G.target * (1 - G.tol)) - Y(G.target * (1 + G.tol))); }
        x.strokeStyle = col('--acc'); x.lineWidth = 2.2; x.beginPath(); h.forEach((q, i) => i ? x.lineTo(X(q.t), Y(q.P)) : x.moveTo(X(q.t), Y(q.P))); x.stroke();
        x.fillStyle = col('--mute'); x.font = '11px sans-serif'; x.fillText('3840 МВт', 4, 12); x.fillText('0', 4, H - 6);
      } else {
        const Y = r => H / 2 - r * (H / 2 - 6) / 3, comp = [['void', '#0ea5e9'], ['dop', '#16a34a'], ['xe', '#a855f7'], ['tip', '#e11d48'], ['rho', '#f97316']];
        const base = h[0]; comp.forEach(([k, c2]) => { x.strokeStyle = c2; x.lineWidth = k === 'rho' ? 2.5 : 1.6; x.beginPath(); h.forEach((q, i) => { const v = k === 'rho' || k === 'tip' ? q[k] : (q[k] || 0) - (base[k] || 0); i ? x.lineTo(X(q.t), Y(v)) : x.moveTo(X(q.t), Y(v)); }); x.stroke(); });
        x.fillStyle = col('--mute'); x.font = '11px sans-serif'; x.fillText('+3 β', 4, 12); x.fillText('−3 β', 4, H - 6); x.fillText('изменения: пар, Доплер, ксенон; концевой эффект; ρ', 50, 12);
      }
    } }
  // давление
  const pg = $('#rb-press');
  if (pg) { const x = pg.getContext('2d'), W = pg.width, H = pg.height, cx = W / 2, cy = H - 8, r = H - 18; x.clearRect(0, 0, W, H);
    const ang = v => Math.PI + (Math.max(5, Math.min(9, v)) - 5) / 4 * Math.PI;
    x.lineWidth = 9; [[5, 6.4, '#f59e0b'], [6.4, 7.45, '#22c55e'], [7.45, 8, '#f59e0b'], [8, 9, '#e11d48']].forEach(([a0, a1, c2]) => { x.strokeStyle = c2; x.beginPath(); x.arc(cx, cy, r, ang(a0), ang(a1)); x.stroke(); });
    x.strokeStyle = col('--text'); x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang(S.p)) * (r - 4), cy + Math.sin(ang(S.p)) * (r - 4)); x.stroke(); }
}

/* ---------- действия ---------- */
function rbStart(mode, k) {
  RBG = rbNew(mode, k == null ? null : +k); RBG.E = rbElecNew(); RBG.started = false; SCREEN = 'rbmk'; rbKeys = {}; render();
}
function rbExit() { rbEpiClose(true); r3Hide(); cancelAnimationFrame(rbRaf); rbSnd.sirenOff(); RBG = null; rbKeys = {}; SCREEN = 'labs'; PAGE = 'rbmk'; render(); }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-rb]'); if (!b) return; const d = b.dataset, G = RBG, S = G && G.S;
  switch (d.rb) {
    case 'start': rbStart(d.m, d.k); break;
    case 'help': if (SCREEN === 'rbmk') rbHelp(); else modal(`${ic('book-open')} Как устроен РБМК-1000`, rbHelpHtml()); break;
    case 'exit': rbExit(); break;
    case 'go': G.started = true; G.paused = false; rbOverlayClose(); rbHintNudge(); rbLog('ok', G.hist ? 'Смена принята. 23:10, мощность 1600 МВт.' : 'Смена принята.'); break;
    case 'close': rbOverlayClose(); if (G && !G.done && G.started) G.paused = false; break;
    case 'again': { const m = G.mode, k = G.k; rbStart(G.hist && m !== 'career' ? 'history' : m, k); break; }
    case 'pause': if (G.started && !G.done) G.paused = !G.paused; break;
    case 'speed': if (G.hist || (G.sh && G.sh.speed) || G.mode === 'free') { const o = [1, 5, 20]; G.speed = o[(o.indexOf(G.speed) + 1) % o.length]; } else { G.speed = 1; toast('В этой смене ускорение времени недоступно'); } break;
    case 'snd': rbSnd.toggle(); b.innerHTML = ic(rbSnd.on ? 'volume-2' : 'volume-x'); break;
    case 'chart': rbChartMode = rbChartMode === 'p' ? 'r' : 'p'; $('#rb-chm').textContent = rbChartMode === 'p' ? 'составляющие реактивности' : 'мощность'; break;
    case 'rod': if (G.stuck > 0 && d.g === 'RR') { toast('Привод РР заело — подождите', 'bad'); break; } if (d.g === 'AR' && S.ar.on) { toast('Группой АР управляет регулятор. Отключите АР, чтобы двигать её вручную.'); break; } S.rods[d.g] = Math.max(0, Math.min(1, S.rods[d.g] + (+d.v) * 0.001)); break;
    case 'ar': if (S.az) break; S.ar.on = !S.ar.on; if (S.ar.on) { S.ar.set = Math.max(0.06, S.P); S.ar.cur = S.P; rbLog('ok', `АР включён, уставка ${RBN(S.ar.set)} МВт.`); } else rbLog('warn', 'АР отключён оператором.'); break;
    case 'arset': S.ar.set = Math.max(0.06, Math.min(1.05, S.ar.set + (+d.v))); break;
    case 'cover': G.cover = !G.cover; break;
    case 'view': G.view = d.v; rbView(); break;
    case 'r3view': r3Preset(d.v); break;
    case 'r3sel': r3Select(null); break;
    case 'r3lbl': { const on = !r3LblOn(); try { localStorage.setItem('fz-rb-lbl', on ? '1' : '0'); } catch (e) {} b.classList.toggle('on', on); if (R3.lblBox) R3.lblBox.classList.toggle('off', !on); break; }
    case 'r3q': { const q = R3Q() === 'low' ? 'high' : 'low'; try { localStorage.setItem('fz-rb-q3', q); } catch (e) {} b.innerHTML = ic('gauge') + (q === 'low' ? ' Качество: простое' : ' Качество: высокое'); if (R3.ok && G.view === '3d') r3Build(R3.kind); break; }
    case 'hints': rbHintsToggle(); break;
    case 'hintok': G.hintMute = G.hintMute || {}; G.hintMute[d.v] = G.t + 60; rbHintShow(null); break;
    case 'hintmute': G.hintMute = G.hintMute || {}; G.hintMute[d.v] = Infinity; rbHintShow(null); break;
    case 'crashskip': if (G.crash && !G.done) rbEnd('crash'); else if (G.replay) rbCrashFxDone(); break;
    case 'epi': { const html = $('#rb-ov') ? $('#rb-ov').innerHTML : G.endHtml; rbOverlayClose(); rbEpilogue(() => { rbOverlay(html); rbPostChart(); }); break; }
    case 'crashreplay': if (!G.crash) break; rbOverlayClose(); G.replay = true; G.crash.t = 0; R3.kind = G.crash.kind === 'drum' ? 'unit' : 'core'; G.view = '3d'; rbView(); rbCrashBar(true); break;
    case 'scene': document.querySelectorAll('.rb-3dsc .btn').forEach(x => x.classList.toggle('on', x === b)); R3.kind = d.v; if (R3.ok) { r3Build(d.v); if (G.crash && (!G.done || G.replay)) r3Boom(G.crash.kind); } break;
    case 'az': if (!G.cover) { toast('Сначала откройте крышку кнопки АЗ-5', 'bad'); break; } if (!S.az) { RB.scram(S, 'нажата кнопка на пульте'); if (G.hist) G.hist.choices.push('АЗ-5 нажата при ОЗР ' + RB.ozr(S).toFixed(1)); } break;
    case 'pump': { const i = +d.v, q = S.pumps[i]; if (G.sh && !G.hist && G.k === 0) { toast('В этой смене насосами управляет другой оператор'); break; }
      q.on = !q.on; q.coast = !q.on; if (q.on) { q.fault = q.fault || 0; } rbLog(q.on ? 'ok' : 'warn', `ГЦН-${i + 1} ${q.on ? 'включён' : 'отключён'}.`);
      if (!q.on && q.fault) { q.fault = 0; const f = G.faults.find(f => f.kind === 'vib' && f.i === i); if (f) { f.fixed = true; rbLog('ok', `Неисправный ГЦН-${i + 1} выведен в ремонт.`); } } break; }
    case 'pen': { const i = +d.v; S.fwPumps[i] = !S.fwPumps[i]; rbLog(S.fwPumps[i] ? 'ok' : 'warn', `ПЭН-${i + 1} ${S.fwPumps[i] ? 'включён' : 'отключён'}.`); if (S.fwPumps.filter(Boolean).length >= 2) G.faults.filter(f => f.kind === 'pen').forEach(f => f.fixed = true); break; }
    case 'tgsw': { const i = +d.v, g = G.E.tg[i]; if (S.tg[i].on) { S.tg[i].on = false; rbLog('warn', `ТГ-${i + 7}: выключатель генератора отключён.`); } else if (!g.sync) toast('Нет синхронизма. Включайте, когда стрелка синхроноскопа у верхней отметки и горит зелёная лампа.', 'bad'); else { S.tg[i].on = true; rbLog('ok', `ТГ-${i + 7} включён в сеть по синхроноскопу.`); } break; }
    case 'exc': { const i = +d.v; G.E.tg[i].exc = !G.E.tg[i].exc; rbLog(G.E.tg[i].exc ? 'ok' : 'warn', `ТГ-${i + 7}: возбуждение ${G.E.tg[i].exc ? 'включено' : 'снято'}.`); break; }
    case 'sec': { const k = +d.v; G.E.sec[k] = G.E.sec[k] === 'tg' ? 'res' : 'tg'; rbLog('ok', `Секция 6 кВ № ${k + 1}: питание ${G.E.sec[k] === 'res' ? 'от резервного трансформатора' : 'от ТГ-' + (k < 2 ? 7 : 8)}.`); break; }
    case 'ekey': { const [rb, v] = rbKeyCmd(+d.v); r3Cmd(rb, v); break; }
    case 'tg': { const i = +d.v; S.tg[i].on = !S.tg[i].on; rbLog('warn', `ТГ-${i + 7} ${S.tg[i].on ? 'включён в сеть' : 'отключён'}.`); break; }
    case 'tgauto': { const f = G.faults.find(x => x.kind === 'tgreg' && !x.fixed); if (!S.tgAuto && f && G.t - f.at < 40) { toast('Регулятор турбин ещё в ремонте: держите давление вручную', 'bad'); break; } S.tgAuto = !S.tgAuto; if (S.tgAuto && f) f.fixed = true; break; }
    case 'fwauto': S.fwAuto = !S.fwAuto; break;
    case 'bru': S.bru = S.bru > 0 ? 0 : 1; break;
    case 'eccs': S.eccs = !S.eccs; rbLog(S.eccs ? 'ok' : 'warn', S.eccs ? 'САОР введена в работу.' : 'САОР отключена.'); break;
    case 'prot': { const k = d.v; S.prot[k] = !S.prot[k]; rbLog(S.prot[k] ? 'ok' : 'bad', `Защита «${b.textContent}» ${S.prot[k] ? 'введена' : 'заблокирована'}.`); if (!S.prot[k] && G.hist) G.hist.choices.push('заблокирована защита: ' + b.textContent); break; }
    case 'htest': if (G.hist.step !== 'prot') break; if (rbHistEarly()) { toast('По программе испытание начинается в 01:23. Держите мощность; можно ускорить время.'); break; } rbHistGo('test'); break;
    case 'hchoice': rbOverlayClose(); G.paused = false; G.hist.choices.push(d.v);
      if (d.v === 'stop') { RB.scram(S, 'решение СИУР: реактор заглушен, испытание отложено'); rbLog('ok', 'Вы заглушили реактор по регламенту.'); setTimeout(() => RBG && !RBG.done && rbEnd('safe'), 1500); }
      else rbHistGo('raise'); break;
  }
});
// калибровка датчика расхода — правая кнопка мыши по насосу
document.addEventListener('contextmenu', e => {
  const b = e.target.closest && e.target.closest('[data-rb="pump"]'); if (!b || !RBG) return; e.preventDefault();
  const G = RBG, i = +b.dataset.v;
  if (G.sensor && G.sensor.i === i) { G.sensor = null; G.faults.filter(f => f.kind === 'sensor').forEach(f => f.fixed = true); rbLog('ok', `Расходомер ГЦН-${i + 1} откалиброван.`); }
  else { rbLog('warn', `Расходомер ГЦН-${i + 1} исправен.`); G.score.alarm += 1; }
});
// удержание кнопок стержней мышью
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('[data-rb="rod"]'); if (b && RBG) RBG.btnRod = { g: b.dataset.g, v: +b.dataset.v }; });
document.addEventListener('pointerup', () => { if (RBG) RBG.btnRod = null; });
document.addEventListener('keydown', e => {
  if (SCREEN !== 'rbmk' || !RBG) return; const G = RBG, k = e.key, tag = (e.target.tagName || '');
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const ov = $('#rb-ov'), open = ov && !ov.hidden;
  if (k === 'Enter' && open) { const p = ov.querySelector('[data-primary]'); if (p) { e.preventDefault(); p.click(); } return; }
  if (k === 'Escape') { if (open && G.started && !G.done && !(G.hist && G.hist.step === 'drop' && G.paused)) { rbOverlayClose(); G.paused = false; } else if (!open) { G.paused = true; rbOverlay(`<div class="rb-dlg"><span class="rb-tag">Пауза</span><h2>Смена приостановлена</h2><div class="rb-opts"><button class="btn" data-rb="close" data-primary>${ic('play')} Продолжить ${kbd('Enter')}</button><button class="btn line" data-rb="exit">${ic('chevron-left')} Выйти из смены</button></div></div>`); } e.preventDefault(); return; }
  if (open) return;
  const m = { w: 'w', ArrowUp: 'w', 'ц': 'w', s: 's', ArrowDown: 's', 'ы': 's', a: 'a', 'ф': 'a', d: 'd', 'в': 'd' }[k] || { KeyW: 'w', KeyS: 's', KeyA: 'a', KeyD: 'd' }[e.code];
  if (m) { if (G.stuck > 0 && (m === 'w' || m === 's')) return; rbKeys[m] = true; e.preventDefault(); }
  if (e.key === 'Shift') rbKeys.Shift = true;
  if (e.code === 'Space') { e.preventDefault(); if (G.started && !G.done) G.paused = !G.paused; }
  if (e.code === 'KeyQ') RBG.S.bru = RBG.S.bru > 0 ? 0 : 1;
  if (e.code === 'KeyH') rbHelp();
  if (e.code === 'KeyL') rbHintsToggle();
  if (e.code === 'KeyV') { G.view = G.view === '3d' ? '2d' : '3d'; rbView(); }
  if (e.code === 'KeyE') { G.view = G.view === 'elec' ? '2d' : 'elec'; rbView(); }
  if (e.code === 'KeyT') { G.view = G.view === 'task' ? '2d' : 'task'; rbView(); }
});
document.addEventListener('keyup', e => {
  const m = { w: 'w', ArrowUp: 'w', 'ц': 'w', s: 's', ArrowDown: 's', 'ы': 's', a: 'a', 'ф': 'a', d: 'd', 'в': 'd' }[e.key] || { KeyW: 'w', KeyS: 's', KeyA: 'a', KeyD: 'd' }[e.code];
  if (m) rbKeys[m] = false; if (e.key === 'Shift') rbKeys.Shift = false;
});
window.addEventListener('blur', () => { rbKeys = {}; });
// заевший привод: таймер
setInterval(() => { if (RBG && RBG.stuck > 0 && !RBG.paused) { RBG.stuck -= 0.5 * RBG.speed; if (RBG.stuck <= 0) { RBG.stuck = 0; RBG.faults.filter(f => f.kind === 'rod').forEach(f => f.fixed = true); rbLog('ok', 'Привод РР снова исправен.'); } } }, 500);
// для тестов: прогнать игру вперёд без отрисовки
window.__rb = { hints: () => RBG && rbHintList(RBG), tick: s => { if (RBG && !RBG.paused && RBG.started) rbTick(s); }, get G() { return RBG; }, RB };

/* ---------- авария: пульт «сходит с ума», затем 3D-визуализация по видам разрушения, затем разбор ---------- */
function rbCrashStart() {
  const G = RBG; if (G.crash) return; G.crash = { kind: G.S.broken.kind, t: 0, stage: 0 };
  rbHintShow(null); rbSnd.sirenOn(); const r = $('.rb'); if (r) r.classList.add('rb-crashing');
  rbCrashBar(true); rbCrashCap({ reactor: 'Мощность растёт лавинообразно — приборы зашкаливают.', drum: 'Давление в барабанах-сепараторах выше предела прочности.', dryout: 'Уровень в барабанах упал: вода не поступает в каналы.' }[G.crash.kind]);
}
function rbCrashBar(on) {
  const b = $('#rb-crashbar'); if (!b) return; b.hidden = !on;
  if (on) b.innerHTML = `<span class="rb-cbi">${ic('triangle-alert')}</span><p id="rb-crashcap"></p><button class="btn line" data-rb="crashskip">Пропустить ${ic('chevron-right')}</button>`;
}
function rbCrashCap(t) { const p = $('#rb-crashcap'); if (!p || p.textContent === t) return; p.textContent = t; p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); }
function rbCrashLoop(dt) {
  const G = RBG, c = G.crash; if (G.done && !G.replay) return; c.t += dt;
  if (!G.replay && c.stage === 0 && c.t > 2.2) {
    c.stage = 1; rbSnd.sirenOff(); const r = $('.rb'); if (r) r.classList.remove('rb-crashing');
    if (r3Supported()) { R3.kind = c.kind === 'drum' ? 'unit' : 'core'; G.view = '3d'; rbView(); } else { c.no3d = true; rbCrashCap('Связь с датчиками потеряна. Реактор разрушен.'); }
  }
  if (!G.done && !c.epi && ((c.no3d && c.t > 6) || (c.stage === 1 && G.view !== '3d' && c.t > 6) || c.t > 22)) { if (c.no3d) rbCrashFxDone(); else rbEnd('crash'); }
}
function rbCrashFxDone() {
  const G = RBG; if (!G) return;
  if (G.replay) { G.replay = false; rbCrashBar(false); rbOverlay(G.endHtml); rbPostChart(); return; }
  if (G.crash && !G.done) { if (G.hist && G.crash.kind === 'reactor' && !G.epiSeen) { G.epiSeen = true; G.crash.epi = true; rbCrashBar(false); rbEpilogue(() => rbEnd('crash')); } else rbEnd('crash'); }
}

/* ---------- живые подсказки (включаются кнопкой или клавишей L; с ними высшая оценка — A) ---------- */
function rbHintsToggle() {
  const G = RBG; if (!G || G.done) return; G.hints = !G.hints;
  const b = $('#rb-hbtn'); if (b) { b.classList.toggle('on', G.hints); const s = b.querySelector('span'); if (s) s.textContent = G.hints ? 'Подсказки: вкл' : 'Подсказки: выкл'; }
  const n = $('#rb-hnudge'); if (n) n.remove();
  G._hintAt = 0; if (!G.hints) rbHintShow(null); else toast('Живые подсказки включены. С ними высшая оценка за смену — A.');
}
function rbHintNudge() {
  const G = RBG; if (!G || G.hints || $('#rb-hnudge')) return; const r = $('.rb'); if (!r) return;
  const el = document.createElement('div'); el.className = 'rb-hnudge'; el.id = 'rb-hnudge';
  el.innerHTML = `${ic('lightbulb')}<span>Можно включить <b>живые подсказки</b>: что происходит, что сделать и почему. С ними высшая оценка — A.</span><button class="btn" data-rb="hints">Включить</button><button class="btn line" onclick="this.parentNode.remove()">Не нужно</button>`;
  r.appendChild(el); setTimeout(() => el.remove(), 12000);
}
function rbHintLoop(now) {
  const G = RBG; if (!G || now - (G._hintAt || 0) < 500) return; G._hintAt = now;
  if (!G.hints || !G.started || G.done || G.crash) { if ($('#rb-hint') && !$('#rb-hint').hidden) rbHintShow(null); return; }
  G.usedHints = true; const mute = G.hintMute || {};
  rbHintShow(rbHintList(G).find(h => !(mute[h.id] > G.t)) || null);
}
function rbHintShow(h) {
  const el = $('#rb-hint'); document.querySelectorAll('.rb-hl').forEach(x => x.classList.remove('rb-hl')); if (typeof R3 !== 'undefined') R3.hint = null;
  if (!el) return; if (!h) { el.hidden = true; el.dataset.k = ''; return; }
  const key = h.id + '|' + h.what + '|' + h.act;
  if (el.dataset.k !== key) { el.dataset.k = key; el.className = 'rb-hint ' + (h.pr <= 3 ? 'bad' : ''); el.innerHTML = `<div class="rb-hic">${ic(h.pr <= 3 ? 'triangle-alert' : 'lightbulb')}</div><div class="rb-hb"><b>${h.what}</b><p>${h.act}</p><small>${h.why}</small><div class="rb-hbtns"><button class="btn line" data-rb="hintok" data-v="${h.id}">Понятно</button><button class="fz-lnk" data-rb="hintmute" data-v="${h.id}">Больше не показывать</button></div></div>`; }
  el.hidden = false;
  if (h.sel && RBG.view === '2d') document.querySelectorAll('.rb-grid ' + h.sel).forEach(t => t.classList.add('rb-hl'));
  if (h.sel && RBG.view === '3d') document.querySelectorAll('.rb-3dhud ' + h.sel).forEach(t => t.classList.add('rb-hl'));
  if (RBG.view === '3d' && typeof R3 !== 'undefined') R3.hint = h.obj || null;
}

/* ---------- «Эпилог»: что было на самом деле 26 апреля 1986 г. (кадры-диорамы, движение камеры, искры, текст) ----------
   Факты: НКДАР ООН (UNSCEAR 2008), World Nuclear Association, ЧАЭС (chnpp.gov.ua). */
const RB_EPI = [
  { img: 1, d: 8, kb: [1.04, 1.12, '0%', '-1.5%'], stamp: '26.04.1986 · 01:23', t: 'Чернобыльская АЭС, 4-й энергоблок. Ночь. Идёт испытание выбега турбогенератора.' },
  { img: 2, d: 10, kb: [1.12, 1.2, '-1.5%', '-3%'], flash: true, fx: 'fire', stamp: '01:23:40', t: 'Нажата кнопка АЗ-5. Через несколько секунд два взрыва разрушили реактор и здание энергоблока.' },
  { img: 3, d: 10, kb: [1.02, 1.1, '1%', '0%'], fx: 'fire', stamp: '26.04.1986 · ночь', t: 'Первыми к горящему энергоблоку приехали пожарные. Они тушили огонь на крышах среди обломков с высокой радиоактивностью. В ту ночь погибли два работника станции.' },
  { img: 3, d: 8, kb: [1.1, 1.16, '0%', '-1%'], fx: 'fire', stamp: '1986', t: 'Острую лучевую болезнь подтвердили у 134 участников первых работ. 28 из них умерли в первые месяцы.' },
  { img: 4, d: 10, kb: [1.0, 1.08, '0%', '1%'], stamp: '27.04.1986', t: 'Из Припяти вывезли около 49 тысяч жителей — колонной больше чем из тысячи автобусов. Всего в 1986 году переселили около 116 тысяч человек.' },
  { img: 5, d: 9, kb: [1.06, 1.0, '1%', '0%'], stamp: 'Зона отчуждения', t: 'Город опустел навсегда. Вокруг станции — зона отчуждения.' },
  { img: 6, d: 11, kb: [1.0, 1.08, '-1%', '0%'], stamp: '1986 · 2016', t: 'За 206 дней над разрушенным реактором построили укрытие — «саркофаг» (акт о вводе подписан 30 ноября 1986 г.). В 2016 году его накрыли новой аркой высотой 108 м.' },
  { img: 7, d: 11, kb: [1.0, 1.1, '0%', '0%'], fx: 'calm', stamp: 'Что изменили', t: 'После аварии в РБМК подняли запас реактивности до 43–48 стержней, добавили 80–90 поглотителей, повысили обогащение топлива с 2 до 2,4 %, переделали стержни и ускорили аварийную защиту. Паровой эффект снизили примерно до +1 β.' },
  { img: 7, d: 9, kb: [1.1, 1.14, '0%', '0%'], fx: 'calm', stamp: '', t: 'Памяти погибших и всех, кто ликвидировал последствия аварии.', last: true },
];
let rbEpiS = null;
function rbEpilogue(done) {
  const r = $('.rb'); if (!r || rbEpiS) return; rbEpiClose(true);
  const el = document.createElement('div'); el.className = 'rb-epi'; el.id = 'rb-epi';
  el.innerHTML = `<img alt=""><img alt=""><canvas class="rb-epi-fx"></canvas><div class="rb-epi-flash"></div><div class="rb-epi-vig"></div>
    <div class="rb-epi-cap"><small class="rb-epi-st"></small><p class="rb-epi-t"></p></div>
    <div class="rb-epi-ctl"><button class="btn line" data-epi="pause">${ic('pause')}</button><button class="btn line" data-epi="next">Дальше ${ic('chevron-right')}</button><button class="btn line" data-epi="close">Закрыть ${kbd('Esc')}</button></div>
    <div class="rb-epi-dots">${RB_EPI.map(() => '<i></i>').join('')}</div><p class="rb-epi-src">Источники: НКДАР ООН (UNSCEAR), World Nuclear Association, ЧАЭС. Изображения — художественная реконструкция.</p>`;
  r.appendChild(el);
  rbEpiS = { el, done, k: -1, t: 0, paused: false, cur: 0, anim: null, parts: [], last: performance.now(), raf: 0, typed: 0 };
  rbSnd.drone(true); rbEpiGo(0); rbEpiS.raf = requestAnimationFrame(rbEpiLoop);
}
function rbEpiGo(k) {
  const E = rbEpiS; if (!E) return; if (k >= RB_EPI.length) return rbEpiClose();
  const f = RB_EPI[k], imgs = E.el.querySelectorAll('img'), prev = RB_EPI[E.k];
  E.k = k; E.t = 0; E.typed = 0;
  const same = prev && prev.img === f.img, im = same ? imgs[E.cur] : imgs[E.cur ^ 1];
  if (!same) { E.cur ^= 1; im.src = 'img/rbmk/epi-' + f.img + '.webp'; imgs.forEach(x => x.classList.toggle('on', x === im)); }
  if (E.anim) E.anim.cancel && !same && E.anim.cancel();
  if (im.animate) { E.anim = im.animate([{ transform: `scale(${f.kb[0]}) translate(${f.kb[2]},0)` }, { transform: `scale(${f.kb[1]}) translate(${f.kb[3]},0)` }], { duration: f.d * 1000, easing: 'linear', fill: 'forwards' }); if (E.paused) E.anim.pause(); }
  if (f.flash) { const fl = E.el.querySelector('.rb-epi-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); rbSnd.boom(1); E.el.classList.remove('shake'); void E.el.offsetWidth; E.el.classList.add('shake'); }
  E.el.querySelector('.rb-epi-st').textContent = f.stamp; E.el.querySelector('.rb-epi-t').textContent = '';
  E.el.querySelectorAll('.rb-epi-dots i').forEach((d, j) => d.classList.toggle('on', j <= k));
  const nb = E.el.querySelector('[data-epi="next"]'); if (nb) nb.innerHTML = f.last ? `К разбору ${ic('chevron-right')}` : `Дальше ${ic('chevron-right')}`;
}
function rbEpiLoop(now) {
  const E = rbEpiS; if (!E) return; const dt = Math.min(0.1, (now - E.last) / 1000); E.last = now;
  if (!E.paused) {
    E.t += dt; const f = RB_EPI[E.k], n = Math.min(f.t.length, Math.floor(E.t * 34));
    if (n !== E.typed) { E.typed = n; E.el.querySelector('.rb-epi-t').textContent = f.t.slice(0, n); }
    if (E.t > f.d) rbEpiGo(E.k + 1);
  }
  // искры и дым поверх кадров с пожаром, огоньки свечей в конце
  const cv = E.el.querySelector('.rb-epi-fx'); if (cv) {
    const W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d'), fx = (RB_EPI[E.k] || {}).fx; c.clearRect(0, 0, W, H);
    if (!E.paused && fx === 'fire') for (let i = 0; i < 3; i++) E.parts.push({ x: W * (0.42 + Math.random() * 0.38), y: H * (0.38 + Math.random() * 0.12), vx: (Math.random() - 0.3) * 30, vy: -40 - Math.random() * 80, life: 2 + Math.random() * 2.5, age: 0, r: 1 + Math.random() * 2.2, k: 'e' });
    if (!E.paused && fx === 'fire' && Math.random() < 0.15) E.parts.push({ x: W * (0.5 + Math.random() * 0.3), y: H * 0.35, vx: 8 + Math.random() * 10, vy: -12 - Math.random() * 10, life: 6, age: 0, r: 40 + Math.random() * 50, k: 's' });
    if (!E.paused && fx === 'calm' && Math.random() < 0.3) E.parts.push({ x: W * (0.1 + Math.random() * 0.8), y: H * (0.35 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 6, vy: -6 - Math.random() * 8, life: 4 + Math.random() * 3, age: 0, r: 1 + Math.random() * 1.5, k: 'e' });
    E.parts = E.parts.filter(p => (p.age += E.paused ? 0 : dt) < p.life);
    E.parts.forEach(p => {
      if (!E.paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx += Math.sin(p.age * 3 + p.y * 0.01) * 6 * dt; }
      const a = Math.sin(Math.PI * p.age / p.life);
      if (p.k === 'e') { c.fillStyle = `rgba(255,${150 + Math.floor(60 * a)},70,${0.85 * a})`; c.shadowColor = 'rgba(255,120,40,.9)'; c.shadowBlur = 8; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; }
      else { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (1 + p.age / 3)); g.addColorStop(0, `rgba(30,30,34,${0.22 * a})`); g.addColorStop(1, 'rgba(30,30,34,0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * (1 + p.age / 3), 0, Math.PI * 2); c.fill(); }
    });
  }
  E.raf = requestAnimationFrame(rbEpiLoop);
}
function rbEpiClose(silent) {
  const E = rbEpiS; if (!E) return; cancelAnimationFrame(E.raf); E.el.remove(); rbSnd.drone(false); rbEpiS = null;
  if (!silent && E.done) E.done();
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-epi]'); if (!b || !rbEpiS) return; const E = rbEpiS;
  if (b.dataset.epi === 'close') rbEpiClose();
  else if (b.dataset.epi === 'next') { const f = RB_EPI[E.k]; if (E.typed < f.t.length) { E.typed = f.t.length; E.t = Math.max(E.t, f.t.length / 34); E.el.querySelector('.rb-epi-t').textContent = f.t; } else rbEpiGo(E.k + 1); }
  else if (b.dataset.epi === 'pause') { E.paused = !E.paused; b.innerHTML = ic(E.paused ? 'play' : 'pause'); if (E.anim) E.paused ? E.anim.pause() : E.anim.play(); }
});
document.addEventListener('keydown', e => { if (!rbEpiS) return; if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); rbEpiClose(); } else if (e.code === 'Space' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); rbEpiS.el.querySelector('[data-epi="next"]').click(); } }, true);

/* ---------- электрическая часть: генераторы ТГ-7/8, синхронизация, собственные нужды 6 кВ, счётчики энергии ----------
   Номинальные 20 кВ и cos φ 0,85 — учебные значения (паспорт генераторов блока в открытых источниках не подтверждён). */
const RB_EL = { U: 20, cos: 0.85, Usec: 6.3, Ppump: 5.5 };
const RB_SEC = [[0, 1], [2, 3], [4, 5], [6, 7]];   // секции 6 кВ и их ГЦН: секции 1–2 — от ТГ-7, 3–4 — от ТГ-8
function rbElecNew() { return { tg: [0, 1].map(() => ({ rpm: 1, exc: true, ph: 0, gen: 0, out: 0, P: 0, U: 20, f: 50, I: 0, Q: 0, sync: false, own: 0 })), sec: ['tg', 'tg', 'tg', 'tg'], secU: [6.3, 6.3, 6.3, 6.3] }; }
const rbPumpI = q => RB_EL.Ppump * Math.pow(q.spin, 3) / (Math.sqrt(3) * RB_EL.Usec * 0.9) * 1000;   // ток ГЦН, А
function rbElecStep(h) {
  const G = RBG, S = G.S; if (!G.E) G.E = rbElecNew(); const E = G.E;
  const cut = i => G.hist && i === 1 && (G.hist.step === 'test' || G.hist.step === 'az');   // стопорные клапаны ТГ-8 закрыты — выбег
  const dtc = h * (S.acc || RB.TIME_ACC);
  E.tg.forEach((g, i) => {
    const steam = !cut(i) && S.P > 0.03 && !S.broken, drive = steam || S.tg[i].on && !cut(i);
    g.rpm += ((drive ? 1 : 0) - g.rpm) * (drive ? 0.5 : 0.008) * h;
    g.own = RB_SEC.reduce((a, pr, k) => a + (E.sec[k] === 'tg' && (k < 2) === (i === 0) ? pr.reduce((b, j) => b + RB_EL.Ppump * Math.pow(S.pumps[j].spin, 3), 0) : 0), 0);
    const grid = S.tg[i].on ? Math.max(0, S.tg[i].load) * 1000 * Math.min(1, S.P / 0.3 + 0.2) : 0;
    g.P = grid + (g.exc && g.rpm > 0.05 ? g.own : 0);
    g.f = S.tg[i].on ? 50 : 50 * g.rpm + (steam ? 0.12 * Math.sin(G.t * 0.15 + i * 2) : 0);
    g.U = g.exc ? RB_EL.U * Math.min(1, g.rpm) : 0;
    g.I = g.U > 0.5 ? g.P / (Math.sqrt(3) * g.U * RB_EL.cos) : 0;
    g.Q = g.P * Math.tan(Math.acos(RB_EL.cos));
    g.ph = S.tg[i].on ? 0 : (g.ph + (g.f - 50) * h * 2 * Math.PI + 2 * Math.PI) % (2 * Math.PI);
    g.sync = !S.tg[i].on && g.exc && steam && Math.abs(g.f - 50) < 0.06 && Math.cos(g.ph) > 0.94;
    g.gen += g.P * dtc / 3600; g.out += grid * dtc / 3600;
    if (S.tg[i].on && !g.exc) { S.tg[i].on = false; rbLog('bad', `ТГ-${i + 7} отключён защитой: потеря возбуждения.`); }
  });
  RB_SEC.forEach((pr, k) => {
    const g = E.tg[k < 2 ? 0 : 1], U = E.sec[k] === 'res' ? RB_EL.Usec : RB_EL.Usec * (g.exc ? Math.min(1, g.rpm) : 0);
    E.secU[k] = U;
    pr.forEach(j => { const q = S.pumps[j]; if (q.on && U < 4.4 && !cut(k < 2 ? 0 : 1)) { q.on = false; q.coast = true; rbLog('warn', `ГЦН-${j + 1}: пропало напряжение секции 6 кВ № ${k + 1} — насос на выбеге.`); } });
  });
}
// рисунок электрической панели поверх картинки (общий для 2D и 3D): 4 прибора на генератор, синхроноскоп, счётчики, мнемосхема
const RB_ELP = { g: [[163, 189], [371, 189], [579, 189], [786, 189], [1385, 189], [1592, 189], [1800, 189], [2008, 189]], sy: [1086, 211], cnt: [[274, 400], [679, 400], [1492, 400], [1897, 400]], lamp: [405, 455, 506], br: [[268, 540], [681, 540], [1491, 540], [1903, 540]], sec: [[372, 626], [579, 626], [1593, 626], [1800, 626]], res: [1086, 615] };
function rbElDial(c, x, y, v, txt, face, bad) {
  c.fillStyle = face; c.beginPath(); c.arc(x, y, 56, 0, Math.PI * 2); c.fill();
  const a = Math.PI * (0.75 + 1.5 * Math.max(0, Math.min(1, v)));
  c.fillStyle = '#374151'; c.font = '600 19px Arial'; c.textAlign = 'center'; c.fillText(txt, x, y + 38);
  c.strokeStyle = bad ? '#dc2626' : '#111827'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 66, y + Math.sin(a) * 66); c.stroke();
  c.fillStyle = '#111827'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
}
function rbElPanelDraw(c, base) {
  const G = RBG; if (!G || !G.E) return; const S = G.S, E = G.E, now = performance.now();
  c.drawImage(base, 0, 0);
  if (!c._face) { const p = c.getImageData(RB_ELP.g[0][0] - 45, RB_ELP.g[0][1] + 45, 1, 1).data; c._face = `rgb(${p[0]},${p[1]},${p[2]})`; }
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');
  E.tg.forEach((g, i) => {
    const o = i * 4, vals = [[g.I / 20, fmt(g.I, 1) + ' кА', g.I > 18.5], [g.U / 24, fmt(g.U, 1) + ' кВ', g.U < 18 && g.rpm > 0.1 && g.exc], [g.P / 600, Math.round(g.P) + ' МВт', g.P > 520], [(g.f - 45) / 10, fmt(g.f, 2) + ' Гц', g.U > 1 && Math.abs(g.f - 50) > 0.5]];
    vals.forEach(([v, t, bad], k) => rbElDial(c, RB_ELP.g[o + k][0], RB_ELP.g[o + k][1], v, t, c._face, bad));
    [[g.gen, RB_ELP.cnt[i * 2]], [g.out, RB_ELP.cnt[i * 2 + 1]]].forEach(([val, [x, y]]) => {
      c.fillStyle = '#0b0d10'; c.fillRect(x - 136, y - 36, 272, 72);
      const s = String(Math.floor(val)).padStart(7, '0').slice(-7), fr = val % 1;
      for (let d = 0; d < 7; d++) { const dx = x - 126 + d * 36; c.fillStyle = d === 6 ? '#7f1d1d' : '#1f2329'; c.fillRect(dx, y - 28, 31, 56); c.fillStyle = '#f3f4f6'; c.font = '700 38px "Courier New", monospace'; c.textAlign = 'center';
        if (d === 6) { const n = +s[6], off = fr * 46; c.save(); c.beginPath(); c.rect(dx, y - 28, 31, 56); c.clip(); c.fillText(String(n), dx + 15.5, y + 13 - off); c.fillText(String((n + 1) % 10), dx + 15.5, y + 59 - off); c.restore(); }
        else c.fillText(s[d], dx + 15.5, y + 13); }
    });
    const br = (on, [x, y]) => { c.fillStyle = on ? 'rgba(34,197,94,.85)' : 'rgba(220,38,38,.85)'; c.fillRect(x - 21, y - 21, 42, 42); };
    br(S.tg[i].on, RB_ELP.br[i * 2]); br(g.exc, RB_ELP.br[i * 2 + 1]);
  });
  RB_ELP.sec.forEach(([x, y], k) => { const U = E.secU[k]; c.fillStyle = U > 5.5 ? (E.sec[k] === 'res' ? '#f59e0b' : '#22c55e') : U > 1 ? '#f59e0b' : '#dc2626'; c.fillRect(x - 13, y - 13, 26, 26); });
  c.fillStyle = E.sec.includes('res') ? '#f59e0b' : '#4b5563'; c.fillRect(RB_ELP.res[0] - 13, RB_ELP.res[1] - 13, 26, 26);
  // синхроноскоп: показывает генератор, который не в сети
  const k = E.tg.findIndex((g, i) => !S.tg[i].on && g.exc && g.rpm > 0.3), [sx, sy] = RB_ELP.sy;
  c.fillStyle = c._face; c.beginPath(); c.arc(sx, sy, 96, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#374151'; c.font = '600 20px Arial'; c.textAlign = 'center'; c.fillText(k < 0 ? 'синхроноскоп' : 'ТГ-' + (k + 7) + ' → сеть', sx, sy + 56);
  const a = -Math.PI / 2 + (k < 0 ? 0 : E.tg[k].ph);
  c.strokeStyle = k >= 0 && E.tg[k].sync ? '#15803d' : '#111827'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 100, sy + Math.sin(a) * 100); c.stroke();
  c.fillStyle = '#111827'; c.beginPath(); c.arc(sx, sy, 12, 0, Math.PI * 2); c.fill();
  const lit = [k >= 0, k >= 0 && E.tg[k].sync, E.tg.some((g, i) => !S.tg[i].on && g.rpm < 0.97 && g.rpm > 0.05)];
  lit.forEach((on, j) => { if (!on || (j === 2 && Math.floor(now / 500) % 2)) { c.fillStyle = 'rgba(0,0,0,.62)'; c.fillRect(RB_ELP.sy[0] - 20, RB_ELP.lamp[j] - 20, 40, 40); } });
}
// ключи электрического пульта: [ТГ-7 выключатель, ТГ-7 возбуждение, секция 1, секция 2 | ТГ-8 …]
const RB_KEYS = { lx: [209, 420, 635, 850, 1441, 1654, 1869, 2082], gy: 188, ry: 242 };
const rbKeyState = k => { const G = RBG, S = G.S, E = G.E, i = k < 4 ? 0 : 1, j = k % 4; return j === 0 ? S.tg[i].on : j === 1 ? E.tg[i].exc : E.sec[i * 2 + j - 2] === 'tg'; };
const rbKeyCmd = k => { const i = k < 4 ? 0 : 1, j = k % 4; return j === 0 ? ['tgsw', i] : j === 1 ? ['exc', i] : ['sec', i * 2 + j - 2]; };
const RB_KEYN = k => { const i = k < 4 ? 0 : 1, j = k % 4; return j === 0 ? `Выключатель ТГ-${i + 7}` : j === 1 ? `Возбуждение ТГ-${i + 7}` : `Секция 6 кВ № ${i * 2 + j - 1}: питание`; };
function rbElKeysDraw(c, base) {
  const G = RBG; if (!G || !G.E) return; c.drawImage(base, 0, 0);
  if (!c._plate) { const p = c.getImageData(RB_KEYS.lx[0] - 150, 165, 1, 1).data; c._plate = `rgb(${p[0]},${p[1]},${p[2]})`; }
  RB_KEYS.lx.forEach((lx, k) => {
    const on = rbKeyState(k), px = lx - 81, py = 205;
    c.fillStyle = c._plate; c.fillRect(lx - 152, 150, 120, 150);
    c.save(); c.translate(px, py); c.fillStyle = '#16191e'; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3b4250'; c.lineWidth = 3; c.stroke();
    c.rotate(on ? -Math.PI / 3 : 0); c.fillStyle = '#23272e'; c.beginPath(); c.roundRect ? c.roundRect(-15, -6, 30, 92, 8) : c.rect(-15, -6, 30, 92); c.fill(); c.strokeStyle = '#9ca3af'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 74); c.stroke();
    c.fillStyle = '#0b0d10'; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill(); c.restore();
    c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(lx, on ? RB_KEYS.ry : RB_KEYS.gy, 17, 0, Math.PI * 2); c.fill();
  });
}
// шкафы 6 кВ: в окошке — напряжение и токи; лампы — состояние
const RB_CAB = [190, 546, 902, 1268, 1626, 1983];
function rbElCabDraw(c, base) {
  const G = RBG; if (!G || !G.E) return; const S = G.S, E = G.E; c.drawImage(base, 0, 0);
  RB_CAB.forEach((x, k) => {
    c.fillStyle = '#0b1220'; c.fillRect(x - 96, 92, 192, 72); c.fillStyle = '#86efac'; c.font = '700 22px "Courier New", monospace'; c.textAlign = 'center';
    let l1, l2, st;
    if (k < 4) { const U = E.secU[k]; l1 = 'C' + (k + 1) + ' ' + U.toFixed(1) + 'кВ'; l2 = RB_SEC[k].map(j => Math.round(rbPumpI(S.pumps[j])) + 'А').join(' '); st = U > 5.5 ? (E.sec[k] === 'res' ? 2 : 0) : U > 1 ? 2 : 1; }
    else if (k === 4) { l1 = 'ПЭН ' + S.fwPumps.filter(Boolean).length + '/3'; l2 = Math.round(S.fw * 100) + '%'; st = S.fwPumps.filter(Boolean).length >= 2 ? 0 : 2; }
    else { l1 = 'РТСН 6,3кВ'; l2 = E.sec.filter(s => s === 'res').length + ' секц.'; st = E.sec.includes('res') ? 2 : 0; }
    c.fillText(l1, x, 122); c.fillText(l2, x, 152);
    [-69, 0, 69].forEach((dx, j) => { if (j !== st) { c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(x + dx, 233, 27, 0, Math.PI * 2); c.fill(); } });
  });
}
/* ---------- 2D: вкладка «Электрика» ---------- */
let rbElImg = {};
function rbElImgs() { ['elec-panel', 'elec-keys', 'elec-cab'].forEach(n => { if (!rbElImg[n]) { const im = new Image(); im.src = 'img/rbmk3d/' + n + '.webp'; rbElImg[n] = im; } }); }
function rbElecHtml() {
  rbElImgs();
  const gen = i => `<section class="rb-p rb-elg"><h3>${ic('zap')} Турбогенератор ТГ-${i + 7}</h3><div class="r3-live" id="rb-elr${i}"></div>
    <div class="rb-rowb"><button class="btn line" data-rb="tgsw" data-v="${i}" id="rb-tgsw${i}">—</button><button class="btn line" data-rb="exc" data-v="${i}" id="rb-exc${i}">—</button></div></section>`;
  return `<div class="rb-elv">
    <section class="rb-p rb-elp"><h3>${ic('gauge')} Электрическая часть блочного щита <span class="mute small">слева ТГ-7, справа ТГ-8: ток статора, напряжение, активная мощность, частота · в центре синхроноскоп · в окошках выработано и отпущено, МВт·ч</span></h3><canvas id="rb-elcv" width="2172" height="724"></canvas></section>
    <section class="rb-p rb-elp"><h3>${ic('sliders-horizontal')} Пульт ключей <span class="mute small">щёлкните по ключу: выключатели ТГ-7 и ТГ-8, возбуждение, питание секций 6 кВ (зелёная лампа — от генератора, красная — от резерва)</span></h3><canvas id="rb-elkeys" width="2172" height="470" class="rb-click"></canvas></section>
    ${gen(0)}${gen(1)}
    <section class="rb-p rb-elp"><h3>${ic('zap')} Шкафы собственных нужд 6 кВ <span class="mute small">щёлкните по шкафу секции — перевод на резерв и обратно</span></h3><canvas id="rb-elcab" width="2172" height="724" class="rb-click"></canvas></section>
    <section class="rb-p rb-els"><h3>${ic('zap')} Собственные нужды 6 кВ</h3><div id="rb-elsec"></div><p class="mute small">Секции 1–2 питаются от ТГ-7, 3–4 — от ТГ-8 через трансформаторы собственных нужд. Резерв — от резервного трансформатора (РТСН). Номинальные 20 кВ и cos φ 0,85 — учебные значения.</p></section>
  </div>`;
}
function rbElecTick() {
  const G = RBG; if (!G || !G.E || G.view !== 'elec') return; const S = G.S, E = G.E, cv = $('#rb-elcv');
  const ok = n => rbElImg[n] && rbElImg[n].complete && rbElImg[n].naturalWidth;
  if (cv && ok('elec-panel')) rbElPanelDraw(cv.getContext('2d'), rbElImg['elec-panel']);
  const kc = $('#rb-elkeys'); if (kc && ok('elec-keys')) rbElKeysDraw(kc.getContext('2d'), rbElImg['elec-keys']);
  const cc = $('#rb-elcab'); if (cc && ok('elec-cab')) rbElCabDraw(cc.getContext('2d'), rbElImg['elec-cab']);
  const f = (v, d) => v.toFixed(d).replace('.', ',');
  E.tg.forEach((g, i) => {
    const r = $('#rb-elr' + i); if (r) { const h = r3Row('Выключатель', S.tg[i].on ? 'включён, в сети' : 'отключён', S.tg[i].on ? '' : 'bad') + r3Row('Ток статора', f(g.I, 2) + ' кА') + r3Row('Напряжение', f(g.U, 1) + ' кВ') + r3Row('Активная мощность', Math.round(g.P) + ' МВт') + r3Row('Реактивная', Math.round(g.Q) + ' Мвар') + r3Row('cos φ', g.P > 1 ? '0,85' : '—') + r3Row('Частота', f(g.f, 2) + ' Гц', g.U > 1 && Math.abs(g.f - 50) > 0.5 ? 'bad' : '') + r3Row('Собственные нужды', f(g.own, 1) + ' МВт') + r3Row('Выработано / отпущено', f(g.gen, 1) + ' / ' + f(g.out, 1) + ' МВт·ч') + (S.tg[i].on ? '' : r3Row('Синхронизм', g.sync ? 'есть — можно включать' : 'нет', g.sync ? '' : 'bad')); if (r.innerHTML !== h) r.innerHTML = h; }
    const b = $('#rb-tgsw' + i); if (b) { const t = S.tg[i].on ? 'Отключить от сети' : 'Включить в сеть'; if (b.textContent !== t) b.textContent = t; b.classList.toggle('on', S.tg[i].on); b.classList.toggle('sync', !S.tg[i].on && g.sync); }
    const x = $('#rb-exc' + i); if (x) { const t = g.exc ? 'Возбуждение: вкл' : 'Возбуждение: выкл'; if (x.textContent !== t) x.textContent = t; x.classList.toggle('on', g.exc); }
  });
  const sb = $('#rb-elsec'); if (sb) { const h = RB_SEC.map((pr, k) => `<div class="rb-secr"><b>Секция ${k + 1}</b><span>${E.sec[k] === 'tg' ? 'от ТГ-' + (k < 2 ? 7 : 8) : 'от резерва'}</span><span class="${E.secU[k] < 5.5 ? 'bad' : ''}">${f(E.secU[k], 2)} кВ</span><span>${pr.map(j => `ГЦН-${j + 1}: ${Math.round(rbPumpI(S.pumps[j]))} А`).join(' · ')}</span><button class="btn line" data-rb="sec" data-v="${k}">${E.sec[k] === 'tg' ? 'На резерв' : 'На ТГ-' + (k < 2 ? 7 : 8)}</button></div>`).join(''); if (sb._h !== h) { sb._h = h; sb.innerHTML = h; } }
}
// щелчки по картинкам пульта ключей и шкафов во вкладке «Электрика»
document.addEventListener('click', e => {
  const cv = e.target.closest && e.target.closest('#rb-elkeys, #rb-elcab'); if (!cv || !RBG || RBG.done) return;
  const r = cv.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  if (cv.id === 'rb-elkeys') { if (v > 0.75) return; let k = 0, best = 9; RB_KEYS.lx.forEach((x, j) => { const d = Math.abs(x / 2172 - 0.03 - u); if (d < best) { best = d; k = j; } }); if (best < 0.06) { const [rb, val] = rbKeyCmd(k); r3Cmd(rb, val); } }
  else { const k = Math.max(0, Math.min(5, Math.floor(u * 6))); if (k < 4) r3Cmd('sec', k); else toast(k === 4 ? 'Питательными насосами управляют кнопки ПЭН на основном пульте.' : 'Резервный трансформатор всегда под напряжением 6,3 кВ: переводите на него секции 1–4.'); }
  RBG._elAt = 0;
});
// подсказка под курсором над ключами
document.addEventListener('mousemove', e => {
  const cv = e.target.closest && e.target.closest('#rb-elkeys'); if (!cv || !RBG) return;
  const r = cv.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height; let k = -1, best = 0.06;
  if (v < 0.75) RB_KEYS.lx.forEach((x, j) => { const d = Math.abs(x / 2172 - 0.03 - u); if (d < best) { best = d; k = j; } });
  const t = k < 0 ? '' : RB_KEYN(k) + (rbKeyState(k) ? (k % 4 > 1 ? ': от ТГ' : ': включено') : (k % 4 > 1 ? ': от резерва' : ': отключено')); if (cv.title !== t) cv.title = t; cv.style.cursor = k < 0 ? '' : 'pointer';
});
