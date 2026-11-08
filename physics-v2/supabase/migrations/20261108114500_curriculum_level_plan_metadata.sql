-- Verified source metadata for each school grade's federal thematic plan.
-- The table remains private and all rows are draft until curriculum review.

create table if not exists physics.education_level_plans (
  id uuid primary key default gen_random_uuid(),
  education_level_id uuid not null unique
    references physics.education_levels(id) on delete cascade,
  source_title text not null,
  source_url text not null,
  source_version text not null,
  total_hours integer not null check (total_hours > 0),
  thematic_plan_page_start integer not null check (thematic_plan_page_start > 0),
  thematic_plan_page_end integer not null check (thematic_plan_page_end >= thematic_plan_page_start),
  status text not null default 'draft' check (status in ('draft','reviewed','approved')),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table physics.education_level_plans enable row level security;
revoke all on physics.education_level_plans from public, anon, authenticated;
