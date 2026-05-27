// Система достижений
const achievements = [
    { id: 'first_crop', name: 'Первый урожай', unlocked: false, description: 'Соберите первый урожай любого вида зерна' },
    { id: 'mine_100', name: 'Опытный шахтёр', unlocked: false, description: 'Добыть 100 единиц руды суммарно' },
    { id: 'spend_1000', name: 'Крупный покупатель', unlocked: false, description: 'Потратить 1 000 монет в магазине' },
    { id: 'full_collection', name: 'Коллекционер', unlocked: false, description: 'Собрать все 10 видов зерна' },
    { id: 'ore_master', name: 'Мастер руды', unlocked: false, description: 'Добыть все 10 видов руды' },
    { id: 'harvest_1000', name: 'Фермер-профессионал', unlocked: false, description: 'Собрать 1 000 единиц урожая суммарно' },
    { id: 'mine_500', name: 'Шахтёр-ветеран', unlocked: false, description: 'Добыть 500 единиц руды суммарно' },
    { id: 'rich_farmer', name: 'Богатый фермер', unlocked: false, description: 'Накопить 5 000 монет' },
    { id: 'balanced_farm', name: 'Сбалансированное хозяйство', unlocked: false, description: 'Иметь 50+ единиц каждого вида зерна одновременно' },
    { id: 'deep_mine', name: 'Глубокая шахта', unlocked: false, description: 'Достичь глубины шахты 10 уровней' }
];

// Проверка достижений
function checkAchievements() {
    const totalHarvest = Object.values(crops).reduce((sum, crop) => sum + crop.amount, 0);
    const totalMined = Object.values(ores).reduce((sum, ore) => sum + ore.amount, 0);

    // Первый урожай
    if (totalHarvest > 0 && !achievements[0].unlocked) {
        unlockAchievement('first_crop');
    }

    // Опытный шахтёр
    if (totalMined >= 100 && !achievements[1].unlocked) {
        unlockAchievement('mine_100');
    }

    // Фермер-профессионал
    if (totalHarvest >= 1000 && !achievements[5].unlocked) {
        unlockAchievement('harvest_1000');
    }

    // Шахтёр-ветеран
    if (totalMined >= 500 && !achievements[6].unlocked) {
        unlockAchievement('mine_500');
    }
}

// Разблокировка достижения
function unlockAchievement(achievementId) {
    const achievement = achievements.find(ach => ach.id === achievementId);
    if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
        showNotification(`Достижение разблокировано: ${achievement.name}`);
    }
}

// Рендеринг достижений
function renderAchievements() {
    return achievements.map(ach => `
        <div class="achievement">
            <div class="achievement-icon">${ach.unlocked ? '✓' : '?'}</div>
            <div class="achievement-text">
                <strong>${ach.name}</strong>
                <div>${ach.description}</div>
                <div>${ach.unlocked ? '<span class="achievement-unlocked">Разблокировано</span>' : 'Ожидает разблокировки'}</div>
            </div>
        </div>`).join('');
}

// Показать страницу достижений
function showAchievementsPage() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <h2>Достижения</h2>
        <p>Ваши награды за успехи на ферме и в шахте:</p>
        <div class="achievements">
            ${renderAchievements()}
        </div>
    `;
}
