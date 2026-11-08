-- PHYSICS school curriculum foundation.
-- Draft metadata only: nothing is published to the student API until content review.
-- Safe to re-run: stable program codes and version codes are upserted.

with source_rows (
  code, name, description, education_track, audience,
  version_code, version_title, source_name, source_url
) as (
  values
    (
      'school-physics-ooo-basic',
      'Физика — основное общее образование, базовый уровень',
      'Федеральная рабочая программа по физике для 7–9 классов.',
      'school',
      '7–9 классы',
      '2025',
      'Федеральная рабочая программа 2025',
      'Федеральная рабочая программа. Физика. 7–9 классы (базовый уровень), 2025',
      'https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika-7-9_baz.pdf'
    ),
    (
      'school-physics-ooo-advanced',
      'Физика — основное общее образование, углублённый уровень',
      'Федеральная рабочая программа по физике для 7–9 классов.',
      'school',
      '7–9 классы',
      '2025',
      'Федеральная рабочая программа 2025',
      'Федеральная рабочая программа. Физика. 7–9 классы (углублённый уровень), 2025',
      'https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika_7-9_ugl.pdf'
    ),
    (
      'school-physics-soo-basic',
      'Физика — среднее общее образование, базовый уровень',
      'Федеральная рабочая программа по физике для 10–11 классов.',
      'school',
      '10–11 классы',
      '2025',
      'Федеральная рабочая программа 2025',
      'Федеральная рабочая программа. Физика. 10–11 классы (базовый уровень), 2025',
      'https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_baz.pdf'
    ),
    (
      'school-physics-soo-advanced',
      'Физика — среднее общее образование, углублённый уровень',
      'Федеральная рабочая программа по физике для 10–11 классов.',
      'school',
      '10–11 классы',
      '2025',
      'Федеральная рабочая программа 2025',
      'Федеральная рабочая программа. Физика. 10–11 классы (углублённый уровень), 2025',
      'https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_ugl.pdf'
    )
),
upserted_programs as (
  insert into physics.education_programs
    (code, name, description, education_track, audience, status)
  select code, name, description, education_track, audience, 'draft'
  from source_rows
  on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    education_track = excluded.education_track,
    audience = excluded.audience,
    updated_at = now()
  returning id, code
)
insert into physics.program_versions
  (program_id, version_code, title, source_name, source_url, status)
select
  programs.id,
  source_rows.version_code,
  source_rows.version_title,
  source_rows.source_name,
  source_rows.source_url,
  'draft'
from source_rows
join upserted_programs programs using (code)
on conflict (program_id, version_code) do update set
  title = excluded.title,
  source_name = excluded.source_name,
  source_url = excluded.source_url;
