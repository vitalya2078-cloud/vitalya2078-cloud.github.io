-- Source metadata extracted from the 2025 EDSOO federal working-program PDFs.
-- Printed page ranges refer to the thematic-planning sections in each PDF.
-- Total hours are recorded by grade and level; no reserve-hour split is inferred.
-- All records remain draft.

with source_rows(program_code, level_code, source_title, source_url, source_version, total_hours, page_start, page_end) as (
  values
    ('school-physics-ooo-basic','7','Федеральная рабочая программа. Физика. 7–9 классы (базовый уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika-7-9_baz.pdf','2025',68,31,40),
    ('school-physics-ooo-basic','8','Федеральная рабочая программа. Физика. 7–9 классы (базовый уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika-7-9_baz.pdf','2025',68,41,49),
    ('school-physics-ooo-basic','9','Федеральная рабочая программа. Физика. 7–9 классы (базовый уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika-7-9_baz.pdf','2025',102,50,63),
    ('school-physics-ooo-advanced','7','Федеральная рабочая программа. Физика. 7–9 классы (углубленный уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika_7-9_ugl.pdf','2025',102,33,45),
    ('school-physics-ooo-advanced','8','Федеральная рабочая программа. Физика. 7–9 классы (углубленный уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika_7-9_ugl.pdf','2025',102,46,56),
    ('school-physics-ooo-advanced','9','Федеральная рабочая программа. Физика. 7–9 классы (углубленный уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika_7-9_ugl.pdf','2025',136,57,72),
    ('school-physics-soo-basic','10','Федеральная рабочая программа. Физика. 10–11 классы (базовый уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_baz.pdf','2025',68,29,43),
    ('school-physics-soo-basic','11','Федеральная рабочая программа. Физика. 10–11 классы (базовый уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_baz.pdf','2025',68,44,58),
    ('school-physics-soo-advanced','10','Федеральная рабочая программа. Физика. 10–11 классы (углубленный уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_ugl.pdf','2025',170,39,60),
    ('school-physics-soo-advanced','11','Федеральная рабочая программа. Физика. 10–11 классы (углубленный уровень)','https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_ugl.pdf','2025',170,61,78)
)
insert into physics.education_level_plans(
  education_level_id, source_title, source_url, source_version,
  total_hours, thematic_plan_page_start, thematic_plan_page_end, status
)
select el.id, sr.source_title, sr.source_url, sr.source_version,
       sr.total_hours, sr.page_start, sr.page_end, 'draft'
from source_rows sr
join physics.education_programs ep on ep.code=sr.program_code
join physics.program_versions pv on pv.program_id=ep.id and pv.version_code=sr.source_version
join physics.education_levels el on el.program_version_id=pv.id and el.code=sr.level_code
on conflict (education_level_id) do update set
  source_title=excluded.source_title,
  source_url=excluded.source_url,
  source_version=excluded.source_version,
  total_hours=excluded.total_hours,
  thematic_plan_page_start=excluded.thematic_plan_page_start,
  thematic_plan_page_end=excluded.thematic_plan_page_end,
  updated_at=now();
