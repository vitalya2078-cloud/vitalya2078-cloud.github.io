-- Draft outline for federal school physics programs, grades 10–11.
-- Source: EDSOO 2025 federal working programs, basic and advanced levels.
-- Only section/topic headings are imported; all content remains draft.

with topic_rows(program_code, level_code, topic_slug, topic_title, sort_order) as (
  values
    -- Basic, grade 10
    ('school-physics-soo-basic','10','physics-and-scientific-method','Физика и методы научного познания',1),
    ('school-physics-soo-basic','10','mechanics','Механика',2),
    ('school-physics-soo-basic','10','molecular-physics-and-thermodynamics','Молекулярная физика и термодинамика',3),
    ('school-physics-soo-basic','10','electrodynamics','Электродинамика',4),

    -- Basic, grade 11
    ('school-physics-soo-basic','11','electrodynamics','Электродинамика',1),
    ('school-physics-soo-basic','11','oscillations-and-waves','Колебания и волны',2),
    ('school-physics-soo-basic','11','optics','Оптика',3),
    ('school-physics-soo-basic','11','special-relativity','Основы специальной теории относительности',4),
    ('school-physics-soo-basic','11','quantum-physics','Квантовая физика',5),
    ('school-physics-soo-basic','11','astrophysics','Элементы астрофизики',6),

    -- Advanced, grade 10
    ('school-physics-soo-advanced','10','scientific-method','Научный метод познания природы',1),
    ('school-physics-soo-advanced','10','mechanics','Механика',2),
    ('school-physics-soo-advanced','10','molecular-physics-and-thermodynamics','Молекулярная физика и термодинамика',3),
    ('school-physics-soo-advanced','10','electrodynamics','Электродинамика',4),
    ('school-physics-soo-advanced','10','physics-practicum','Физический практикум',5),

    -- Advanced, grade 11
    ('school-physics-soo-advanced','11','electrodynamics','Электродинамика',1),
    ('school-physics-soo-advanced','11','oscillations-and-waves','Колебания и волны',2),
    ('school-physics-soo-advanced','11','optics','Оптика',3),
    ('school-physics-soo-advanced','11','quantum-physics','Квантовая физика',4),
    ('school-physics-soo-advanced','11','astrophysics','Элементы астрофизики',5),
    ('school-physics-soo-advanced','11','physics-practicum','Физический практикум',6)
),
section_rows as (
  select distinct program_code, level_code
  from topic_rows
),
upserted_sections as (
  insert into physics.sections(level_id, slug, title, description, sort_order, status)
  select
    el.id,
    'federal-content',
    'Содержание обучения',
    'Черновая структура по федеральной рабочей программе 2025 года. Заголовки тематических разделов сохранены по источнику.',
    1,
    'draft'
  from section_rows sr
  join physics.education_programs ep on ep.code = sr.program_code
  join physics.program_versions pv on pv.program_id = ep.id and pv.version_code = '2025'
  join physics.education_levels el on el.program_version_id = pv.id and el.code = sr.level_code
  on conflict (level_id, slug) do update set
    title = excluded.title,
    description = excluded.description,
    updated_at = now()
  returning id, level_id
)
insert into physics.topics(section_id, slug, title, description, sort_order, status)
select
  us.id,
  tr.topic_slug,
  tr.topic_title,
  'Заголовок тематического раздела из федеральной рабочей программы 2025 года; детализация на уроки и подтемы ожидает сверки с тематическим планированием.',
  tr.sort_order,
  'draft'
from topic_rows tr
join physics.education_programs ep on ep.code = tr.program_code
join physics.program_versions pv on pv.program_id = ep.id and pv.version_code = '2025'
join physics.education_levels el on el.program_version_id = pv.id and el.code = tr.level_code
join upserted_sections us on us.level_id = el.id
on conflict (section_id, slug) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();
