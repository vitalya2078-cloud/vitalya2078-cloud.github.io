document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand(); // Растягиваем на весь экран

  // Подстраиваем фон под тему Telegram, если она задана
  if (tg.themeParams.bg_color) {
    document.body.style.backgroundColor = tg.themeParams.bg_color;
  }

  const el = (id) => document.getElementById(id);

  // Элементы
  const dayTrigger = el('dayTrigger');
  const monthTrigger = el('monthTrigger');
  const yearTrigger = el('yearTrigger');

  const dayDisplay = el('dayDisplay');
  const monthDisplay = el('monthDisplay');
  const yearDisplay = el('yearDisplay');

  const dayDropdown = el('dayDropdown');
  const monthDropdown = el('monthDropdown');
  const yearDropdown = el('yearDropdown');

  const calculateBtn = el('calculateBtn');
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
  let selectedDay = null;
  let selectedMonth = null; // 0–11
  let selectedYear = null;

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // Месяцы
  const monthsRu = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];
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
      rebuildDays();
      monthDropdown.closest('.input-group').classList.remove('open');
    });
    monthDropdown.appendChild(option);
  });

  // Годы (текущий + 15 вперёд)
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
      rebuildDays();
      yearDropdown.closest('.input-group').classList.remove('open');
    });
    yearDropdown.appendChild(option);
  }

  // Дни (перестраивается при смене месяца/года)
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
      });

      dayDropdown.appendChild(option);
    }
  }

  // Открытие/закрытие меню
  function toggleMenu(trigger, dropdown) {
    // Закрываем все открытые
    document.querySelectorAll('.input-group.open').forEach(grp => grp.classList.remove('open'));

    const inputGroup = dropdown.closest('.input-group');
    const isOpen = inputGroup.classList.contains('open');

    if (!isOpen) {
      setTimeout(() => inputGroup.classList.add('open'), 10);
    } else {
      inputGroup.classList.remove('open');
    }
  }

  dayTrigger.addEventListener('click', () => toggleMenu(dayTrigger, dayDropdown));
  monthTrigger.addEventListener('click', () => toggleMenu(monthTrigger, monthDropdown));
  yearTrigger.addEventListener('click', () => toggleMenu(yearTrigger, yearDropdown));

  // Закрытие при клике вне
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-group')) {
      document.querySelectorAll('.input-group.open').forEach(grp => grp.classList.remove('open'));
    }
  });

  // Переключатель единиц
  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      unitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeUnit = btn.dataset.unit;
      recalculateDisplay();
    });
  });

  // Кнопка расчёта (если вдруг захочешь вернуть обычную кнопку)
  if (calculateBtn) {
    calculateBtn.addEventListener('click', recalculateDisplay);
  }

  // Отправка в чат Telegram
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!selectedDay || selectedMonth === null || !selectedYear) return;

      const days = daysUntilBirthdayEl.textContent;
      const unit = unitTextEl.textContent;
      const message = `🎉 До события осталось ${days} ${unit}`;

      // Отправляем текст боту и закрываем мини‑приложение
      tg.sendData(message);
    });
  }

  // Основная функция расчёта
  function recalculateDisplay() {
    if (!selectedDay || selectedMonth === null || !selectedYear) {
      resultBlock.style.display = 'none';
      emptyState.style.display = 'flex';
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

    // Прогресс года (сколько % года уже прошло)
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const percent = Math.min(100, Math.max(0, (dayOfYear / daysInYear) * 100));

    // Формируем результат в зависимости от активной единицы
    let value, label;
    if (activeUnit === 'weeks') {
      value = Math.ceil(diffDays / 7);
      label = 'недель';
    } else if (activeUnit === 'months') {
      // Грубый расчёт месяцев (для простоты)
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

  // Предзаполнение из URL (?day=25&month=12&year=2025)
  const params = new URLSearchParams(window.location.search);
  const urlDay = params.get('day');
  const urlMonth = params.get('month');
  const urlYear = params.get('year');

  if (urlDay && urlMonth && urlYear) {
    const d = parseInt(urlDay, 10);
    const m = parseInt(urlMonth, 10) - 1; // в JS месяцы 0–11
    const y = parseInt(urlYear, 10);

    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      // Находим нужные элементы в выпадашках и «нажимаем» их
      // Сначала год
      const yearOption = yearDropdown.querySelector(`.dropdown-option[data-value="${y}"]`);
      if (yearOption) {
        yearOption.click();
      }

      // Потом месяц (чтобы перестроились дни)
      setTimeout(() => {
        const monthOption = monthDropdown.querySelector(`.dropdown-option[data-value="${m}"]`);
        if (monthOption) {
          monthOption.click();
        }
      }, 50);

      // И день
      setTimeout(() => {
        const dayOption = dayDropdown.querySelector(`.dropdown-option[data-value="${d}"]`);
        if (dayOption) {
          dayOption.click();
          recalculateDisplay();
        }
      }, 100);
    }
  }
});
