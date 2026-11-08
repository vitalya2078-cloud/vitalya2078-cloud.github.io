create schema if not exists physics;

revoke all on schema physics from public, anon, authenticated;
grant usage on schema physics to service_role;

create table physics.education_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  education_track text not null check (education_track in ('school','college','technical_college','university','other')),
  audience text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table physics.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references physics.education_programs(id) on delete restrict,
  version_code text not null,
  title text not null,
  source_name text,
  source_url text,
  effective_from date,
  effective_to date,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  unique (program_id, version_code)
);

create table physics.education_levels (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references physics.program_versions(id) on delete restrict,
  code text not null,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (program_version_id, code),
  unique (program_version_id, sort_order)
);

create table physics.sections (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references physics.education_levels(id) on delete restrict,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, slug),
  unique (level_id, sort_order)
);

create table physics.topics (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references physics.sections(id) on delete restrict,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, slug),
  unique (section_id, sort_order)
);

create table physics.topic_prerequisites (
  topic_id uuid not null references physics.topics(id) on delete cascade,
  prerequisite_topic_id uuid not null references physics.topics(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (topic_id, prerequisite_topic_id),
  check (topic_id <> prerequisite_topic_id)
);

create table physics.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references physics.topics(id) on delete restrict,
  slug text not null,
  title text not null,
  summary text,
  sort_order integer not null default 0,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  content_version integer not null default 1 check (content_version > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, slug),
  unique (topic_id, sort_order)
);

create table physics.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references physics.lessons(id) on delete cascade,
  block_type text not null check (block_type in (
    'introduction','intuition','concept','law','formula','worked_example',
    'illustration','simulation','experiment','practice','summary','extension','other'
  )),
  title text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, sort_order)
);

create table physics.legacy_test_topics (
  id smallint generated always as identity primary key,
  code text not null unique,
  title text not null,
  sort_order smallint not null unique,
  expected_question_count integer not null default 100 check (expected_question_count > 0)
);

create table physics.question_bank_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  source_description text not null,
  expected_question_count integer not null check (expected_question_count > 0),
  is_immutable boolean not null default true,
  created_at timestamptz not null default now()
);

create table physics.official_questions (
  id uuid primary key default gen_random_uuid(),
  bank_set_id uuid not null references physics.question_bank_sets(id) on delete restrict,
  legacy_topic_id smallint not null references physics.legacy_test_topics(id) on delete restrict,
  source_question_number integer not null check (source_question_number > 0),
  original_text text not null,
  original_options jsonb not null default '[]'::jsonb,
  original_correct_answer jsonb not null,
  original_illustration_refs jsonb not null default '[]'::jsonb,
  original_payload jsonb not null,
  source_hash text,
  imported_at timestamptz not null default now(),
  unique (bank_set_id, legacy_topic_id, source_question_number)
);

create table physics.curriculum_question_mappings (
  topic_id uuid not null references physics.topics(id) on delete cascade,
  legacy_topic_id smallint not null references physics.legacy_test_topics(id) on delete restrict,
  mapping_note text,
  created_at timestamptz not null default now(),
  primary key (topic_id, legacy_topic_id)
);

create table physics.test_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  test_mode text not null check (test_mode in ('topic','random','comprehensive','exam','mistakes','custom','lesson_final','training')),
  is_timed boolean not null default false,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table physics.test_definition_items (
  id uuid primary key default gen_random_uuid(),
  test_definition_id uuid not null references physics.test_definitions(id) on delete cascade,
  official_question_id uuid not null references physics.official_questions(id) on delete restrict,
  sort_order integer not null,
  points numeric(7,2) not null default 1 check (points > 0),
  unique (test_definition_id, sort_order),
  unique (test_definition_id, official_question_id)
);

create table physics.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_definition_id uuid references physics.test_definitions(id) on delete set null,
  mode text not null check (mode in ('training','final','exam','custom','review')),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','abandoned')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  client_attempt_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, client_attempt_id)
);

create table physics.test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references physics.test_attempts(id) on delete cascade,
  official_question_id uuid not null references physics.official_questions(id) on delete restrict,
  answer_payload jsonb not null,
  is_correct boolean,
  points_awarded numeric(7,2),
  answered_at timestamptz not null default now(),
  unique (attempt_id, official_question_id)
);

create table physics.user_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_version_id uuid not null references physics.program_versions(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  unique (user_id, program_version_id)
);

create table physics.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references physics.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  completion_percent numeric(5,2) not null default 0 check (completion_percent between 0 and 100),
  block_progress jsonb not null default '{}'::jsonb,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table physics.lesson_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references physics.lessons(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  score numeric(5,2) not null check (score between 0 and 100),
  grade smallint generated always as (
    case
      when score < 60 then 2
      when score < 75 then 3
      when score < 90 then 4
      else 5
    end
  ) stored,
  answers_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  client_attempt_id uuid,
  unique (user_id, lesson_id, attempt_number),
  unique (user_id, client_attempt_id)
);

create table physics.lesson_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references physics.lessons(id) on delete cascade,
  best_score numeric(5,2) not null default 0 check (best_score between 0 and 100),
  best_grade smallint not null default 2 check (best_grade between 2 and 5),
  is_mastered boolean not null default false,
  mastered_at timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  check (not is_mastered or best_grade >= 3)
);

create table physics.mistake_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  official_question_id uuid not null references physics.official_questions(id) on delete restrict,
  first_missed_at timestamptz not null default now(),
  last_missed_at timestamptz not null default now(),
  miss_count integer not null default 1 check (miss_count > 0),
  corrected_at timestamptz,
  last_reviewed_at timestamptz,
  unique (user_id, official_question_id)
);

create table physics.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in (
    'lesson','topic','formula','definition','question','worked_example','simulation','experiment'
  )),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table physics.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null check (goal_type in ('lessons','problems','minutes')),
  target_value integer not null check (target_value > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table physics.daily_goal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references physics.daily_goals(id) on delete set null,
  goal_date date not null,
  achieved_value integer not null default 0 check (achieved_value >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_id, goal_date)
);

create table physics.sync_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key uuid not null,
  platform text not null check (platform in ('android','ios','web','windows','other')),
  device_label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_key)
);

create table physics.sync_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references physics.sync_devices(id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation_type text not null check (operation_type in ('insert','update','delete')),
  payload jsonb not null default '{}'::jsonb,
  client_version bigint,
  client_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  applied_at timestamptz,
  status text not null default 'pending' check (status in ('pending','applied','conflict','rejected')),
  result jsonb not null default '{}'::jsonb,
  unique (user_id, device_id, operation_id)
);

create index lessons_topic_sort_idx on physics.lessons(topic_id, sort_order);
create index lesson_blocks_lesson_sort_idx on physics.lesson_blocks(lesson_id, sort_order);
create index official_questions_topic_idx on physics.official_questions(legacy_topic_id, source_question_number);
create index test_attempts_user_submitted_idx on physics.test_attempts(user_id, submitted_at desc);
create index lesson_assessment_user_lesson_idx on physics.lesson_assessment_attempts(user_id, lesson_id, submitted_at desc);
create index mistake_items_user_recent_idx on physics.mistake_items(user_id, last_missed_at desc);
create index sync_operations_pending_idx on physics.sync_operations(user_id, status, received_at);

insert into physics.question_bank_sets
  (code, title, source_description, expected_question_count, is_immutable)
values
  ('official-900', 'Официальный тестовый банк PHYSICS — 900 вопросов',
   'Утверждённый исходный банк образовательной организации. Исходные формулировки, варианты, ответы и тематическая принадлежность сохраняются без изменений.',
   900, true);

insert into physics.legacy_test_topics (code, title, sort_order, expected_question_count)
values
  ('mechanics', 'Механика', 1, 100),
  ('electrostatics_dc', 'Электростатика и постоянный ток', 2, 100),
  ('electromagnetism', 'Электромагнетизм', 3, 100),
  ('molecular_thermodynamics', 'Молекулярная физика и термодинамика', 4, 100),
  ('oscillations_waves', 'Колебания и волны', 5, 100),
  ('wave_optics', 'Волновая оптика', 6, 100),
  ('quantum_physics', 'Квантовая физика', 7, 100),
  ('solid_state', 'Физика твёрдого тела', 8, 100),
  ('nuclear_physics', 'Ядерная физика', 9, 100);

create or replace function physics.reject_official_bank_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Official PHYSICS question bank source records are immutable';
end;
$$;

create trigger official_questions_immutable
before update or delete on physics.official_questions
for each row execute function physics.reject_official_bank_mutation();

create trigger question_bank_sets_immutable
before update or delete on physics.question_bank_sets
for each row execute function physics.reject_official_bank_mutation();

create trigger legacy_test_topics_immutable
before update or delete on physics.legacy_test_topics
for each row execute function physics.reject_official_bank_mutation();

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'physics'
  loop
    execute format('alter table %I.%I enable row level security',
      table_record.schemaname, table_record.tablename);
    execute format('revoke all on table %I.%I from public, anon, authenticated',
      table_record.schemaname, table_record.tablename);
    execute format('grant all on table %I.%I to service_role',
      table_record.schemaname, table_record.tablename);
  end loop;
end;
$$;

revoke all on all functions in schema physics from public, anon, authenticated;
grant execute on function physics.reject_official_bank_mutation() to service_role;

alter default privileges in schema physics
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema physics
  grant all on tables to service_role;
alter default privileges in schema physics
  revoke execute on functions from public, anon, authenticated;
