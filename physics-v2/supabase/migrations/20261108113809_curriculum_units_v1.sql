create table if not exists physics.curriculum_units (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references physics.topics(id) on delete cascade,
  source_row_code text not null,
  title text not null,
  planned_hours integer not null check (planned_hours >= 0),
  program_content_summary text not null default '',
  learning_activity_summary text not null default '',
  practical_work jsonb not null default '[]'::jsonb
    check (jsonb_typeof(practical_work) = 'array'),
  source_title text not null,
  source_url text not null,
  source_version text not null,
  source_page_start integer,
  source_page_end integer,
  sort_order integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curriculum_units_topic_sort_idx
  on physics.curriculum_units(topic_id, sort_order);

alter table physics.curriculum_units enable row level security;
revoke all on physics.curriculum_units from public, anon, authenticated;

drop policy if exists curriculum_units_deny_all on physics.curriculum_units;
create policy curriculum_units_deny_all
  on physics.curriculum_units
  for all
  to anon, authenticated
  using (false)
  with check (false);