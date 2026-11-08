-- Draft curriculum outline from the 2025 EDSOO federal working programs.
-- Only official section/topic headings are loaded; lesson text is authored separately.
-- All records remain draft and are not visible in the public catalog.

with topic_rows(program_code, level_code, topic_slug, topic_title, sort_order) as (
  values
    -- Basic level, grades 7–9
    ('school-physics-ooo-basic','7','physics-and-scientific-method','Физика и ее роль в познании окружающего мира',1),
    ('school-physics-ooo-basic','7','structure-of-matter','Первоначальные сведения о строении вещества',2),
    ('school-physics-ooo-basic','7','motion-and-interaction','Движение и взаимодействие тел',3),
    ('school-physics-ooo-basic','7','pressure','Давление твердых тел, жидкостей и газов',4),
    ('school-physics-ooo-basic','7','work-power-energy','Работа и мощность. Энергия',5),
    ('school-physics-ooo-basic','8','thermal-phenomena','Тепловые явления',1),
    ('school-physics-ooo-basic','8','electrical-and-magnetic-phenomena','Электрические и магнитные явления',2),
    ('school-physics-ooo-basic','8','light-phenomena','Световые явления',3),
    ('school-physics-ooo-basic','9','mechanical-phenomena','Механические явления',1),
    ('school-physics-ooo-basic','9','mechanical-oscillations-and-waves','Механические колебания и волны',2),
    ('school-physics-ooo-basic','9','electromagnetic-field-and-waves','Электромагнитное поле и электромагнитные волны',3),
    ('school-physics-ooo-basic','9','light-phenomena','Световые явления',4),
    ('school-physics-ooo-basic','9','quantum-phenomena','Квантовые явления',5),
    ('school-physics-ooo-basic','9','review-module','Повторительно-обобщающий модуль',6),

    -- Advanced level, grades 7–9
    ('school-physics-ooo-advanced','7','physics-and-scientific-method','Физика и ее роль в познании окружающего мира',1),
    ('school-physics-ooo-advanced','7','structure-of-matter','Первоначальные сведения о строении вещества',2),
    ('school-physics-ooo-advanced','7','motion-and-interaction','Движение и взаимодействие тел',3),
    ('school-physics-ooo-advanced','7','pressure','Давление твердых тел, жидкостей и газов',4),
    ('school-physics-ooo-advanced','7','work-power-energy','Работа и мощность. Энергия',5),
    ('school-physics-ooo-advanced','8','thermal-phenomena','Тепловые явления',1),
    ('school-physics-ooo-advanced','8','electrical-and-magnetic-phenomena','Электрические и магнитные явления',2),
    ('school-physics-ooo-advanced','9','mechanical-phenomena','Механические явления',1),
    ('school-physics-ooo-advanced','9','mechanical-oscillations-and-waves','Механические колебания и волны',2),
    ('school-physics-ooo-advanced','9','electromagnetic-field-and-waves','Электромагнитное поле и электромагнитные волны',3),
    ('school-physics-ooo-advanced','9','light-phenomena','Световые явления',4),
    ('school-physics-ooo-advanced','9','quantum-phenomena','Квантовые явления',5),
    ('school-physics-ooo-advanced','9','review-module','Повторительно-обобщающий модуль',6)
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
    'Черновая структура по федеральной рабочей программе 2025 года. Заголовки тем сохранены по источнику.',
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
  'Заголовок тематического блока из федеральной рабочей программы 2025 года; подробная разбивка на уроки ожидает сверки с тематическим планированием.',
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
