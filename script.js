document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Настройка фона под тему Telegram
  if (tg.themeParams.bg_color) {
    document.body.style.backgroundColor = tg.themeParams.bg_color;
  }

  const el = (id) => document.getElementById(id);

  // Элементы
  const yearTrigger = el('yearTrigger');
  const monthTrigger = el('monthTrigger');
  const dayTrigger = el('dayTrigger');

  const yearDisplay = el('yearDisplay');
  const monthDisplay = el('monthDisplay');
  const dayDisplay = el('dayDisplay');

  const yearDropdown = el('yearDropdown');
  const monthDropdown = el('monthDropdown');
  const dayDropdown = el('dayDropdown');

  const resultBlock = el('resultBlock');
  const emptyState = el('emptyState');

  const daysUntilBirthdayEl = el('daysUntilBirthday');
  const unitTextEl = el('unitText');
  const percentText = el('percentText');
  const progressFill = el('progressFill');
  const mottoText = el('mottoText');
  const shareBtn = el('shareBtn');

  const unitBtns = document.querySelectorAll('.unit-btn');

  let activeUnit = 'days';
  let selectedYear = null;
  let selectedMonth = null; // 0–11
  let selectedDay = null;

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // --- 1. Инициализация ГОДОВ (первый шаг) ---
  const currentYear = new Date().getFullYear();
  yearDropdown.innerHTML = '';
  for (let i = 0; i <= 15; i++) {
    const y = currentYear + i;
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.dataset.value = y;
    option.textContent = y;

    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = parseInt(option.dataset.value, 10);
      yearDisplay.textContent = value;
      selectedYear = value;

      // При выборе года сразу строим список месяцев
      rebuildMonths();
      
      yearDropdown.closest('.input-group').classList.remove('open');
    });
    yearDropdown.appendChild(option);
  }

  // --- 2. Инициализация МЕСЯЦЕВ (второй шаг) ---
  const monthsRu = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];

  function rebuildMonths() {
    if (selectedYear === null) return;

    monthDropdown.innerHTML = '';
    monthsRu.forEach((name, idx) => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.dataset.value = idx;
      option.textContent = name;

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = parseInt(option.dataset.value, 10);
        monthDisplay.textContent = name;
        selectedMonth = value;

        // При выборе месяца сразу строим список дней
        rebuildDays();

        monthDropdown.closest('.input-group').classList.remove('open');
      });
      monthDropdown.appendChild(option);
    });
  }

  // --- 3. Инициализация ДНЕЙ (третий шаг) ---
  function rebuildDays() {
    dayDropdown.innerHTML = '';

    if (selectedMonth === null || selectedYear === null) {
      dayDisplay.textContent = '--';
      selectedDay = null;
      return;
    }

    let maxDays = 31;
    switch (selectedMonth) {
      case 1: maxDays = isLeapYear(selectedYear) ? 29 : 28; break;
      case 3: case 5: case 8: case 10: maxDays = 30; break;
    }

    // Сброс дня, если он стал невозможен
    if (selectedDay !== null && selectedDay > maxDays) {
      selectedDay = null;
      dayDisplay.textContent = '--';
    }

    for (let d = 1; d <= maxDays; d++) {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.dataset.value = d;
      option.textContent = String(d).padStart(2, '0');

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = parseInt(option.dataset.value, 10);
        dayDisplay.textContent = option.textContent;

        dayDropdown.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');

        selectedDay = value;
        dayDropdown.closest('.input-group').classList.remove('open');
        
        // Можно сразу показать результат, если хочешь, или ждать кнопки
        // recalculateDisplay(); 
      });

      dayDropdown.appendChild(option);
    }
  }

  // Открытие/закрытие меню
  function toggleMenu(trigger, dropdown) {
    document.querySelectorAll('.input-group.open').forEach(grp => grp.classList.remove('open'));
    const inputGroup = dropdown.closest('.input-group');
    const isOpen = inputGroup.classList.contains('open');

    if (!isOpen) {
      setTimeout(() => inputGroup.classList.add('open'), 10);
    } else {
      inputGroup.classList.remove('open');
    }
  }

  yearTrigger.addEventListener('click', () => toggleMenu(yearTrigger, yearDropdown));
  monthTrigger.addEventListener('click', () => toggleMenu(monthTrigger, monthDropdown));
  dayTrigger.addEventListener('click', () => toggleMenu(dayTrigger, dayDropdown));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-group')) {
      document.querySelectorAll('.input-group.open').forEach(grp => grp.classList.remove('open'));
    }
  });

  // --- ГЛАВНАЯ КНОПКА TELEGRAM (MainButton) ---
  const mainButton = tg.MainButton;
  mainButton.setText("ПОЕХАЛИ");
  mainButton.setColor("#4caf50"); // Цвет как у btn-primary
  mainButton.setTextColor("#ffffff");

  mainButton.onClick(() => {
    recalculateDisplay();
    
    // Опционально: можно скрыть кнопку после расчёта или поменять текст
    // mainButton.setText("ГОТОВО");
  });
  // -------------------------------------------

  // Переключатель единиц
  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      unitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeUnit = btn.dataset.unit;
      recalculateDisplay(); // Пересчитываем сразу при смене единиц
    });
  });

  // Отправка в чат
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!selectedDay || selectedMonth === null || !selectedYear) return;
      const days = daysUntilBirthdayEl.textContent;
      const unit = unitTextEl.textContent;
      const message = `🎉 До события осталось ${days} ${unit}`;
      tg.sendData(message);
    });
  }

  // Основная функция расчёта
  function recalculateDisplay() {
    if (!selectedDay || selectedMonth === null || !selectedYear) {
      resultBlock.style.display = 'none';
      emptyState.style.display = 'flex';
      mainButton.setText("ПОЕХАЛИ"); // Возвращаем текст кнопки
      return;
    }

    resultBlock.style.display = 'flex';
    emptyState.style.display = 'none';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(selectedYear, selectedMonth, selectedDay);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Прогресс года
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const percent = Math.min(100, Math.max(0, (dayOfYear / daysInYear) * 100));

    // Формируем результат
    let value, label;
    if (activeUnit === 'weeks') {
      value = Math.ceil(diffDays / 7);
      label = 'недель';
    } else if (activeUnit === 'months') {
      value = Math.max(0, Math.ceil(diffDays / 30));
      label = 'месяцев';
    } else {
      value = diffDays;
      label = diffDays === 1 ? 'день' : (diffDays >= 2 && diffDays <= 4 ? 'дня' : 'дней');
    }

    daysUntilBirthdayEl.textContent = value;
    unitTextEl.textContent = label;
    percentText.textContent = `${Math.round(percent)}%`;
    progressFill.style.width = `${percent}%`;

    mottoText.textContent = getMotto(diffDays);
  }

  function getMotto(days) {
    if (days < 0) return 'Событие уже прошло — но это повод запланировать новое!';
    if (days === 0) return 'Сегодня тот самый день! 🎉';
    if (days <= 7) return 'Уже совсем скоро — заряжайтесь энергией!';
    if (days <= 30) return 'Месяц — это быстро, успевайте всё подготовить.';
    if (days <= 90) return 'Время есть, но лучше не откладывать.';
    return 'Впереди много дней — используйте их с пользой.';
  }
});
