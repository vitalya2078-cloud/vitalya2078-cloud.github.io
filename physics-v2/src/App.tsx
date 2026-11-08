import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faBookmark,
  faBullseye,
  faChartLine,
  faChevronRight,
  faCirclePlay,
  faClipboardCheck,
  faClock,
  faFlask,
  faMoon,
  faSun,
  faTriangleExclamation,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { localDb } from './storage/db';

type SectionKey = 'learning' | 'testing' | 'laboratory' | 'progress' | 'profile';
type ThemeMode = 'light' | 'dark';

const navigation: Array<{ id: SectionKey; label: string; icon: typeof faBookOpen }> = [
  { id: 'learning', label: 'Обучение', icon: faBookOpen },
  { id: 'testing', label: 'Тестирование', icon: faClipboardCheck },
  { id: 'laboratory', label: 'Лаборатория', icon: faFlask },
  { id: 'progress', label: 'Мой прогресс', icon: faChartLine },
  { id: 'profile', label: 'Профиль', icon: faUser },
];

function App() {
  const [activeSection, setActiveSection] = useState<SectionKey>('learning');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('physics-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const nickname = 'Исследователь';
  const [localStatus, setLocalStatus] = useState('Локальное хранилище готово');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('physics-theme', theme);
  }, [theme]);

  useEffect(() => {
    localDb.profiles.count().then((count) => {
      setLocalStatus(count > 0 ? 'Профиль сохранён на устройстве' : 'Работаем в автономном режиме');
    }).catch(() => {
      setLocalStatus('Локальное хранилище пока недоступно');
    });
  }, []);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setActiveSection('learning')}>
          <span className="brand-mark">P</span>
          <span>
            <strong>PHYSICS</strong>
            <small>ПЛАТФОРМА ЗНАНИЙ</small>
          </span>
        </a>

        <div className="sidebar-caption">ОСНОВНОЕ</div>
        <nav className="side-navigation" aria-label="Основная навигация">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-indicator">
            <span className="status-dot" />
            <span>{localStatus}</span>
          </div>
          <button className="theme-button" onClick={toggleTheme}>
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">P</span>
            <strong>PHYSICS</strong>
          </div>
          <div className="topbar-context">Образовательная платформа</div>
          <div className="topbar-actions">
            <button className="icon-button theme-mobile" onClick={toggleTheme} aria-label="Сменить тему">
              <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            </button>
            <button className="profile-chip" onClick={() => setActiveSection('profile')}>
              <span className="avatar-placeholder">И</span>
              <span>{nickname}</span>
            </button>
          </div>
        </header>

        {activeSection === 'learning' && (
          <section className="page-content">
            <div className="welcome-row">
              <div>
                <div className="eyebrow">ТВОЙ УЧЕБНЫЙ ЦЕНТР</div>
                <h1>Продолжим изучать физику?</h1>
                <p className="page-lead">Выбирай направление, изучай новое и отслеживай свой прогресс.</p>
              </div>
              <div className="welcome-symbol"><FontAwesomeIcon icon={faBookOpen} /></div>
            </div>

            <section className="continue-card">
              <div className="continue-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="atom-core"><FontAwesomeIcon icon={faFlask} /></div>
                <span className="art-label">PHYSICS / LEARNING</span>
              </div>
              <div className="continue-content">
                <div className="card-kicker">ПРОДОЛЖИТЬ ОБУЧЕНИЕ</div>
                <h2>Твоя первая учебная траектория</h2>
                <p>Выбери программу и класс, чтобы PHYSICS подготовил персональный маршрут обучения.</p>
                <button className="primary-button" onClick={() => setActiveSection('profile')}>
                  Настроить обучение <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <div className="eyebrow">ВОЗМОЖНОСТИ</div>
                <h2>Учись в своём темпе</h2>
              </div>
            </div>

            <div className="feature-grid">
              <button className="feature-card" onClick={() => setActiveSection('learning')}>
                <span className="feature-icon blue"><FontAwesomeIcon icon={faBookOpen} /></span>
                <span className="feature-copy"><strong>Учебные программы</strong><small>Школа, колледж и университет</small></span>
                <FontAwesomeIcon className="feature-arrow" icon={faChevronRight} />
              </button>
              <button className="feature-card" onClick={() => setActiveSection('testing')}>
                <span className="feature-icon violet"><FontAwesomeIcon icon={faClipboardCheck} /></span>
                <span className="feature-copy"><strong>Проверка знаний</strong><small>Тренировки и итоговые тесты</small></span>
                <FontAwesomeIcon className="feature-arrow" icon={faChevronRight} />
              </button>
              <button className="feature-card" onClick={() => setActiveSection('laboratory')}>
                <span className="feature-icon teal"><FontAwesomeIcon icon={faFlask} /></span>
                <span className="feature-copy"><strong>Физическая лаборатория</strong><small>Модели, эксперименты и опыты</small></span>
                <FontAwesomeIcon className="feature-arrow" icon={faChevronRight} />
              </button>
              <button className="feature-card" onClick={() => setActiveSection('progress')}>
                <span className="feature-icon amber"><FontAwesomeIcon icon={faChartLine} /></span>
                <span className="feature-copy"><strong>Мой прогресс</strong><small>Результаты и освоенные темы</small></span>
                <FontAwesomeIcon className="feature-arrow" icon={faChevronRight} />
              </button>
            </div>

            <div className="lower-grid">
              <section className="panel recommendation-panel">
                <div className="panel-title">
                  <span className="panel-icon"><FontAwesomeIcon icon={faBullseye} /></span>
                  <div><h3>Рекомендации</h3><p>Подсказки для эффективного обучения</p></div>
                </div>
                <div className="empty-state">
                  <span className="empty-state-icon"><FontAwesomeIcon icon={faCirclePlay} /></span>
                  <div><strong>Здесь появится твой маршрут</strong><p>После выбора программы мы подберём темы и задания под твой уровень.</p></div>
                </div>
              </section>

              <section className="panel quick-panel">
                <div className="panel-title">
                  <span className="panel-icon"><FontAwesomeIcon icon={faClock} /></span>
                  <div><h3>Быстрый доступ</h3><p>Твои учебные инструменты</p></div>
                </div>
                <button className="quick-link" onClick={() => setActiveSection('progress')}>
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Мои ошибки <FontAwesomeIcon className="quick-arrow" icon={faChevronRight} />
                </button>
                <button className="quick-link" onClick={() => setActiveSection('profile')}>
                  <FontAwesomeIcon icon={faBookmark} /> Избранное <FontAwesomeIcon className="quick-arrow" icon={faChevronRight} />
                </button>
              </section>
            </div>
          </section>
        )}

        {activeSection !== 'learning' && (
          <section className="page-content secondary-page">
            <div className="eyebrow">PHYSICS</div>
            <h1>{navigation.find((item) => item.id === activeSection)?.label}</h1>
            <p className="page-lead">Раздел подготовлен для подключения учебных данных и функций следующего этапа разработки.</p>
            <div className="panel placeholder-panel">
              <span className="placeholder-icon">
                <FontAwesomeIcon icon={navigation.find((item) => item.id === activeSection)?.icon ?? faBookOpen} />
              </span>
              <h2>Раздел будет наполнен</h2>
              <p>Структура платформы уже создаётся. Здесь появится полноценный функционал {navigation.find((item) => item.id === activeSection)?.label.toLowerCase()}.</p>
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-navigation" aria-label="Основная навигация">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={activeSection === item.id ? 'active' : ''}
            onClick={() => setActiveSection(item.id)}
          >
            <FontAwesomeIcon icon={item.icon} />
            <span>{item.label === 'Мой прогресс' ? 'Прогресс' : item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;