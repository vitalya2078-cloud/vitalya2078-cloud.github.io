(() => {
  const loading = document.getElementById("loading");
  const game = document.getElementById("game");
  const commonUi = document.getElementById("common-ui");
  const progress = document.getElementById("progress");
  const percent = document.getElementById("percent");
  const core = document.querySelector(".core-button");
  const musicElement = document.getElementById("core-music");
  const subScreens = document.querySelectorAll(".sub-screen");
  const navItems = document.querySelectorAll(".nav-item");
  const backButton = document.querySelector(".header-back");
  const avatarButton = document.querySelector(".avatar-button");

  let current = 0;
  const timer = setInterval(() => {
    current += Math.random() * 7 + 3;
    if (current >= 100) {
      current = 100;
      clearInterval(timer);
      setTimeout(() => {
        loading.classList.add("hidden");
        game.classList.remove("hidden");
        commonUi.classList.remove("hidden");
      }, 500);
    }
    progress.style.width = current + "%";
    percent.textContent = Math.floor(current);
  }, 110);

  // ===== HAPTICS =====
  function getSettings() {
    try { return JSON.parse(localStorage.getItem("neonCoreSettings") || "null") || {}; }
    catch { return {}; }
  }

  let lastHaptic = 0;
  function vibrate(ms = 10) {
    const settings = getSettings();
    if (settings.vibration === false || !navigator.vibrate) return;
    const now = performance.now();
    if (now - lastHaptic < 90) return; // один отклик на одно действие
    lastHaptic = now;
    try { navigator.vibrate(ms); } catch {}
  }
  window.neonVibrate = vibrate;

  // ===== CORE AUDIO — Web Audio API =====
  // MediaElement/cloneNode на некоторых мобильных Chromium-сборках,
  // включая отдельные версии Яндекс Браузера, может молча отклонять play().
  // Web Audio после реального пользовательского жеста надёжнее.
  const audioFiles = {
    ambient: "audio/core-ambient-seamless.wav",
    tap: "audio/tap.wav",
    tap_heavy: "audio/tap_heavy.wav",
    tab: "audio/tab.wav",
    back: "audio/back.wav",
    upgrade: "audio/upgrade.wav",
    reward: "audio/reward.wav",
    charge: "audio/charge.wav"
  };
  let audioContext = null;
  let masterGain = null;
  let musicGain = null;
  let musicBuffer = null;
  let musicSource = null;
  const sfxBuffers = {};
  let audioReady = false;
  let audioLoading = null;

  function audioVolume(multiplier = 1) {
    const settings = getSettings();
    return Math.max(0, Math.min(1, ((Number(settings.volume ?? 70) || 0) / 100) * multiplier));
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
      masterGain = audioContext.createGain();
      musicGain = audioContext.createGain();
      musicGain.connect(masterGain);
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = 1;
    }
    return audioContext;
  }

  async function loadBuffer(name, url) {
    if (name === "ambient" && musicBuffer) return musicBuffer;
    if (name !== "ambient" && sfxBuffers[name]) return sfxBuffers[name];
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);
      if (name === "ambient") musicBuffer = buffer;
      else sfxBuffers[name] = buffer;
      return buffer;
    } catch (error) {
      console.warn("CORE audio load failed:", name, error);
      return null;
    }
  }

  async function prepareAudio() {
    if (audioLoading) return audioLoading;
    audioLoading = (async () => {
      const ctx = ensureAudioContext();
      if (!ctx) return false;
      try { await ctx.resume(); } catch {}
      const settings = getSettings();
      const jobs = Object.entries(audioFiles)
        
        .map(([name, url]) =>
          (name === "ambient" ? (settings.music === false ? Promise.resolve(null) : loadBuffer(name, url)) : (settings.sounds === false ? Promise.resolve(null) : loadBuffer(name, url)))
        );
      await Promise.all(jobs);
      audioReady = true;
      syncMusic();
      return true;
    })();
    try { return await audioLoading; }
    finally { audioLoading = null; }
  }

  async function unlockAudio() {
    const ctx = ensureAudioContext();
    if (!ctx) return false;
    try { await ctx.resume(); } catch {}
    if (musicElement) syncMusic();
    prepareAudio();
    return true;
  }

  function stopMusic() {
    if (!musicSource) return;
    try { musicSource.stop(); } catch {}
    try { musicSource.disconnect(); } catch {}
    musicSource = null;
  }

  function syncMusic() {
    const settings = getSettings();
    const volume = audioVolume(.28);
    if (!musicGain || !audioContext) return;
    musicGain.gain.setTargetAtTime(settings.music === false ? 0 : volume, audioContext.currentTime, .08);
    if (settings.music === false || !musicBuffer || musicSource) return;
    try {
      if (audioContext.state !== "running") audioContext.resume().catch(() => {});
      musicSource = audioContext.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true;
      musicSource.connect(musicGain);
      musicSource.start(0);
    } catch (error) {
      console.warn("CORE music start failed:", error);
      musicSource = null;
    }
  }

  function synthSfx(name, multiplier = .55) {
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const freq = {
      tap: 520, tap_heavy: 760, tab: 330, back: 250,
      upgrade: 620, reward: 880, charge: 180
    }[name] || 440;
    osc.type = name === "charge" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    if (name === "charge") osc.frequency.exponentialRampToValueAtTime(620, now + .22);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(110, freq * .72), now + .09);
    filter.type = "lowpass";
    filter.frequency.value = name === "tap_heavy" ? 3200 : 2600;
    gain.gain.setValueAtTime(Math.max(.001, audioVolume(multiplier)), now);
    gain.gain.exponentialRampToValueAtTime(.001, now + (name === "charge" ? .28 : .11));
    osc.connect(filter).connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + (name === "charge" ? .3 : .12));
  }

  function playSfx(name, multiplier = .55) {
    const settings = getSettings();
    if (settings.sounds === false || !audioContext) return;
    if (!sfxBuffers[name]) { synthSfx(name, multiplier); return; }
    try {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = sfxBuffers[name];
      gain.gain.value = audioVolume(multiplier);
      source.connect(gain).connect(masterGain);
      source.start(0);
      source.addEventListener?.("ended", () => {
        try { source.disconnect(); gain.disconnect(); } catch {}
      }, { once: true });
    } catch { synthSfx(name, multiplier); }
  }

  // Первый реальный жест пользователя одновременно разблокирует звук и музыку.
  const firstGesture = () => { unlockAudio(); };
  document.addEventListener("pointerdown", firstGesture, { passive: true, once: true });
  document.addEventListener("keydown", firstGesture, { passive: true, once: true });

  // ===== ПЛАВНОЕ ВРАЩЕНИЕ ЯДРА =====
  let lastTap = 0;
  let tapMomentum = 1;
  let angleA = 32;
  let angleB = -54;
  let angleC = 71;
  let previousFrame = performance.now();

  function applyCoreRotation(now) {
    const dt = Math.min(40, now - previousFrame) / 1000;
    previousFrame = now;
    const body = document.body;
    const motionScale = body.classList.contains("settings-no-animation") ? 0 : body.classList.contains("settings-reduced-motion") ? .16 : body.classList.contains("settings-battery-saver") ? .45 : 1;
    const speed = tapMomentum * motionScale;
    angleA = (angleA + 42 * speed * dt) % 360;
    angleB = (angleB - 35 * speed * dt) % 360;
    angleC = (angleC + 50 * speed * dt) % 360;
    const atomA = core?.querySelector(".core-atom-a");
    const atomB = core?.querySelector(".core-atom-b");
    const atomC = core?.querySelector(".core-atom-c");
    if (atomA) atomA.style.transform = `rotate(${angleA}deg) rotateX(66deg)`;
    if (atomB) atomB.style.transform = `rotate(${angleB}deg) rotateY(64deg)`;
    if (atomC) atomC.style.transform = `rotate(${angleC}deg) rotateX(62deg)`;
    requestAnimationFrame(applyCoreRotation);
  }
  requestAnimationFrame(applyCoreRotation);

  // ===== CORE ECONOMY 0.6.2 =====
  // Базовая экономика: мягкая валюта ENERGY, один основной источник прогрессии — уровень ядра.
  // Старт рассчитан так, чтобы первое улучшение было достижимо почти сразу,
  // но следующий уровень уже требовал небольшого цикла активной игры.
  const GAME_KEY = "coreGameStateV3";
  const ECONOMY = {
    startEnergy: 100,
    startLevel: 1,
    baseProduction: 2,
    baseTap: 3,
    upgradeBaseCost: 75,
    upgradeGrowth: 1.34,
    moduleCosts: { auto: 250, tap: 200, combo: 350, offline: 500 },
    moduleGrowth: { auto: 1.68, tap: 1.55, combo: 1.55, offline: 1.55 },
    moduleMaxLevel: 5,
    autoRates: [0, 0.35, 0.72, 1.20, 1.85, 2.65],
    offlineCapHours: 8,
    offlineEfficiency: 0.50,
    offlineGainCapFraction: 0.60,
    comboWindowMs: 720,
    comboResetMs: 1500,
    comboStep: 10,
    comboBonus: 0.10,
    comboMax: 2.0
  };

  const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
  function formatEnergy(value) {
    const n = Math.max(0, Number(value) || 0);
    return numberFormat.format(Math.floor(n));
  }
  function formatRate(value) {
    const n = Math.max(0, Number(value) || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
  }
  function moduleLevel(key) {
    const levels = gameState?.moduleLevels || {};
    const raw = Number(levels[key]);
    if (Number.isFinite(raw)) return Math.max(0, Math.min(ECONOMY.moduleMaxLevel, Math.floor(raw)));
    return gameState?.modules?.[key] ? 1 : 0;
  }
  function moduleCost(key, nextLevel = moduleLevel(key) + 1) {
    const base = ECONOMY.moduleCosts[key] || 999999;
    return Math.round(base * Math.pow(ECONOMY.moduleGrowth[key] || 1.55, Math.max(0, nextLevel - 1)));
  }
  function productionForLevel(level) {
    const l = Math.max(1, Number(level) || 1);
    const autoLevel = moduleLevel("auto");
    if (!autoLevel) return 0;
    const autoRate = ECONOMY.autoRates[autoLevel] || ECONOMY.autoRates[ECONOMY.moduleMaxLevel];
    const coreBonus = autoRate * (0.10 * Math.pow(Math.max(0, l - 1), 0.72));
    return autoRate + coreBonus;
  }
  function tapPowerForLevel(level) {
    const l = Math.max(1, Number(level) || 1);
    const amplifier = moduleLevel("tap");
    return ECONOMY.baseTap + amplifier + (l <= 1 ? 0 : Math.floor(1.4 * Math.pow(l - 1, 1.18)));
  }
  function comboMaxForLevel(level) {
    const base = 1.2 + Math.floor(Math.max(0, level - 1) / 5) * 0.2;
    const moduleBonus = moduleLevel("combo") * 0.10;
    return Math.min(2.0, base + moduleBonus);
  }
  function upgradeCost(level) {
    const l = Math.max(1, Number(level) || 1);
    return Math.round(ECONOMY.upgradeBaseCost * Math.pow(ECONOMY.upgradeGrowth, l - 1));
  }
  function defaultGameState() {
    return {
      energy: ECONOMY.startEnergy,
      coreLevel: ECONOMY.startLevel,
      totalTapped: 0,
      totalProduced: 0,
      upgradesBought: 0,
      modules: { auto: false, tap: false, combo: false, offline: false },
      moduleLevels: { auto: 0, tap: 0, combo: 0, offline: 0 },
      comboCount: 0,
      comboMultiplier: 1,
      lastTapAt: 0,
      lastSavedAt: Date.now(),
      lastOfflineGain: 0
    };
  }
  function loadGameState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GAME_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaultGameState();
      const merged = { ...defaultGameState(), ...parsed };
      merged.modules = { ...defaultGameState().modules, ...(parsed.modules || {}) };
      merged.moduleLevels = { ...defaultGameState().moduleLevels, ...(parsed.moduleLevels || {}) };
      Object.keys(merged.moduleLevels).forEach(key => {
        const hadLevelData = parsed.moduleLevels && Object.prototype.hasOwnProperty.call(parsed.moduleLevels, key);
        if (!hadLevelData && merged.modules[key]) merged.moduleLevels[key] = 1;
        if (!Number.isFinite(Number(merged.moduleLevels[key]))) merged.moduleLevels[key] = merged.modules[key] ? 1 : 0;
        merged.moduleLevels[key] = Math.max(0, Math.min(ECONOMY.moduleMaxLevel, Math.floor(Number(merged.moduleLevels[key]))));
        merged.modules[key] = merged.moduleLevels[key] > 0;
      });
      return merged;
    } catch { return defaultGameState(); }
  }
  let gameState = loadGameState();
  function grantOfflineProduction(now = Date.now()) {
    if (!gameState.modules?.auto) {
      gameState.lastOfflineGain = 0;
      gameState.lastSavedAt = now;
      return 0;
    }
    const elapsed = Math.max(0, (now - Number(gameState.lastSavedAt || now)) / 1000);
    const offlineLevel = moduleLevel("offline");
    const hours = ECONOMY.offlineCapHours + offlineLevel * 2;
    const efficiency = Math.min(0.95, ECONOMY.offlineEfficiency + offlineLevel * 0.06);
    const capFraction = Math.min(1.0, ECONOMY.offlineGainCapFraction + offlineLevel * 0.08);
    const seconds = Math.min(hours * 3600, elapsed);
    const rawGain = productionForLevel(gameState.coreLevel) * seconds * efficiency;
    const gainCap = upgradeCost(gameState.coreLevel) * capFraction;
    const gain = Math.min(rawGain, gainCap);
    if (gain >= 1) {
      gameState.energy += gain;
      gameState.totalProduced += gain;
      gameState.lastOfflineGain = gain;
    } else {
      gameState.lastOfflineGain = 0;
    }
    gameState.lastSavedAt = now;
    return gain;
  }
  const offlineGain = grantOfflineProduction();
  // Сессионные параметры комбо не переносятся между запусками.
  gameState.lastTapAt = 0;
  gameState.comboCount = 0;
  gameState.comboMultiplier = 1;

  function saveGameState() {
    gameState.lastSavedAt = Date.now();
    localStorage.setItem(GAME_KEY, JSON.stringify(gameState));
  }

  const balanceEl = document.getElementById("balance");
  const productionEl = document.getElementById("production-value");
  const coreLevelEl = document.getElementById("core-level");
  const playerLevelEl = document.getElementById("player-level");
  const profileBalanceEl = document.getElementById("profile-balance");
  const profileCoreLevelEl = document.getElementById("profile-core-level");
  const upgradeLevelEl = document.getElementById("upgrade-level");
  const upgradeNextEl = document.getElementById("upgrade-next-level");
  const upgradeProductionEl = document.getElementById("upgrade-production");
  const upgradeTapEl = document.getElementById("upgrade-tap");
  const upgradeCostEl = document.getElementById("upgrade-cost");
  const upgradeBuyEl = document.getElementById("upgrade-buy");
  const upgradeNoteEl = document.getElementById("upgrade-note");
  const upgradeEnergyChipEl = document.getElementById("upgrade-energy-chip");
  const moduleCards = document.querySelectorAll(".upgrade-card");

  function renderEconomy() {
    const level = gameState.coreLevel;
    const prod = productionForLevel(level);
    const tap = tapPowerForLevel(level);
    const nextProd = productionForLevel(level + 1);
    const nextTap = tapPowerForLevel(level + 1);
    const cost = upgradeCost(level);
    const canUpgrade = gameState.energy >= cost;

    if (balanceEl) balanceEl.textContent = formatEnergy(gameState.energy);
    if (productionEl) productionEl.textContent = "+" + formatRate(prod);
    if (coreLevelEl) coreLevelEl.textContent = level;
    if (playerLevelEl) playerLevelEl.textContent = level;
    if (profileBalanceEl) profileBalanceEl.textContent = formatEnergy(gameState.energy);
    if (profileCoreLevelEl) profileCoreLevelEl.textContent = level;
    if (upgradeLevelEl) upgradeLevelEl.textContent = level;
    if (upgradeNextEl) upgradeNextEl.textContent = level + 1;
    if (upgradeProductionEl) upgradeProductionEl.textContent = `${formatRate(prod)} → ${formatRate(nextProd)} / СЕК`;
    if (upgradeTapEl) upgradeTapEl.textContent = `${formatRate(tap)} → ${formatRate(nextTap)}`;
    if (upgradeCostEl) upgradeCostEl.textContent = formatEnergy(cost);
    if (upgradeBuyEl) {
      upgradeBuyEl.disabled = !canUpgrade;
      upgradeBuyEl.classList.toggle("is-ready", canUpgrade);
    }
    if (upgradeNoteEl) {
      upgradeNoteEl.textContent = canUpgrade
        ? "Ядро готово к усилению. Уровень повышает ручную добычу; автодобыча приобретается отдельно."
        : `Не хватает ${formatEnergy(cost - gameState.energy)} энергии до следующего уровня.`;
    }
    renderModules();
  }

  function renderModules() {
    if (upgradeEnergyChipEl) upgradeEnergyChipEl.textContent = formatEnergy(gameState.energy);
    const moduleNames = { auto:"АВТОДОБЫЧА", tap:"ИМПУЛЬСНЫЙ УСИЛИТЕЛЬ", combo:"КОМБО-МАТРИЦА", offline:"КОНТУР ХРАНЕНИЯ" };
    const moduleDescriptions = {
      auto:"Пассивная добыча энергии. Следующий уровень повышает скорость.",
      tap:"Увеличивает энергию за каждый ручной импульс.",
      combo:"Повышает потолок бонуса серии тапов.",
      offline:"Увеличивает время, эффективность и лимит офлайн-накопления."
    };
    moduleCards.forEach(card => {
      const key = card.dataset.module;
      const level = moduleLevel(key);
      const maxed = level >= ECONOMY.moduleMaxLevel;
      const price = maxed ? 0 : moduleCost(key, level + 1);
      card.classList.toggle("owned", level > 0);
      card.classList.toggle("is-ready", !maxed && gameState.energy >= price);
      card.classList.toggle("is-maxed", maxed);
      const title=card.querySelector(".module-title"), desc=card.querySelector(".module-desc");
      const bottom=card.querySelector(".module-price"), em=card.querySelector(".module-price")?.nextElementSibling;
      const levelEl=card.querySelector(".module-level");
      if(title) title.textContent=moduleNames[key]||key;
      if(desc) desc.textContent=moduleDescriptions[key]||"";
      if(levelEl) levelEl.textContent=`УР. ${level}/${ECONOMY.moduleMaxLevel}`;
      if(bottom) bottom.textContent=maxed?"МАКС":formatEnergy(price);
      if(em) em.textContent=maxed?"УРОВЕНЬ":(level?"СЛЕД. УРОВЕНЬ":"ЭНЕРГИИ");
    });
  }

  function showTapNumber(amount, critical = false) {
    if (getSettings().numberEffects === false) return;
    const layer = document.getElementById("tap-feedback");
    if (!layer) return;
    const item = document.createElement("span");
    item.className = "tap-number" + (critical ? " critical" : "");
    item.textContent = `+${formatEnergy(amount)}`;
    item.style.left = `${42 + Math.random() * 16}%`;
    item.style.top = `${42 + Math.random() * 10}%`;
    layer.appendChild(item);
    setTimeout(() => item.remove(), 800);
  }

  function doCoreTap() {
    const now = performance.now();
    const gap = gameState.lastTapAt ? now - gameState.lastTapAt : 9999;
    if (gap <= ECONOMY.comboWindowMs) {
      gameState.comboCount += 1;
    } else {
      gameState.comboCount = 1;
    }
    gameState.lastTapAt = now;
    const comboSteps = Math.floor(gameState.comboCount / ECONOMY.comboStep);
    gameState.comboMultiplier = Math.min(comboMaxForLevel(gameState.coreLevel), 1 + comboSteps * ECONOMY.comboBonus);
    const baseTap = tapPowerForLevel(gameState.coreLevel);
    const amount = baseTap * gameState.comboMultiplier;
    gameState.energy += amount;
    gameState.totalTapped += amount;
    const critical = gameState.comboMultiplier > 1 && gameState.comboCount % ECONOMY.comboStep === 0;
    showTapNumber(amount, critical);
    return { amount, critical, gap };
  }

  core?.addEventListener("click", () => {
    const result = doCoreTap();
    const { gap, critical } = result;
    const intensity = Math.max(0, Math.min(1, (520 - gap) / 420));
    const target = 1 + intensity * 3.8;
    tapMomentum = tapMomentum * 0.45 + target * 0.55;
    playSfx(gap < 190 ? "tap_heavy" : "tap", gap < 190 ? .65 : .5);
    if (critical) playSfx("charge", .16);
    const liveSettings = getSettings();
    core.classList.toggle("critical-hit", liveSettings.criticalEffects !== false && critical);
    core.classList.remove("core-hit");
    void core.offsetWidth;
    core.classList.add("core-hit");
    if (!document.body.classList.contains("settings-no-animation")) {
      try {
        core.animate(
          [
            { transform:"scale(1)", filter:"brightness(1)" },
            { transform:"scale(.90)", filter:"brightness(1.22)" },
            { transform:"scale(1.045)", filter:"brightness(1.08)" },
            { transform:"scale(1)", filter:"brightness(1)" }
          ],
          { duration:270, easing:"cubic-bezier(.2,.8,.2,1)", fill:"none" }
        );
      } catch {}
    }
    renderEconomy();
    saveGameState();
  });

  moduleCards.forEach(card => {
    card.addEventListener("click", async () => {
      const key=card.dataset.module;
      if(!key) return;
      const currentLevel=moduleLevel(key);
      if(currentLevel>=ECONOMY.moduleMaxLevel) return;
      const nextLevel=currentLevel+1;
      const cost=moduleCost(key,nextLevel);
      if(gameState.energy<cost) return;
      const labels={
        auto:currentLevel?`улучшить автодобычу до уровня ${nextLevel}`:"включить автодобычу",
        tap:currentLevel?`улучшить импульсный усилитель до уровня ${nextLevel}`:"установить импульсный усилитель",
        combo:currentLevel?`улучшить комбо-матрицу до уровня ${nextLevel}`:"установить комбо-матрицу",
        offline:currentLevel?`улучшить контур хранения до уровня ${nextLevel}`:"установить контур хранения"
      };
      if(getSettings().confirmPurchases!==false && !confirm(`${labels[key]} за ${formatEnergy(cost)} энергии?`)) return;
      gameState.energy-=cost;
      gameState.moduleLevels=gameState.moduleLevels||{};
      gameState.moduleLevels[key]=nextLevel;
      gameState.modules=gameState.modules||{};
      gameState.modules[key]=true;
      saveGameState();
      await unlockAudio();
      playSfx("upgrade",.62); vibrate(12); renderEconomy();
      card.classList.add("module-flash");
      setTimeout(()=>card.classList.remove("module-flash"),450);
    });
  });

  upgradeBuyEl?.addEventListener("click", async () => {
    const cost = upgradeCost(gameState.coreLevel);
    if (gameState.energy < cost) return;
    const settings = getSettings();
    if (settings.confirmPurchases !== false && !confirm(`Усилить ядро до уровня ${gameState.coreLevel + 1} за ${formatEnergy(cost)} энергии?`)) return;
    gameState.energy -= cost;
    gameState.coreLevel += 1;
    gameState.upgradesBought += 1;
    gameState.comboCount = 0;
    gameState.comboMultiplier = 1;
    saveGameState();
    await unlockAudio();
    playSfx("upgrade", .72);
    vibrate(14);
    renderEconomy();
    upgradeBuyEl.classList.add("upgrade-flash");
    setTimeout(() => upgradeBuyEl.classList.remove("upgrade-flash"), 420);
  });

  // Реальное производство: работает только после покупки модуля АВТОДОБЫЧА.
  let economyFrame = performance.now();
  function economyLoop(now) {
    const dt = Math.min(1000, now - economyFrame) / 1000;
    economyFrame = now;
    if (document.visibilityState === "visible") {
      const gain = productionForLevel(gameState.coreLevel) * dt;
      gameState.energy += gain;
      gameState.totalProduced += gain;
      renderEconomy();
    }
    requestAnimationFrame(economyLoop);
  }
  requestAnimationFrame(economyLoop);
  setInterval(saveGameState, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveGameState();
      return;
    }
    const gain = grantOfflineProduction();
    renderEconomy();
    if (gain >= 1) showTapNumber(gain, false);
  });
  window.addEventListener("beforeunload", saveGameState);
  renderEconomy();


  setInterval(() => { tapMomentum = Math.max(1, tapMomentum * 0.94); }, 180);

  const screens = {
    home: game,
    upgrade: document.getElementById("upgrade-screen"),
    quests: document.getElementById("quests-screen"),
    inventory: document.getElementById("inventory-screen"),
    settings: document.getElementById("settings-screen")
  };

  function setNavLens(name) {
    const nav = document.querySelector(".bottom-nav");
    if (!nav) return;
    const index = ["upgrade","quests","home","inventory","settings"].indexOf(name);
    nav.style.setProperty("--nav-index", index >= 0 ? index : 2);
    nav.classList.toggle("nav-no-active", index < 0);
  }

  function setBackVisibility(name) {
    if (!backButton) return;
    // На главном экране назад не существует. Внутри разделов/профиля — есть.
    backButton.classList.toggle("hidden", name === "home");
  }

  function openScreen(name) {
    const target = screens[name] || game;
    // Сначала убираем все слои, затем показываем ровно один.
    subScreens.forEach(screen => screen.classList.add("hidden"));
    if (name === "home") {
      game.classList.remove("hidden");
    } else {
      game.classList.add("hidden");
      target?.classList.remove("hidden");
    }
    commonUi.classList.remove("hidden");
    navItems.forEach(item => item.classList.toggle("active", item.dataset.screen === name));
    setBackVisibility(name);
    setNavLens(name);
  }

  // Haptic запускаем на pointerdown: на Android/Яндекс Браузере это надёжнее,
  // чем ждать click. Защита lastHaptic не допускает второго импульса от click.
  document.addEventListener("pointerdown", event => {
    const target = event.target.closest(".nav-item, .avatar-button, [data-back], .core-button, .settings-tab, [data-setting], [data-action]");
    if (!target) return;
    vibrate(target.classList.contains("core-button") ? 12 : 8);
  }, { passive: true });

  setBackVisibility("home");
  setNavLens("home");

  navItems.forEach(item => {
    item.addEventListener("click", async () => {
      await unlockAudio();
      playSfx("tab", .42);
      openScreen(item.dataset.screen);
    });
  });

  avatarButton?.addEventListener("click", async () => {
    await unlockAudio();
    playSfx("tab", .42);
    subScreens.forEach(screen => screen.classList.add("hidden"));
    game.classList.add("hidden");
    document.getElementById("profile-screen")?.classList.remove("hidden");
    navItems.forEach(item => item.classList.remove("active"));
    setBackVisibility("profile");
    setNavLens("profile");
  });

  document.addEventListener("click", async (event) => {
    const back = event.target.closest("[data-back]");
    if (!back) return;
    event.preventDefault();
    event.stopPropagation();
    await unlockAudio();
    playSfx("back", .48);
    openScreen("home");
  });

  const defaults = {
    sounds: true, music: true, vibration: true, animations: true,
    grid: true, confirmPurchases: true, numberEffects: true,
    criticalEffects: true, batterySaver: false, reducedMotion: false,
    density: "standard", volume: 70
  };
  const stored = getSettings();
  const settings = {...defaults, ...stored};

  function saveSettings() {
    localStorage.setItem("neonCoreSettings", JSON.stringify(settings));
    applySettings();
    const status = document.getElementById("save-status");
    if (status) {
      status.textContent = "СОХРАНЕНО";
      clearTimeout(window.__coreSaveStatusTimer);
      window.__coreSaveStatusTimer = setTimeout(() => { status.textContent = "АКТИВНО"; }, 900);
    }
  }

  function applySettings() {
    const root = document.documentElement;
    document.body.classList.toggle("settings-no-grid", settings.grid === false);
    document.body.classList.toggle("settings-reduced-motion", settings.reducedMotion === true);
    document.body.classList.toggle("settings-no-animation", settings.animations === false);
    document.body.classList.toggle("settings-battery-saver", settings.batterySaver === true);
    document.body.dataset.density = settings.density || "standard";
    root.style.setProperty("--core-ui-scale", settings.density === "compact" ? ".94" : settings.density === "comfortable" ? "1.04" : "1");
    document.querySelectorAll("[data-setting]").forEach(input => {
      if (input.type === "checkbox") input.checked = Boolean(settings[input.dataset.setting]);
    });
    const volume = document.getElementById("volume-range");
    const volumeValue = document.getElementById("volume-value");
    if (volume) volume.value = settings.volume;
    if (volumeValue) volumeValue.textContent = settings.volume + "%";
    const densityValue = document.getElementById("density-value");
    if (densityValue) densityValue.textContent = ({compact:"Компактная", standard:"Стандартная", comfortable:"Увеличенная"})[settings.density] || "Стандартная";
    syncMusic();
  }

  document.querySelectorAll("[data-setting]").forEach(input => {
    const key = input.dataset.setting;
    input.checked = Boolean(settings[key]);
    input.addEventListener("change", async () => {
      settings[key] = input.checked;
      saveSettings();
      if (key === "music" || key === "volume") {
        await unlockAudio();
        syncMusic();
      }
      if (key === "sounds" && input.checked) {
        await unlockAudio();
        playSfx("tab", .35);
      }
    });
  });

  const volume = document.getElementById("volume-range");
  const volumeValue = document.getElementById("volume-value");
  if (volume && volumeValue) {
    volume.value = settings.volume;
    volumeValue.textContent = settings.volume + "%";
    volume.addEventListener("input", () => {
      settings.volume = Number(volume.value);
      volumeValue.textContent = volume.value + "%";
      saveSettings();
    });
  }

  function openSettingsChoice(title, options, current, onPick) {
    document.querySelector(".settings-sheet")?.remove();
    const sheet = document.createElement("div");
    sheet.className = "settings-sheet";
    sheet.innerHTML = `<div class="settings-sheet-backdrop"></div><div class="settings-sheet-panel"><div class="settings-sheet-grip"></div><div class="settings-sheet-title">${title}</div><div class="settings-sheet-options">${options.map(([key,label]) => `<button class="settings-choice ${key===current?'active':''}" data-choice="${key}"><span>${label}</span><i class="fa-solid fa-check"></i></button>`).join("")}</div></div>`;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add("open"));
    const close = () => { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 180); };
    sheet.querySelector(".settings-sheet-backdrop")?.addEventListener("click", close);
    sheet.querySelectorAll(".settings-choice").forEach(btn => btn.addEventListener("click", async () => {
      onPick(btn.dataset.choice);
      await unlockAudio();
      playSfx("tab", .28);
      vibrate(8);
      close();
    }));
  }

  document.querySelector('[data-action="density"]')?.addEventListener("click", () => {
    openSettingsChoice("ПЛОТНОСТЬ ИНТЕРФЕЙСА", [["compact","Компактная"],["standard","Стандартная"],["comfortable","Увеличенная"]], settings.density, value => {
      settings.density = value;
      saveSettings();
    });
  });

  document.querySelector('[data-action="export"]')?.addEventListener("click", async () => {
    await unlockAudio();
    const payload = { app:"CORE", type:"settings", version:"0.5.6", exportedAt:new Date().toISOString(), settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `core-settings-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    playSfx("reward", .3);
  });

  const importInput = document.getElementById("settings-import");
  document.querySelector('[data-action="import"]')?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.type !== "settings" || typeof data.settings !== "object") throw new Error("bad format");
      Object.keys(defaults).forEach(key => { if (key in data.settings) settings[key] = data.settings[key]; });
      saveSettings();
      await unlockAudio();
      playSfx("reward", .34);
      alert("Настройки CORE восстановлены.");
    } catch {
      alert("Не удалось импортировать этот файл настроек.");
    } finally { importInput.value = ""; }
  });

  document.querySelector('[data-action="reset"]')?.addEventListener("click", async () => {
    if (!confirm("Сбросить все настройки CORE к исходным значениям?")) return;
    Object.assign(settings, defaults);
    saveSettings();
    await unlockAudio();
    playSfx("back", .3);
  });

  document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", async () => {
      const name = tab.dataset.tab;
      document.querySelectorAll(".settings-tab").forEach(x => x.classList.toggle("active", x === tab));
      document.querySelectorAll(".settings-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === name));
      await unlockAudio();
      playSfx("tab", .32);
    });
  });

  applySettings();
})();
