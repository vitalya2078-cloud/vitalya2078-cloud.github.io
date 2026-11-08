alter table physics.legacy_test_topics
  add column source_title text;

drop trigger legacy_test_topics_immutable on physics.legacy_test_topics;

update physics.legacy_test_topics
set source_title = case sort_order
  when 1 then 'Механика'
  when 2 then 'Электростатика и постоянный электрический ток'
  when 3 then 'Электромагнетизм'
  when 4 then 'Основы молекулярной физики и термодинамики'
  when 5 then 'Колебания и волны'
  when 6 then 'Волновая оптика'
  when 7 then 'Квантовая физика'
  when 8 then 'Основы физики твердого тела'
  when 9 then 'Ядерная физика'
end;

alter table physics.legacy_test_topics
  alter column source_title set not null;

create trigger legacy_test_topics_immutable
before update or delete on physics.legacy_test_topics
for each row execute function physics.reject_official_bank_mutation();

create table physics.question_bank_imports (
  id uuid primary key default gen_random_uuid(),
  bank_set_id uuid not null references physics.question_bank_sets(id) on delete restrict,
  source_file_path text not null,
  source_branch text not null,
  source_commit_sha text not null,
  source_blob_sha text not null,
  expected_question_count integer not null check (expected_question_count > 0),
  imported_question_count integer not null check (imported_question_count >= 0),
  imported_at timestamptz not null default now(),
  unique (bank_set_id, source_blob_sha)
);

alter table physics.question_bank_imports enable row level security;
revoke all on table physics.question_bank_imports from public, anon, authenticated;
grant all on table physics.question_bank_imports to service_role;
create policy deny_all_until_auth_question_bank_imports
  on physics.question_bank_imports
  for all to public
  using (false)
  with check (false);

create trigger question_bank_imports_immutable
before update or delete on physics.question_bank_imports
for each row execute function physics.reject_official_bank_mutation();
