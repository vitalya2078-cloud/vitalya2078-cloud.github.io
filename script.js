document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  if (tg.themeParams?.bg_color) {
    document.body.style.backgroundColor = tg.themeParams.bg_color;
  }

  const el = (id) => document.getElementById(id);

  // --- Элементы профиля ---
  const profileHeader = el('profileHeader');
  const userAvatar = el('userAvatar');
  const userInitials = el('userInitials');
  const userName = el('userName');
  const userUsername = el('userUsername');

  const user = tg.initDataUnsafe?.user;
  if (user) {
    profileHeader.style.display = 'flex';
    userName.textContent = user.first_name || 'Пользователь';
    if (user.last_name) {
      userName.textContent += ` ${user.last_name}`;
    }
    userUsername.textContent = user.username ? '@' + user.username : '';

    if (user.photo_url) {
      userAvatar.src = user.photo_url;
      userAvatar.style.display = 'block';
      userInitials.style.display = 'none';
    } else {
      const initials = (user.first_name?.[0] || 'U') + (user.last_name?.[0] || '');
      userInitials.textContent = initials.toUpperCase();
      userAvatar.style.display = 'none';
      userInitials.style.display = 'flex';
    }
  } else {
    profileHeader.style.display = 'none';
  }

  // --- Элементы управления датой ---
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

  const daysUntilBirthdayEl = el('daysUntilBirthday');
  const unitTextEl = el('unitText');
  const percentText = el('percentText');
  const progressFill = el('progressFill');

  const unitBtns = document.querySelectorAll('.unit-btn');

  let selectedYear = null;
  let selectedMonth = null; // 0–11
  let selectedDay = null;

  // --- Вспомогательные функции ---

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function getDaysInMonth(year, month) {
    if (month === 1) { // февраль
      return isLeapYear(year) ? 29 : 28;
    }
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[month];
  }

  function closeAllDropdowns() {
    yearDropdown.innerHTML = '';
    monthDropdown.innerHTML = '';
    dayDropdown.innerHTML = '';

    [yearTrigger, monthTrigger, dayTrigger].forEach(btn => {
      btn.closest('.input-group').classList.remove('open');
    });
  }

  function createOption(text, value, isSelected = false) {
    const div = document.createElement('div');
    div.className = 'dropdown-option' + (isSelected ? ' selected' : '');
    div.textContent = text;
    div.dataset.value = value;
    return div;
  }

  // --- Логика выпадающих списков ---

  yearTrigger.addEventListener('click', () => {
    closeAllDropdowns();
    const currentGroup = yearTrigger.closest('.input-group');
    currentGroup.classList.add('open');

    const now = new Date();
    const startYear = now.getFullYear();
    const endYear = startYear + 15; // чуть расширил диапазон

    for (let y = startYear; y <= endYear; y++) {
      const isSelected = y === selectedYear;
      yearDropdown.appendChild(createOption(y, y, isSelected));
    }

    yearDropdown.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedYear = Number(opt.dataset.value);
        yearDisplay.textContent = selectedYear;
        currentGroup.classList.remove('open');
        updateDayOptions();
        checkEnableCalc();
      });
    });
  });

  monthTrigger.addEventListener('click', () => {
    closeAllDropdowns();
    const currentGroup = monthTrigger.closest('.input-group');
    currentGroup.classList.add('open');

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    for (let m = 0; m < 12; m++) {
      const text = monthNames[m];
      const value = m;
      const isSelected = m === selectedMonth;
      monthDropdown.appendChild(createOption(text, value, isSelected));
    }

    monthDropdown.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedMonth = Number(opt.dataset.value);
        monthDisplay.textContent = monthNames[selectedMonth];
        currentGroup.classList.remove('open');
        updateDayOptions();
        checkEnableCalc();
      });
    });
  });

  function updateDayOptions() {
    dayDropdown.innerHTML = '';
    if (selectedYear === null || selectedMonth === null) return;

    const maxDays = getDaysInMonth(selectedYear, selectedMonth);

    for (let d = 1; d <= maxDays; d++) {
      const text = d;
      const value = d;
      const isSelected = d === selectedDay;
      dayDropdown.appendChild(createOption(text, value, isSelected));
    }

    dayDropdown.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedDay = Number(opt.dataset.value);
        dayDisplay.textContent = selectedDay;
        dayTrigger.closest('.input-group').classList.remove('open');
        checkEnableCalc();
      });
    });
  }

  dayTrigger.addEventListener('click', () => {
    closeAllDropdowns();
    if (selectedYear !== null && selectedMonth !== null) {
      dayTrigger.closest('.input-group').classList.add('open');
      updateDayOptions();
    }
  });

  document.addEventListener('click', (e) => {
    const triggers = [yearTrigger, monthTrigger, dayTrigger];
    if (!triggers.some(t => t.contains(e.target) || e.target.closest('.custom-dropdown-menu'))) {
      closeAllDropdowns();
    }
  });

  // --- Кнопка расчёта ---
  calcBtn.addEventListener('click', () => {
    if (selectedYear === null || selectedMonth === null || selectedDay === null) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(selectedYear, selectedMonth, selectedDay);
    target.setHours(0, 0, 0, 0);

    if (target < today) {
      alert('Выбрана дата, которая уже прошла. Выберите будущую дату.');
      return;
    }

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    renderResult(diffDays);
  });

  function checkEnableCalc() {
    calcBtn.disabled = !(selectedYear && selectedMonth && selectedDay);
  }

  // --- Склонение слов ---
  function declension(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  }

  // --- Отображение результата ---
  function renderResult(days) {
    emptyState.style.display = 'none';
    resultBlock.style.display = 'flex';

    // Прогресс года
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const totalMsInYear = new Date(now.getFullYear() + 1, 0, 1).getTime() - startOfYear.getTime();
    const elapsedMs = now.getTime() - startOfYear.getTime();
    const percent = Math.min(100, Math.max(0, (elapsedMs / totalMsInYear) * 100));

    percentText.textContent = Math.round(percent) + '%';
    progressFill.style.width = percent + '%';

    // Функция пересчёта и отображения по выбранной единице
    function updateDisplay(unit) {
      let displayValue = 0;
      let unitLabel = '';

      if (unit === 'days') {
        displayValue = days;
        unitLabel = declension(days, ['день', 'дня', 'дней']);
      } else if (unit === 'weeks') {
        const weeks = Math.floor(days / 7);
        displayValue = weeks;
        unitLabel = declension(weeks, ['неделя', 'недели', 'недель']);
      } else if (unit === 'months') {
        // Нормальная логика: считаем полные годы и оставшиеся месяцы
        // Сначала грубо: сколько полных месяцев (условно по 30.44 дня)
        const avgDaysPerMonth = 30.44;
        const totalMonthsFloat = days / avgDaysPerMonth;
        const totalMonths = Math.floor(totalMonthsFloat);

        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        if (years > 0 && months === 0) {
          displayValue = years;
          unitLabel = declension(years, ['год', 'года', 'лет']);
        } else if (years > 0) {
          // Показываем «X лет Y месяцев» в одном числе — неудобно, поэтому показываем месяцы, но с учётом лет
          // Вариант: показываем только месяцы (остаток), но это не очень наглядно.
          // Лучше: показать общее количество месяцев, если лет мало, или сделать отдельный формат.
          // Здесь делаем так: если есть и годы, и месяцы — показываем месяцы, а годы учитываем в числе месяцев
          displayValue = totalMonths;
          unitLabel = declension(totalMonths, ['месяц', 'месяца', 'месяцев']);
        } else {
          displayValue = months;
          unitLabel = declension(months, ['месяц', 'месяца', 'месяцев']);
        }
      }

      daysUntilBirthdayEl.textContent = displayValue;
      unitTextEl.textContent = unitLabel;
    }

    // Навешиваем обработчики один раз при первом рендере
    unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const unit = btn.dataset.unit;
        updateDisplay(unit);
      }, { once: true }); // чтобы не дублировать при повторных расчётах
    });

    updateDisplay('days');
  }
});
