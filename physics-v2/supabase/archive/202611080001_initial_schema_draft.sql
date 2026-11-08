-- ARCHIVED DRAFT — NOT AN ACTIVE MIGRATION.
-- This file was present in the repository but was never applied to the PHYSICS
-- Supabase project. Its public-schema design was superseded by the active
-- private physics-schema migrations. It is retained only for historical
-- reference. Do not execute this file.

-- PHYSICS initial database schema
-- Supabase / PostgreSQL. Apply through Supabase migrations.
-- Official 900-question source content is protected from ordinary updates/deletes.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles and education catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nickname text not null check (char_length(nickname) between 2 and 32),
  birth_year smallint check (birth_year between 1900 and 2100),
  avatar_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.education_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.education_programs (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.education_tracks(id),
  slug text not null unique,
  title text not null,
  description text,
  organization_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.education_programs(id),
  version_label text not null,
  source_reference text,
  effective_from date,
  effective_to date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  unique (program_id, version_label)
);

create table if not exists public.education_levels (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.education_tracks(id),
  slug text not null,
  title text not null,
  level_number integer,
  sort_order integer not null default 0,
  unique (track_id, slug)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  visual_theme jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default false
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id),
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  unique (section_id, slug)
);

create table if not exists public.program_topics (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_versions(id),
  education_level_id uuid references public.education_levels(id),
  topic_id uuid not null references public.topics(id),
  sequence_number integer not null,
  depth_level text not null default 'base' check (depth_level in ('base', 'advanced')),
  is_required boolean not null default true,
  unique (program_version_id, education_level_id, topic_id),
  unique (program_version_id, education_level_id, sequence_number)
);

create table if not exists public.topic_prerequisites (
  topic_id uuid not null references public.topics(id) on delete cascade,
  prerequisite_topic_id uuid not null references public.topics(id) on delete cascade,
  is_recommended boolean not null default true,
  primary key (topic_id, prerequisite_topic_id),
  check (topic_id <> prerequisite_topic_id)
);

-- ---------------------------------------------------------------------------
-- Lessons and reusable learning content
-- ---------------------------------------------------------------------------

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id),
  slug text not null,
  title text not null,
  summary text,
  estimated_minutes integer,
  content_version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table if not exists public.formulas (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id),
  lesson_id uuid references public.lessons(id),
  title text not null,
  expression text not null,
  variables jsonb not null default '[]'::jsonb,
  units jsonb not null default '{}'::jsonb,
  explanation text,
  sort_order integer not null default 0
);

create table if not exists public.definitions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id),
  lesson_id uuid references public.lessons(id),
  term text not null,
  definition text not null,
  sort_order integer not null default 0
);

create table if not exists public.worked_examples (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id),
  lesson_id uuid references public.lessons(id),
  title text not null,
  problem_statement text not null,
  solution_steps jsonb not null default '[]'::jsonb,
  final_answer text,
  difficulty text check (difficulty in ('basic', 'medium', 'advanced')),
  sort_order integer not null default 0
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id),
  lesson_id uuid references public.lessons(id),
  slug text not null unique,
  title text not null,
  description text,
  simulation_config jsonb not null default '{}'::jsonb,
  asset_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived'))
);

create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_type text not null check (block_type in (
    'introduction', 'theory', 'definition', 'formula', 'worked_example',
    'diagram', 'simulation', 'laboratory', 'practice', 'summary'
  )),
  title text,
  body jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  content_version integer not null default 1
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  asset_type text not null check (asset_type in ('image', 'audio', 'video', 'animation', 'model', 'document')),
  mime_type text,
  checksum_sha256 text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.simulations
  add constraint simulations_asset_id_fkey
  foreign key (asset_id) references public.content_assets(id);

create table if not exists public.lesson_block_assets (
  lesson_block_id uuid not null references public.lesson_blocks(id) on delete cascade,
  asset_id uuid not null references public.content_assets(id),
  sort_order integer not null default 0,
  primary key (lesson_block_id, asset_id)
);

create table if not exists public.laboratory_works (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id),
  lesson_id uuid references public.lessons(id),
  slug text not null unique,
  title text not null,
  instructions jsonb not null default '{}'::jsonb,
  experiment_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived'))
);

create table if not exists public.content_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null,
  version integer not null,
  platform_targets text[] not null default array['web', 'android', 'ios', 'windows'],
  manifest jsonb not null default '{}'::jsonb,
  checksum_sha256 text,
  storage_path text,
  min_app_version text,
  published_at timestamptz,
  unique (package_key, version)
);

-- ---------------------------------------------------------------------------
-- Question banks and assessment engine
-- Correct answer keys are kept separately from public question wording/options.
-- Offline packages may include keys locally when the package is issued.
-- ---------------------------------------------------------------------------

create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  source_reference text,
  is_immutable boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks(id),
  topic_id uuid references public.topics(id),
  legacy_topic_code text,
  source_question_number integer,
  question_type text not null default 'single_choice'
    check (question_type in ('single_choice', 'multiple_choice', 'numeric', 'text', 'matching')),
  wording text not null,
  question_data jsonb not null default '{}'::jsonb,
  difficulty text check (difficulty in ('basic', 'medium', 'advanced')),
  source_checksum text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  unique (bank_id, source_question_number)
);

create table if not exists public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_key text not null,
  wording text not null,
  sort_order integer not null default 0,
  unique (question_id, option_key)
);

create table if not exists public.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer_data jsonb not null,
  explanation text,
  updated_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  bank_id uuid references public.question_banks(id),
  topic_id uuid references public.topics(id),
  test_mode text not null default 'final' check (test_mode in ('training', 'final', 'exam', 'diagnostic')),
  time_limit_seconds integer,
  question_count integer,
  is_published boolean not null default false,
  configuration jsonb not null default '{}'::jsonb
);

create table if not exists public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  sort_order integer not null default 0,
  points numeric(7,2) not null default 1,
  primary key (test_id, question_id)
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  test_id uuid references public.tests(id),
  mode text not null check (mode in ('training', 'final', 'exam', 'diagnostic')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  raw_score numeric(7,2),
  max_score numeric(7,2),
  score_percent numeric(5,2) check (score_percent between 0 and 100),
  grade smallint check (grade between 2 and 5),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  device_id uuid,
  client_attempt_id uuid,
  unique (user_id, client_attempt_id)
);

create table if not exists public.test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option_ids uuid[] not null default '{}',
  answer_payload jsonb not null default '{}'::jsonb,
  is_correct boolean,
  points_awarded numeric(7,2),
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- User learning state
-- ---------------------------------------------------------------------------

create table if not exists public.grading_rules (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid references public.program_versions(id),
  min_score numeric(5,2) not null check (min_score between 0 and 100),
  max_score numeric(5,2) not null check (max_score between 0 and 100),
  grade smallint not null check (grade between 2 and 5),
  mastery_label text not null,
  is_default boolean not null default false,
  check (min_score <= max_score)
);

insert into public.grading_rules
  (program_version_id, min_score, max_score, grade, mastery_label, is_default)
values
  (null, 0, 59.99, 2, 'Не освоен', true),
  (null, 60, 74.99, 3, 'Освоен', true),
  (null, 75, 89.99, 4, 'Хорошо освоен', true),
  (null, 90, 100, 5, 'Освоен на отлично', true);

create table if not exists public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_version_id uuid not null references public.program_versions(id),
  education_level_id uuid references public.education_levels(id),
  is_active boolean not null default true,
  enrolled_at timestamptz not null default now(),
  unique (user_id, program_version_id, education_level_id)
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('section', 'topic', 'lesson', 'lesson_block')),
  entity_id uuid not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'mastered')),
  completion_percent numeric(5,2) not null default 0 check (completion_percent between 0 and 100),
  best_grade smallint check (best_grade between 2 and 5),
  latest_grade smallint check (latest_grade between 2 and 5),
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.user_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  error_count integer not null default 1,
  corrected_at timestamptz,
  last_attempt_id uuid references public.test_attempts(id),
  unique (user_id, question_id)
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in (
    'lesson', 'topic', 'formula', 'definition', 'question', 'worked_example',
    'simulation', 'laboratory'
  )),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_date date not null,
  goal_type text not null check (goal_type in ('lessons', 'questions', 'minutes')),
  target_value integer not null check (target_value > 0),
  completed_value integer not null default 0 check (completed_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_date, goal_type)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id),
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Devices and synchronization event log
-- ---------------------------------------------------------------------------

create table if not exists public.sync_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_label text,
  platform text not null check (platform in ('android', 'ios', 'web', 'windows')),
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null,
  client_event_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  payload jsonb not null default '{}'::jsonb,
  client_changed_at timestamptz,
  server_received_at timestamptz not null default now(),
  unique (user_id, device_id, client_event_id),
  foreign key (user_id, device_id) references public.sync_devices(user_id, id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_program_topics_order
  on public.program_topics(program_version_id, education_level_id, sequence_number);
create index if not exists idx_topics_section_order
  on public.topics(section_id, sort_order);
create index if not exists idx_lessons_topic_order
  on public.lessons(topic_id, sort_order);
create index if not exists idx_questions_bank_topic
  on public.questions(bank_id, topic_id, sort_order);
create index if not exists idx_test_attempts_user_date
  on public.test_attempts(user_id, started_at desc);
create index if not exists idx_test_answers_attempt
  on public.test_answers(attempt_id);
create index if not exists idx_user_progress_user
  on public.user_progress(user_id, entity_type);
create index if not exists idx_user_errors_user_last_seen
  on public.user_errors(user_id, last_seen_at desc);
create index if not exists idx_sync_events_user_received
  on public.sync_events(user_id, server_received_at);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons
for each row execute function public.set_updated_at();
create trigger user_progress_updated_at before update on public.user_progress
for each row execute function public.set_updated_at();
create trigger user_goals_updated_at before update on public.user_goals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Protect immutable official question banks against updates/deletes.
-- Content imports are performed by a controlled migration/service process.
-- ---------------------------------------------------------------------------

create or replace function public.reject_immutable_question_mutation()
returns trigger
language plpgsql
as $$
declare
  target_bank_id uuid;
  immutable_bank boolean;
begin
  if tg_table_name = 'question_banks' then
    if old.is_immutable then
      raise exception 'Immutable question bank cannot be modified or deleted';
    end if;
    if tg_op = 'DELETE' then return old; else return new; end if;
  elsif tg_table_name = 'questions' then
    target_bank_id := old.bank_id;
  else
    select q.bank_id into target_bank_id
    from public.questions q
    where q.id = old.question_id;
  end if;

  select qb.is_immutable into immutable_bank
  from public.question_banks qb
  where qb.id = target_bank_id;

  if coalesce(immutable_bank, false) then
    raise exception 'Questions in an immutable bank cannot be modified or deleted';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$;

create trigger protect_immutable_question_banks
before update or delete on public.question_banks
for each row execute function public.reject_immutable_question_mutation();
create trigger protect_immutable_questions
before update or delete on public.questions
for each row execute function public.reject_immutable_question_mutation();
create trigger protect_immutable_answer_options
before update or delete on public.answer_options
for each row execute function public.reject_immutable_question_mutation();
create trigger protect_immutable_answer_keys
before update or delete on public.question_answer_keys
for each row execute function public.reject_immutable_question_mutation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public catalogue is readable only when published.
-- User records are private and become cloud-syncable after account linking.
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1;
$$;

alter table public.profiles enable row level security;
create policy "profile owner can read" on public.profiles
for select using (auth_user_id = auth.uid());
create policy "profile owner can insert" on public.profiles
for insert with check (auth_user_id = auth.uid());
create policy "profile owner can update" on public.profiles
for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'test_attempts', 'test_answers', 'user_programs', 'user_progress',
    'user_errors', 'user_favorites', 'user_goals', 'user_achievements',
    'sync_devices', 'sync_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id())',
      table_name || '_owner_all',
      table_name
    );
  end loop;
end;
$$;

alter table public.education_tracks enable row level security;
alter table public.education_programs enable row level security;
alter table public.program_versions enable row level security;
alter table public.education_levels enable row level security;
alter table public.sections enable row level security;
alter table public.topics enable row level security;
alter table public.program_topics enable row level security;
alter table public.topic_prerequisites enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.formulas enable row level security;
alter table public.definitions enable row level security;
alter table public.worked_examples enable row level security;
alter table public.simulations enable row level security;
alter table public.content_assets enable row level security;
alter table public.lesson_block_assets enable row level security;
alter table public.laboratory_works enable row level security;
alter table public.content_packages enable row level security;
alter table public.question_banks enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.achievements enable row level security;
alter table public.grading_rules enable row level security;

create policy "published tracks readable" on public.education_tracks
for select using (is_active);
create policy "active programs readable" on public.education_programs
for select using (is_active);
create policy "published program versions readable" on public.program_versions
for select using (status = 'published');
create policy "education levels readable" on public.education_levels
for select using (true);
create policy "published sections readable" on public.sections
for select using (is_published);
create policy "published topics readable" on public.topics
for select using (is_published);
create policy "published program topics readable" on public.program_topics
for select using (exists (
  select 1 from public.program_versions pv
  where pv.id = program_version_id and pv.status = 'published'
));
create policy "topic prerequisites readable" on public.topic_prerequisites
for select using (true);
create policy "published lessons readable" on public.lessons
for select using (status = 'published');
create policy "formulas readable" on public.formulas for select using (
  (lesson_id is not null and exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published'))
  or (topic_id is not null and exists (select 1 from public.topics t where t.id = topic_id and t.is_published))
);
create policy "definitions readable" on public.definitions for select using (
  (lesson_id is not null and exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published'))
  or (topic_id is not null and exists (select 1 from public.topics t where t.id = topic_id and t.is_published))
);
create policy "worked examples readable" on public.worked_examples for select using (
  (lesson_id is not null and exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published'))
  or (topic_id is not null and exists (select 1 from public.topics t where t.id = topic_id and t.is_published))
);
create policy "published simulations readable" on public.simulations for select using (status = 'published');
create policy "published lesson blocks readable" on public.lesson_blocks
for select using (exists (
  select 1 from public.lessons l where l.id = lesson_id and l.status = 'published'
));
create policy "content assets readable" on public.content_assets
for select using (true);
create policy "lesson block assets readable" on public.lesson_block_assets
for select using (exists (
  select 1 from public.lesson_blocks lb
  join public.lessons l on l.id = lb.lesson_id
  where lb.id = lesson_block_id and l.status = 'published'
));
create policy "published laboratories readable" on public.laboratory_works
for select using (status = 'published');
create policy "published content packages readable" on public.content_packages
for select using (published_at is not null);
create policy "published question banks readable" on public.question_banks
for select using (status = 'published');
create policy "published questions readable" on public.questions
for select using (is_published and exists (
  select 1 from public.question_banks qb
  where qb.id = bank_id and qb.status = 'published'
));
create policy "published options readable" on public.answer_options
for select using (exists (
  select 1 from public.questions q
  join public.question_banks qb on qb.id = q.bank_id
  where q.id = question_id and q.is_published and qb.status = 'published'
));
-- Answer keys are deliberately not exposed through ordinary client queries.
create policy "published tests readable" on public.tests
for select using (is_published);
create policy "published test questions readable" on public.test_questions
for select using (exists (
  select 1 from public.tests t where t.id = test_id and t.is_published
));
create policy "grading rules readable" on public.grading_rules for select using (true);
create policy "active achievements readable" on public.achievements
for select using (is_active);

-- No client policies grant writes to educational catalogue or answer keys.
-- Content authoring/import uses trusted administrative credentials only.
