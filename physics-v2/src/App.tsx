import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAtom,
  faBookOpen,
  faBookmark,
  faChartLine,
  faCheck,
  faChevronDown,
  faChevronRight,
  faClipboardCheck,
  faCloudArrowDown,
  faFlask,
  faGraduationCap,
  faHouse,
  faMoon,
  faRotate,
  faSliders,
  faSun,
  faUser,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import {
  getCatalogOfflineFirst,
  type CatalogProgram,
} from './api/physics-api';
import {
  createLocalId,
  getLocalStorageHealth,
  localDb,
  saveLocalProfile,
  saveLocalSetting,
  type LocalProfile,
} from './storage/db';

type SectionKey = 'home' | 'learning' | 'testing' | 'laboratory' | 'progress' | 'profile';
type ThemeMode = 'system' | 'light' | 'dark';
type EducationTrack = 'school_base' | 'school_advanced' | 'college' | 'university';

interface EducationSelection {
  tracks: EducationTrack[];
  grade: string;
}

interface ProgressSnapshot {
  lessons: number;
  mastered: number;
  attempts: number;
  favorites: number;
  errors: number;
}

const navigation: Array<{ id: SectionKey; label: string; shortLabel: string; icon: typeof faBookOpen }> = [
  { id: 'home', label: 'Главная', shortLabel: 'Главная', icon: faHouse },
  { id: 'learning', label: 'Обучение', shortLabel: 'Учёба', icon: faBookOpen },
  { id: 'testing', label: 'Тестирование', shortLabel: 'Тесты', icon: faClipboardCheck },
  { id: 'laboratory', label: 'Лаборатория', shortLabel: 'Лаборатория', icon: faFlask },
  { id: 'progress', label: 'Мой прогресс', shortLabel: 'Прогресс', icon: faChartLine },
  { id: 'profile', label: 'Профиль', shortLabel: 'Профиль', icon: faUser },
];

const trackOptions: Array<{ id: EducationTrack; title: string; description: string }> = [
  { id: 'school_base', title: 'Школа · базовый уровень', description: 'Физика 7–11 классов' },
  { id: 'school_advanced', title: 'Школа · углублённый уровень', description: 'Расширенная программа 7–11 классов' },
  { id: 'college', title: 'Колледж', description: 'Профессиональное образование' },
  { id: 'university', title: 'Университет', description: 'Высшая школа и инженерные направления' },
];

const defaultSelection: EducationSelection = { tracks: [], grade: '7' };

function readTheme(): ThemeMode {
  const saved = localStorage.getItem('physics-theme');
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [selection, setSelection] = useState<EducationSelection>(defaultSelection);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [nicknameDraft, setNicknameDraft] = useState('Исследователь');
  const [birthYearDraft, setBirthYearDraft] = useState('');
  const [catalog, setCatalog] = useState<CatalogProgram[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'offline' | 'empty' | 'error'>('loading');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localStatus, setLocalStatus] = useState('Проверяем устройство…');
  const [progress, setProgress] = useState<ProgressSnapshot>({
    lessons: 0, mastered: 0, attempts: 0, favorites: 0, errors: 0,
  });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [height, setHeight] = useState(20);

  useEffect(() => {
    const resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem('physics-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    const refreshConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', refreshConnection);
    window.addEventListener('offline', refreshConnection);

    async function loadLocalState() {
      try {
        const [storedProfile, storedSelection, health, progressRows, attempts, favorites, errors] = await Promise.all([
          localDb.profiles.toCollection().first(),
          localDb.settings.get('education-selection'),
          getLocalStorageHealth(),
          localDb.progress.toArray(),
          localDb.attempts.count(),
          localDb.favorites.count(),
          localDb.errors.count(),
        ]);
        if (!active) return;
        if (storedProfile) {
          setProfile(storedProfile);
          setNicknameDraft(storedProfile.nickname);
          setBirthYearDraft(storedProfile.birthYear ? String(storedProfile.birthYear) : '');
        } else {
          setIsOnboarding(true);
        }
        if (storedSelection?.value) {
          setSelection(storedSelection.value as EducationSelection);
        }
        setLocalStatus(health.database === 'ready' ? 'Данные сохранены на устройстве' : 'Локальное хранилище недоступно');
        setProgress({
          lessons: progressRows.filter((item) => item.entityType === 'lesson' && item.completionPercent > 0).length,
          mastered: progressRows.filter((item) => item.entityType === 'lesson' && item.status === 'mastered').length,
          attempts,
          favorites,
          errors,
        });
      } catch {
        if (active) setLocalStatus('Не удалось открыть локальное хранилище');
      } finally {
        if (active) setIsProfileLoading(false);
      }
    }

    loadLocalState();
    return () => {
      active = false;
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', refreshConnection);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    getCatalogOfflineFirst(controller.signal)
      .then((result) => {
        if (!active) return;
        setCatalog(result.data);
        setCatalogState(result.source === 'cache' ? 'offline' : result.data.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (active) setCatalogState('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);



  const selectedTrackLabels = useMemo(
    () => trackOptions.filter((option) => selection.tracks.includes(option.id)).map((option) => option.title),
    [selection.tracks],
  );

  async function saveProfile(skipOnboarding = false) {
    const now = new Date().toISOString();
    const nextProfile: LocalProfile = {
      id: profile?.id ?? createLocalId(),
      nickname: (nicknameDraft.trim() || 'Исследователь').slice(0, 32),
      birthYear: birthYearDraft && Number(birthYearDraft) >= 1900 && Number(birthYearDraft) <= new Date().getFullYear() ? Number(birthYearDraft) : undefined,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    };
    await saveLocalProfile(nextProfile);
    const nextSelection = selection;
    await saveLocalSetting('education-selection', nextSelection);
    setProfile(nextProfile);
    setSelection(nextSelection);
    setIsOnboarding(false);
    setActiveSection('home');
  }

  function toggleTrack(track: EducationTrack) {
    setSelection((current) => {
      const tracks = current.tracks.includes(track)
        ? current.tracks.filter((item) => item !== track)
        : [...current.tracks, track];
      return { ...current, tracks };
    });
  }

  function toggleExpanded(id: string) {
    setExpandedItems((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  const activeTitle = navigation.find((item) => item.id === activeSection)?.label ?? 'PHYSICS';

  if (isProfileLoading) {
    return <div className="boot-screen"><span className="brand-mark">P</span><strong>PHYSICS</strong><span>Подготавливаем учебное пространство…</span></div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActiveSection('home')} aria-label="PHYSICS — главная">
          <span className="brand-mark">P</span>
          <span><strong>PHYSICS</strong><small>ПЛАТФОРМА ЗНАНИЙ</small></span>
        </button>
        <div className="sidebar-caption">РАЗДЕЛЫ</div>
        <nav className="side-navigation" aria-label="Основная навигация">
          {navigation.map((item) => (
            <button className={`nav-item ${activeSection === item.id ? 'active' : ''}`} key={item.id} onClick={() => setActiveSection(item.id)}>
              <FontAwesomeIcon icon={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-indicator"><span className={`status-dot ${isOnline ? 'online' : 'offline'}`} /><span>{isOnline ? localStatus : 'Офлайн · работа продолжается'}</span></div>
          <button className="theme-button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark')}>
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
            <span>{theme === 'system' ? 'Системная тема' : theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand" onClick={() => setActiveSection('home')}><span className="brand-mark">P</span><strong>PHYSICS</strong></div>
          <div className="topbar-context">{activeTitle}</div>
          <div className="topbar-actions">
            <div className={`connection-pill ${isOnline ? 'connected' : 'disconnected'}`}><FontAwesomeIcon icon={isOnline ? faWifi : faCloudArrowDown} /><span>{isOnline ? 'Онлайн' : 'Офлайн'}</span></div>
            <button className="profile-chip" onClick={() => setActiveSection('profile')}>
              <span className="avatar-placeholder">{(profile?.nickname ?? 'И').slice(0, 1).toUpperCase()}</span>
              <span>{profile?.nickname ?? 'Исследователь'}</span>
            </button>
          </div>
        </header>

        {activeSection === 'home' && (
          <HomePage
            nickname={profile?.nickname ?? 'Исследователь'}
            trackLabels={selectedTrackLabels}
            progress={progress}
            catalogState={catalogState}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'learning' && (
          <LearningPage
            catalog={catalog}
            state={catalogState}
            expandedItems={expandedItems}
            onToggle={toggleExpanded}
          />
        )}

        {activeSection === 'testing' && <TestingPage />}

        {activeSection === 'laboratory' && (
          <LaboratoryPage height={height} onHeightChange={setHeight} />
        )}

        {activeSection === 'progress' && <ProgressPage progress={progress} />}

        {activeSection === 'profile' && (
          <ProfilePage
            nickname={nicknameDraft}
            birthYear={birthYearDraft}
            selection={selection}
            theme={theme}
            onNicknameChange={setNicknameDraft}
            onBirthYearChange={setBirthYearDraft}
            onToggleTrack={toggleTrack}
            onGradeChange={(grade) => setSelection((current) => ({ ...current, grade }))}
            onThemeChange={setTheme}
            onSave={() => saveProfile()}
          />
        )}
      </main>

      <nav className="mobile-navigation" aria-label="Основная навигация">
        {navigation.map((item) => (
          <button key={item.id} className={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)} aria-label={item.label}>
            <FontAwesomeIcon icon={item.icon} /><span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {isOnboarding && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card" aria-labelledby="onboarding-title">
            <div className="onboarding-mark"><FontAwesomeIcon icon={faAtom} /></div>
            <div className="eyebrow">ТВОЁ УЧЕБНОЕ ПРОСТРАНСТВО</div>
            <h1 id="onboarding-title">Добро пожаловать в PHYSICS</h1>
            <p className="page-lead">Настрой профиль и выбери направления обучения. Всё можно изменить позже.</p>
            <label className="field-label" htmlFor="onboarding-nickname">Как к тебе обращаться?</label>
            <input id="onboarding-nickname" className="text-input" value={nicknameDraft} maxLength={32} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="Твоё имя или псевдоним" />
            <div className="field-label">Выбери направления</div>
            <div className="track-options">
              {trackOptions.map((option) => (
                <button type="button" key={option.id} className={`track-option ${selection.tracks.includes(option.id) ? 'selected' : ''}`} onClick={() => toggleTrack(option.id)}>
                  <span className="track-check"><FontAwesomeIcon icon={faCheck} /></span>
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                </button>
              ))}
            </div>
            {selection.tracks.some((track) => track.startsWith('school_')) && (
              <label className="field-label" htmlFor="onboarding-grade">Класс</label>
            )}
            {selection.tracks.some((track) => track.startsWith('school_')) && (
              <select id="onboarding-grade" className="text-input" value={selection.grade} onChange={(event) => setSelection((current) => ({ ...current, grade: event.target.value }))}>
                {['7', '8', '9', '10', '11'].map((grade) => <option value={grade} key={grade}>{grade} класс</option>)}
              </select>
            )}
            <div className="onboarding-actions">
              <button className="text-button" onClick={() => saveProfile(true)}>Пропустить настройку</button>
              <button className="primary-button" onClick={() => saveProfile()}>Начать работу <FontAwesomeIcon icon={faChevronRight} /></button>
            </div>
            <p className="privacy-note">Профиль сохраняется на этом устройстве. Аккаунт можно будет подключить позже.</p>
          </section>
        </div>
      )}
    </div>
  );
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-header"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-lead">{description}</p></div>;
}

function HomePage({ nickname, trackLabels, progress, catalogState, onNavigate }: {
  nickname: string;
  trackLabels: string[];
  progress: ProgressSnapshot;
  catalogState: string;
  onNavigate: (section: SectionKey) => void;
}) {
  return (
    <section className="page-content">
      <div className="welcome-row">
        <div><div className="eyebrow">ТВОЙ УЧЕБНЫЙ ЦЕНТР</div><h1>Привет, {nickname}!</h1><p className="page-lead">Физика становится понятнее, когда изучаешь её шаг за шагом.</p></div>
        <div className="welcome-symbol"><FontAwesomeIcon icon={faAtom} /></div>
      </div>
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-kicker">PHYSICS · LEARNING SPACE</div>
          <h2>Исследуй законы, которые управляют миром</h2>
          <p>Теория, задачи и эксперименты — в едином учебном пространстве.</p>
          <button className="primary-button" onClick={() => onNavigate('learning')}>Перейти к обучению <FontAwesomeIcon icon={faChevronRight} /></button>
        </div>
        <div className="hero-visual"><div className="atom-orbit orbit-a" /><div className="atom-orbit orbit-b" /><div className="atom-glow"><FontAwesomeIcon icon={faAtom} /></div><span className="visual-caption">UNDERSTAND THE UNIVERSE</span></div>
      </section>
      <div className="section-heading"><div><div className="eyebrow">ТВОЯ ПЛАТФОРМА</div><h2>Основные разделы</h2></div></div>
      <div className="feature-grid">
        <FeatureCard icon={faBookOpen} title="Обучение" subtitle="Программы, темы и уроки" tone="blue" onClick={() => onNavigate('learning')} />
        <FeatureCard icon={faClipboardCheck} title="Тестирование" subtitle="Тренировки и итоговые работы" tone="violet" onClick={() => onNavigate('testing')} />
        <FeatureCard icon={faFlask} title="Лаборатория" subtitle="Интерактивные физические модели" tone="teal" onClick={() => onNavigate('laboratory')} />
        <FeatureCard icon={faChartLine} title="Мой прогресс" subtitle="Результаты и освоенные темы" tone="amber" onClick={() => onNavigate('progress')} />
      </div>
      <div className="dashboard-grid">
        <section className="panel dashboard-panel">
          <div className="panel-heading"><span className="panel-icon"><FontAwesomeIcon icon={faGraduationCap} /></span><div><h3>Мои направления</h3><p>Выбранные образовательные траектории</p></div></div>
          {trackLabels.length ? <div className="tag-list">{trackLabels.map((label) => <span className="soft-tag" key={label}>{label}</span>)}</div> : <p className="muted-copy">Направления пока не выбраны.</p>}
          <button className="inline-action" onClick={() => onNavigate('profile')}>Настроить профиль <FontAwesomeIcon icon={faChevronRight} /></button>
        </section>
        <section className="panel dashboard-panel">
          <div className="panel-heading"><span className="panel-icon"><FontAwesomeIcon icon={faChartLine} /></span><div><h3>Текущий прогресс</h3><p>Данные с этого устройства</p></div></div>
          <div className="mini-stats"><div><strong>{progress.lessons}</strong><span>Начато уроков</span></div><div><strong>{progress.mastered}</strong><span>Освоено</span></div><div><strong>{progress.attempts}</strong><span>Попыток</span></div></div>
          <button className="inline-action" onClick={() => onNavigate('progress')}>Открыть статистику <FontAwesomeIcon icon={faChevronRight} /></button>
        </section>
      </div>
      {catalogState === 'empty' && <div className="notice-line"><FontAwesomeIcon icon={faCloudArrowDown} /><span>Учебный каталог подключён. Программы появятся после завершения проверки и публикации материалов.</span></div>}
    </section>
  );
}

function FeatureCard({ icon, title, subtitle, tone, onClick }: {
  icon: typeof faBookOpen; title: string; subtitle: string; tone: string; onClick: () => void;
}) {
  return <button className="feature-card" onClick={onClick}><span className={`feature-icon ${tone}`}><FontAwesomeIcon icon={icon} /></span><span className="feature-copy"><strong>{title}</strong><small>{subtitle}</small></span><FontAwesomeIcon className="feature-arrow" icon={faChevronRight} /></button>;
}

function LearningPage({ catalog, state, expandedItems, onToggle }: {
  catalog: CatalogProgram[];
  state: 'loading' | 'ready' | 'offline' | 'empty' | 'error';
  expandedItems: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className="page-content">
      <PageHeader eyebrow="УЧЕБНЫЙ ЦЕНТР" title="Обучение" description="Выбирай образовательную программу, переходи к темам и изучай физику в удобном темпе." />
      <div className="catalog-toolbar"><div className="catalog-status"><span className={`status-dot ${state === 'error' ? 'offline' : 'online'}`} />{state === 'offline' ? 'Сохранённый каталог' : state === 'ready' ? 'Каталог обновлён' : state === 'loading' ? 'Загружаем каталог' : state === 'error' ? 'Нет подключения к каталогу' : 'Каталог подключён'}</div><span className="catalog-count">{catalog.length} программ</span></div>
      {catalog.length > 0 ? <div className="catalog-list">{catalog.map((program) => (
        <article className="catalog-card" key={program.id}>
          <button className="catalog-row" onClick={() => onToggle(program.id)}><span className="catalog-symbol"><FontAwesomeIcon icon={faGraduationCap} /></span><span className="catalog-title"><strong>{program.name}</strong><small>{program.description ?? program.educationTrack}</small></span><FontAwesomeIcon icon={expandedItems.includes(program.id) ? faChevronDown : faChevronRight} /></button>
          {expandedItems.includes(program.id) && <div className="catalog-nested">{program.versions.map((version) => <div key={version.id}><button className="nested-row" onClick={() => onToggle(version.id)}>{version.title}<FontAwesomeIcon icon={expandedItems.includes(version.id) ? faChevronDown : faChevronRight} /></button>{expandedItems.includes(version.id) && version.levels.map((level) => <div className="level-row" key={level.id}><strong>{level.title}</strong>{level.sections.map((section) => <div className="section-row" key={section.id}><span>{section.title}</span>{section.topics.map((topic) => <div className="topic-row" key={topic.id}>{topic.title}{topic.lessons.map((lesson) => <div className="lesson-row" key={lesson.id}><span>{lesson.title}</span><small>{lesson.estimatedMinutes ? `${lesson.estimatedMinutes} мин.` : 'Урок'}</small></div>)}</div>)}</div>)}</div>)}</div>)}</div>}
        </article>
      ))}</div> : (
        <div className="empty-panel">
          <div className="empty-illustration"><FontAwesomeIcon icon={faBookOpen} /></div>
          <h2>{state === 'loading' ? 'Загружаем учебные программы' : state === 'error' ? 'Не удалось загрузить каталог' : 'Каталог готовится к публикации'}</h2>
          <p>{state === 'error' ? 'Проверь подключение к интернету. Если каталог уже загружался, попробуй открыть раздел позже — сохранённые данные останутся на устройстве.' : 'Структура школьных программ уже подготовлена. Сейчас материалы проходят проверку, поэтому мы не показываем незавершённые уроки как готовые.'}</p>
          {state === 'error' && <button className="secondary-button" onClick={() => window.location.reload()}><FontAwesomeIcon icon={faRotate} /> Повторить загрузку</button>}
        </div>
      )}
    </section>
  );
}

function TestingPage() {
  return (
    <section className="page-content">
      <PageHeader eyebrow="ПРОВЕРКА ЗНАНИЙ" title="Тестирование" description="Тренируйся без оценок или проверяй освоение материала итоговыми работами." />
      <div className="testing-intro panel"><div className="testing-icon"><FontAwesomeIcon icon={faClipboardCheck} /></div><div><h2>Банк вопросов PHYSICS</h2><p>Официальный банк из 900 вопросов сохранён отдельно и защищён от изменения. Сейчас готовим безопасную выдачу заданий и сохранение попыток.</p><span className="soft-tag">900 вопросов · 9 разделов</span></div></div>
      <div className="mode-grid">
        <div className="mode-card"><span className="mode-number">01</span><h3>Тренировка</h3><p>Без таймера и оценки. После ответа — объяснение и разбор ошибки.</p><span className="mode-state">Подключается</span></div>
        <div className="mode-card"><span className="mode-number">02</span><h3>Итоговая работа</h3><p>Результат по шкале PHYSICS, история всех попыток и лучший результат.</p><span className="mode-state">Подключается</span></div>
        <div className="mode-card"><span className="mode-number">03</span><h3>Своя подборка</h3><p>Выбор разделов, количества вопросов и уровня сложности.</p><span className="mode-state">Подключается</span></div>
      </div>
      <div className="notice-line"><FontAwesomeIcon icon={faBookmark} /><span>Вопросы не подменяются демонстрационными: тестирование откроется, когда подключим выдачу оригинального банка.</span></div>
    </section>
  );
}

function LaboratoryPage({ height, onHeightChange }: { height: number; onHeightChange: (value: number) => void }) {
  const gravity = 9.81;
  const time = Math.sqrt((2 * height) / gravity);
  const velocity = gravity * time;
  return (
    <section className="page-content">
      <PageHeader eyebrow="ИНТЕРАКТИВНЫЕ ЭКСПЕРИМЕНТЫ" title="Лаборатория" description="Исследуй физические закономерности с помощью моделей, параметров и измерений." />
      <div className="lab-card">
        <div className="lab-heading"><span className="lab-symbol"><FontAwesomeIcon icon={faFlask} /></span><div><div className="eyebrow">МОДЕЛЬ № 001</div><h2>Свободное падение</h2><p>Идеализированное движение тела без учёта сопротивления воздуха.</p></div></div>
        <div className="lab-workspace">
          <div className="lab-visual"><div className="height-ruler"><span>0 м</span><span>{height} м</span></div><div className="drop-path"><div className="drop-object" style={{ top: `${100 - height}%` }} /><div className="ground-line" /></div><span className="visual-caption">g = 9,81 м/с²</span></div>
          <div className="lab-controls">
            <label htmlFor="drop-height">Высота падения</label>
            <div className="range-value"><strong>{height} м</strong><span>1–100 м</span></div>
            <input id="drop-height" type="range" min="1" max="100" value={height} onChange={(event) => onHeightChange(Number(event.target.value))} />
            <div className="range-labels"><span>1 м</span><span>100 м</span></div>
            <div className="formula-block"><span>Время падения</span><strong>t = √(2h / g)</strong><b>{time.toFixed(2)} с</b></div>
            <div className="formula-block"><span>Скорость перед ударом</span><strong>v = g · t</strong><b>{velocity.toFixed(2)} м/с</b></div>
            <button className="secondary-button" onClick={() => onHeightChange(20)}><FontAwesomeIcon icon={faRotate} /> Сбросить параметры</button>
          </div>
        </div>
        <div className="lab-explanation"><strong>Что показывает модель?</strong><p>Чем больше высота, тем больше время падения и скорость в конце движения. При увеличении высоты в 4 раза время увеличивается в 2 раза — это следует из зависимости t от квадратного корня высоты.</p></div>
      </div>
    </section>
  );
}

function ProgressPage({ progress }: { progress: ProgressSnapshot }) {
  return (
    <section className="page-content">
      <PageHeader eyebrow="ТВОИ РЕЗУЛЬТАТЫ" title="Мой прогресс" description="Здесь собираются результаты обучения, тестов и повторения сложных тем." />
      <div className="progress-grid">
        <ProgressMetric title="Начато уроков" value={progress.lessons} icon={faBookOpen} />
        <ProgressMetric title="Освоено уроков" value={progress.mastered} icon={faCheck} />
        <ProgressMetric title="Попыток тестирования" value={progress.attempts} icon={faClipboardCheck} />
        <ProgressMetric title="В избранном" value={progress.favorites} icon={faBookmark} />
      </div>
      <div className="panel progress-detail"><div className="panel-heading"><span className="panel-icon"><FontAwesomeIcon icon={faRotate} /></span><div><h3>Работа над ошибками</h3><p>Вопросы, к которым стоит вернуться</p></div></div><div className="mistake-summary"><strong>{progress.errors}</strong><span>сохранённых вопросов с ошибками</span></div><p className="muted-copy">Ошибки будут автоматически собираться во время тестирования. Повторение не влияет на итоговую оценку.</p></div>
      <div className="notice-line"><FontAwesomeIcon icon={faCloudArrowDown} /><span>Статистика сейчас отражает данные на этом устройстве. Синхронизация между устройствами будет подключена отдельным защищённым этапом.</span></div>
    </section>
  );
}

function ProgressMetric({ title, value, icon }: { title: string; value: number; icon: typeof faBookOpen }) {
  return <div className="metric-card"><span className="metric-icon"><FontAwesomeIcon icon={icon} /></span><strong>{value}</strong><span>{title}</span></div>;
}

function ProfilePage({ nickname, birthYear, selection, theme, onNicknameChange, onBirthYearChange, onToggleTrack, onGradeChange, onThemeChange, onSave }: {
  nickname: string;
  birthYear: string;
  selection: EducationSelection;
  theme: ThemeMode;
  onNicknameChange: (value: string) => void;
  onBirthYearChange: (value: string) => void;
  onToggleTrack: (value: EducationTrack) => void;
  onGradeChange: (value: string) => void;
  onThemeChange: (value: ThemeMode) => void;
  onSave: () => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  async function handleSave() {
    await onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }
  return (
    <section className="page-content">
      <PageHeader eyebrow="ЛИЧНЫЕ НАСТРОЙКИ" title="Профиль" description="Настрой учебные направления и внешний вид PHYSICS. Профиль хранится локально на устройстве." />
      <div className="profile-layout">
        <section className="panel profile-panel">
          <div className="panel-heading"><span className="panel-icon"><FontAwesomeIcon icon={faUser} /></span><div><h3>Основная информация</h3><p>Имя и учебные направления</p></div></div>
          <label className="field-label" htmlFor="profile-nickname">Никнейм</label><input id="profile-nickname" className="text-input" value={nickname} maxLength={32} onChange={(event) => onNicknameChange(event.target.value)} />
          <label className="field-label" htmlFor="profile-birth-year">Год рождения <span className="optional-label">необязательно</span></label><input id="profile-birth-year" className="text-input" type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => onBirthYearChange(event.target.value)} placeholder="Например, 2008" />
          <div className="field-label">Образовательные направления</div>
          <div className="track-options profile-track-options">{trackOptions.map((option) => <button type="button" key={option.id} className={`track-option ${selection.tracks.includes(option.id) ? 'selected' : ''}`} onClick={() => onToggleTrack(option.id)}><span className="track-check"><FontAwesomeIcon icon={faCheck} /></span><span><strong>{option.title}</strong><small>{option.description}</small></span></button>)}</div>
          {selection.tracks.some((track) => track.startsWith('school_')) && <><label className="field-label" htmlFor="profile-grade">Текущий класс</label><select id="profile-grade" className="text-input" value={selection.grade} onChange={(event) => onGradeChange(event.target.value)}>{['7','8','9','10','11'].map((grade) => <option key={grade} value={grade}>{grade} класс</option>)}</select></>}
          <button className="primary-button save-profile-button" onClick={handleSave}>{saved ? 'Сохранено' : 'Сохранить изменения'} <FontAwesomeIcon icon={saved ? faCheck : faChevronRight} /></button>
        </section>
        <section className="panel profile-panel">
          <div className="panel-heading"><span className="panel-icon"><FontAwesomeIcon icon={faSliders} /></span><div><h3>Внешний вид</h3><p>Настрой интерфейс под себя</p></div></div>
          <div className="theme-options">{(['system','light','dark'] as ThemeMode[]).map((mode) => <button key={mode} className={`theme-option ${theme === mode ? 'selected' : ''}`} onClick={() => onThemeChange(mode)}><FontAwesomeIcon icon={mode === 'dark' ? faMoon : mode === 'light' ? faSun : faSliders} /><span>{mode === 'system' ? 'Как на устройстве' : mode === 'light' ? 'Светлая' : 'Тёмная'}</span>{theme === mode && <FontAwesomeIcon className="theme-check" icon={faCheck} />}</button>)}</div>
          <div className="profile-info"><strong>Локальное хранение</strong><p>Профиль, настройки и учебный прогресс сохраняются на устройстве даже без интернета.</p></div>
          <div className="profile-info"><strong>Облачная синхронизация</strong><p>Подключим после завершения авторизации и серверной защиты данных.</p></div>
        </section>
      </div>
    </section>
  );
}

export default App;
