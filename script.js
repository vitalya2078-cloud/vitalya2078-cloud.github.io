document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  if (tg.themeParams?.bg_color) {
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
  const calcBtn = el('calcBtn');
  const shareBtn = el('shareBtn');

  const daysUntilBirthdayEl = el('daysUntilBirthday');
  const unitTextEl = el('unitText');
  const percentText = el('percentText');
  const progressFill = el('progressFill');

  const unitBtns = document.querySelectorAll('.unit-btn');

  let activeUnit = 'days';
  let selectedYear = null;
  let selectedMonth = null; // 0–11
  let selectedDay = null;

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function declension(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = number % 100 > 4 && number % 100 < 20
      ? 2
      : cases[number % 10 < 5 ? number % 10 : 5];
    return titles[index];
  }

  function checkInputsValid() {
    if (selectedYear !== null && selectedMonth !== null && selectedDay !== null) {
      calcBtn.disabled = false;
      calcBtn.style.opacity = '1';
      calcBtn.style.cursor = 'pointer';
    } else {
      calcBtn.disabled = true;
      calcBtn.style.opacity = '0.6';
      calcBtn.style.cursor = 'not-allowed';
    }
  }

  // Инициализация годов
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

      rebuildMonths();
      yearDropdown.closest('.input-group').classList.remove('open');
      checkInputsValid();
    });
    yearDropdown.appendChild(option);
  }

  // Перестройка месяцев
  function rebuildMonths() {
    monthDropdown.innerHTML = '';
    const monthsRu = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    for (let m = 0; m < 12; m++) {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.dataset.value = m;
      option.textContent = monthsRu[m];

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = parseInt(option.dataset.value, 10);
        monthDisplay.textContent = monthsRu[value];
        selectedMonth = value;

        rebuildDays();
        monthDropdown.closest('.input-group').classList.remove('open');
        checkInputsValid();
      });
      monthDropdown.appendChild(option);
    }
  }

  // Перестройка дней
  function rebuildDays() {
    dayDropdown.innerHTML = '';
    const daysCount = getDaysInMonth(selectedYear, selectedMonth);

    for (let d = 1; d <= daysCount; d++) {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.dataset.value = d;
      option.textContent = d.toString().padStart(2, '0');

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = parseInt(option.dataset.value, 10);
        dayDisplay.textContent = value.toString().padStart(2, '0');
        selectedDay = value;

        dayDropdown.closest('.input-group').classList.remove('open');
        checkInputsValid();
      });
      dayDropdown.appendChild(option);
    }
  }

  // Открытие/закрытие выпадающих списков
  function setupDropdown(trigger, dropdown, group) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      group.classList.toggle('open');
    });
  }

  setupDropdown(yearTrigger, yearDropdown, yearTrigger.parentElement);
  setupDropdown(monthTrigger, monthDropdown, monthTrigger.parentElement);
  setupDropdown(dayTrigger, dayDropdown, dayTrigger.parentElement);

  // Закрытие всех выпадающих при клике вне
  document.addEventListener('click', () => {
    document.querySelectorAll('.input-group').forEach(g => g.classList.remove('open'));
  });

  // Кнопка расчёта
  calcBtn.addEventListener('click', () => {
    const targetDate = new Date(selectedYear, selectedMonth, selectedDay);
    const now = new Date();

    // Проверка на прошедшую дату
    if (targetDate < now) {
      alert('Выбрана дата, которая уже прошла. Выберите другую.');
      return;
    }

    emptyState.style.display = 'none';
    resultBlock.style.display = 'flex';

    updateResult();
  });

  // Переключатель единиц измерения
  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      unitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeUnit = btn.dataset.unit;
      updateResult();
    });
  });

  function updateResult() {
    const targetDate = new Date(selectedYear, selectedMonth, selectedDay);
    const now = new Date();

    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let value = 0;
    let unitLabel = '';

    if (activeUnit === 'days') {
      value = diffDays;
      unitLabel = declension(value, ['день', 'дня', 'дней']);
    } else if (activeUnit === 'weeks') {
      value = Math.floor(diffDays / 7);
      unitLabel = declension(value, ['неделя', 'недели', 'недель']);
    } else if (activeUnit === 'months') {
      // Грубый расчёт месяцев (для мини-аппа достаточно)
      let monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 +
                        (targetDate.getMonth() - now.getMonth());
      if (targetDate.getDate() < now.getDate()) monthsDiff--;
      value = Math.max(0, monthsDiff);

      // Если месяцев много — показываем ещё и годы
      const years = Math.floor(value / 12);
      const months = value % 12;
      if (years > 0 && months > 0) {
        unitLabel = `${years} ${declension(years, ['год', 'года', 'лет'])} и ${months} ${declension(months, ['месяц', 'месяца', 'месяцев'])}`;
      } else if (years > 0) {
        unitLabel = `${years} ${declension(years, ['год', 'года', 'лет'])}`;
      } else {
        unitLabel = `${months} ${declension(months, ['месяц', 'месяца', 'месяцев'])}`;
      }
    }

    daysUntilBirthdayEl.textContent = value;
    unitTextEl.textContent = unitLabel;

    // Прогресс года (сколько % года уже прошло от начала года до выбранной даты)
    const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
    const totalMsInYear = new Date(targetDate.getFullYear(), 11, 31).getTime() - startOfYear.getTime() + (1000 * 60 * 60 * 24);
    const msFromStart = targetDate.getTime() - startOfYear.getTime();
    const percent = Math.round((msFromStart / totalMsInYear) * 100);

    percentText.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
  }

  shareBtn.addEventListener('click', () => {
    const text = `До этой даты осталось: ${daysUntilBirthdayEl.textContent} ${unitTextEl.textContent}`;
    if (tg.sendData) {
      tg.sendData(text);
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Текст скопирован');
      }).catch(() => {
        alert('Не удалось скопировать');
      });
    }
  });
});
