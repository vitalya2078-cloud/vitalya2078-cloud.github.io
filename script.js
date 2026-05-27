// Переменные игры
let currentLevel = 1;
let currentPoints = 0;
let nextLevelPoints = 100;
let totalClicks = 0;
let playTime = 0;
let gameTimer;

const basePoints = 100;
const levelMultiplier = 1.5;

// Улучшенная функция определения мобильного устройства
function isMobileDevice() {
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent) ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        screen.width <= 768
    );
}

// Проверка устройства
function checkDevice() {
    const isMobile = isMobileDevice();
    const pcWarning = document.getElementById('pc-warning');
    const gameContainer = document.getElementById('game-container');

    if (isMobile) {
        pcWarning.style.display = 'none';
        gameContainer.style.display = 'block';
        console.log('Определено: мобильное устройство');
    } else {
        pcWarning.style.display = 'flex';
        gameContainer.style.display = 'none';
        console.log('Определено: ПК');
    }
}

// Надёжная загрузка с преобразованием типов
function loadGame() {
    try {
        currentLevel = parseInt(localStorage.getItem('currentLevel')) || 1;
        currentPoints = parseInt(localStorage.getItem('currentPoints')) || 0;
        nextLevelPoints = parseInt(localStorage.getItem('nextLevelPoints')) || calculateNextLevelPoints(currentLevel);
        totalClicks = parseInt(localStorage.getItem('totalClicks')) || 0;
        playTime = parseInt(localStorage.getItem('playTime')) || 0;

        console.log('Прогресс загружен:', { currentLevel, currentPoints, totalClicks, playTime });
    } catch (e) {
        console.error('Ошибка загрузки из localStorage:', e);
        resetGame();
    }
}

// Сброс игры на начальное состояние
function resetGame() {
    currentLevel = 1;
    currentPoints = 0;
    nextLevelPoints = calculateNextLevelPoints(1);
    totalClicks = 0;
    playTime = 0;
}

// Улучшенное сохранение с проверкой
function saveGame() {
    try {
        localStorage.setItem('currentLevel', currentLevel);
        localStorage.setItem('currentPoints', currentPoints);
        localStorage.setItem('nextLevelPoints', nextLevelPoints);
        localStorage.setItem('totalClicks', totalClicks);
        localStorage.setItem('playTime', playTime);

        console.log('Прогресс сохранён:', { currentLevel, currentPoints, totalClicks });
    } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
        alert('Не удалось сохранить прогресс. Проверьте настройки браузера.');
    }
}

// Расчёт очков для следующего уровня
function calculateNextLevelPoints(level) {
    return Math.floor(basePoints * Math.pow(levelMultiplier, level - 1));
}

// Проверка повышения уровня
function checkLevelUp() {
    if (currentPoints >= nextLevelPoints) {
        currentLevel++;
        currentPoints = 0;
        nextLevelPoints = calculateNextLevelPoints(currentLevel);
        saveGame();
        updateUI();
        showLevelUpAnimation();
    }
}

// Анимация повышения уровня
function showLevelUpAnimation() {
    const levelText = document.querySelector('.level-text');
    levelText.style.transform = 'scale(1.2)';
    levelText.style.color = '#2ecc71';

    setTimeout(() => {
        levelText.style.transform = '';
        levelText.style.color = '';
    }, 500);
}

// Обновление полосы прогресса
function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const levelText = document.querySelector('.level-text');
    const progressText = document.querySelector('.progress-text');

    const percentage = (currentPoints / nextLevelPoints) * 100;

    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    levelText.textContent = `Уровень ${currentLevel}`;
    progressText.textContent = `${currentPoints} / ${nextLevelPoints}`;
}

// Обновление статистики
function updateStats() {
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('max-level').textContent = currentLevel;
    document.getElementById('total-points').textContent = totalClicks;
    document.getElementById('play-time').textContent =
        Math.floor(playTime / 60) + ' мин';
}

// Обновление профиля
function updateProfile() {
    document.getElementById('user-level').textContent = currentLevel;
    document.getElementById('user-points').textContent = currentPoints;
}

// Обновление всего интерфейса
function updateUI() {
    updateProgress();
    updateStats();
    updateProfile();
}

// Обработчик клика по игровой кнопке
function setupGameButton() {
    const gameButton = document.querySelector('.game-button');
    if (gameButton) {
        gameButton.addEventListener('click', function(e) {
            e.preventDefault();
            currentPoints++;
            totalClicks++;
            checkLevelUp();
            updateUI();
            saveGame();
        });
    }
}

// Функция переключения экранов
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    if (screenId === 'stats' || screenId === 'profile') {
        updateUI();
    }
}

// Настройка переключения вкладок меню
function setupMenu() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        const iconImg = item.querySelector('.menu-icon');
        const originalSrc = iconImg.src;
        const activeSrc = originalSrc.replace('icons/', 'icons/active-');

        iconImg.setAttribute('data-original-src', originalSrc);
        iconImg.setAttribute('data-active-src', activeSrc);
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            menuItems.forEach(i => {
                i.classList.remove('active');
                const img = i.querySelector('.menu-icon');
                img.src = img.getAttribute('data-original-src');
            });

            this.classList.add('active');
            const currentImg = this.querySelector('.menu-icon');
            currentImg.src = currentImg.getAttribute('data-active-src');

            const screen = this.getAttribute('data-screen');
            switchScreen(screen);
        });
    });
}

// Функция для добавления эффекта нажатия
function addPressEffect() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('touchstart', function() {
            this.classList.add('pressed');
        });

        item.addEventListener('mousedown', function() {
            this.classList.add('pressed');
        });

        item.addEventListener('touchend', function() {
            setTimeout(() => {
                this.classList.remove('pressed');
            }, 150);
        });

        item.addEventListener('mouseup', function() {
                    this.classList.remove('pressed');
        });

        item.addEventListener('touchcancel', function() {
            this.classList.remove('pressed');
        });
    });
}

// Запуск таймера игры
function startGameTimer() {
    gameTimer = setInterval(() => {
        playTime++;
        if (playTime % 60 === 0) { // Сохраняем каждую минуту
            saveGame();
        }
    }, 1000);
}

// Остановка таймера игры
function stopGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
}

// Обработчики для кнопок магазина (заглушки)
function setupStoreButtons() {
    const buyButtons = document.querySelectorAll('.store-buy-btn');
    buyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Функция покупки пока в разработке!');
        });
    });
}

// Обработчики для кнопок улучшений (заглушки)
function setupUpgradeButtons() {
    const upgradeButtons = document.querySelectorAll('.upgrade-btn');
    upgradeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Функция улучшения пока в разработке!');
        });
    });
}

// Обработчики для социальных кнопок профиля (заглушки)
function setupProfileButtons() {
    const socialButtons = document.querySelectorAll('.social-btn');
    socialButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const buttonText = this.textContent.toLowerCase();
            if (buttonText.includes('поделиться')) {
                alert('Функция поделиться пока в разработке!');
            } else if (buttonText.includes('добавить')) {
                alert('Функция добавления друга пока в разработке!');
            }
        });
    });
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadGame(); // Загружаем сохранённый прогресс
    checkDevice(); // Проверяем устройство
    setupMenu(); // Инициализируем меню
    addPressEffect(); // Инициализируем эффект нажатия
    setupGameButton(); // Инициализируем игровую кнопку
    updateUI(); // Обновляем интерфейс с текущими данными
    startGameTimer(); // Запускаем таймер игры

    // Принудительно устанавливаем активную иконку для вкладки «Игра» при загрузке
    const gameItem = document.querySelector('.menu-item[data-screen="game"]');
    if (gameItem) {
        const iconImg = gameItem.querySelector('.menu-icon');
        const activeSrc = iconImg.getAttribute('data-active-src');
        if (activeSrc) {
            iconImg.src = activeSrc;
        }
    }

    // Инициализация обработчиков кнопок на страницах
    setTimeout(() => {
        setupStoreButtons();
        setupUpgradeButtons();
        setupProfileButtons();
    }, 100); // Небольшая задержка для гарантии загрузки всех элементов
});

// Дополнительная проверка при изменении размера окна
window.addEventListener('resize', checkDevice);
window.addEventListener('orientationchange', checkDevice);

// Сохранение при закрытии страницы
window.addEventListener('beforeunload', saveGame);

// Очистка при закрытии страницы
window.addEventListener('unload', function() {
    stopGameTimer();
});

// Отладка: функция для ручного сброса прогресса (для тестирования)
function resetProgress() {
    localStorage.clear();
    resetGame();
    updateUI();
    console.log('Прогресс сброшен вручную');
}
