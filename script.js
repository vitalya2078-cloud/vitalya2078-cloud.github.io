// Переключение бокового меню по клику на бургер
const burgerMenu = document.getElementById('burgerMenu');
const sidebar = document.querySelector('.sidebar');

burgerMenu.addEventListener('click', () => {
    burgerMenu.classList.toggle('active');
    sidebar.classList.toggle('active');
});

// Переключение темы (тёмная/светлая)
const themeToggle = document.querySelector('.theme-toggle');

themeToggle.addEventListener('click', () => {
    const isLightTheme = document.body.classList.contains('light-theme');
    
    if (isLightTheme) {
        // Переключаем на тёмную тему
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<span class="icon">🌞</span>Тема';
        updateThemeVariables(false);
    } else {
        // Переключаем на светлую тему
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<span class="icon">🌙</span>Тема';
        updateThemeVariables(true);
    }
});

// Функция для обновления CSS‑переменных в зависимости от темы
function updateThemeVariables(isLight) {
    if (isLight) {
        document.documentElement.style.setProperty('--bg-primary', '#f8f9fa');
        document.documentElement.style.setProperty('--bg-secondary', '#e9ecef');
        document.documentElement.style.setProperty('--text-primary', '#212529');
        document.documentElement.style.setProperty('--text-secondary', '#6c757d');
        document.documentElement.style.setProperty('--border-color', '#dee2e6');
    } else {
        document.documentElement.style.setProperty('--bg-primary', '#1a1a2e');
        document.documentElement.style.setProperty('--bg-secondary', '#16213e');
        document.documentElement.style.setProperty('--text-primary', '#e6e6e6');
        document.documentElement.style.setProperty('--text-secondary', '#a8a8c0');
        document.documentElement.style.setProperty('--border-color', '#2d3748');
    }
}

// Инициализация темы при загрузке страницы (по умолчанию — тёмная)
document.addEventListener('DOMContentLoaded', () => {
    updateThemeVariables(false); // Устанавливаем тёмную тему по умолчанию
    themeToggle.innerHTML = '<span class="icon">🌞</span>Тема'; // Иконка для переключения на светлую
});

// Логика для монет (пример: добавление монет по клику в области фермы)
let coinCount = 100;
const coinDisplay = document.getElementById('coinCount');

// Обновляем отображение монет
function updateCoinDisplay() {
    coinDisplay.textContent = coinCount.toLocaleString();
}

// Обработчик клика в области фермы для получения монет
document.querySelector('.farm-area').addEventListener('click', () => {
    coinCount += 1; // Добавляем 1 монету за клик
    updateCoinDisplay();
});

// Инициализируем отображение монет при загрузке
updateCoinDisplay();
