-- Versioned lesson content, source provenance, and publication review gates.

create table if not exists physics.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references physics.lessons(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  summary text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  learning_outcomes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(learning_outcomes) = 'array'),
  prerequisites jsonb not null default '[]'::jsonb
    check (jsonb_typeof(prerequisites) = 'array'),
  change_note text,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (lesson_id, version)
);

insert into physics.lesson_versions (
  lesson_id, version, title, summary, estimated_minutes, status, created_at
)
select id, content_version, title, summary, estimated_minutes, status, created_at
from physics.lessons
on conflict (lesson_id, version) do nothing;

alter table physics.lesson_blocks
  add column if not exists content_version integer not null default 1
  check (content_version > 0);

-- Existing blocks predate versioning and belong to each lesson's current version.
update physics.lesson_blocks b
set content_version = l.content_version
from physics.lessons l
where b.lesson_id = l.id
  and b.content_version <> l.content_version;

alter table physics.lesson_blocks
  drop constraint if exists lesson_blocks_lesson_id_sort_order_key;

alter table physics.lesson_blocks
  drop constraint if exists lesson_blocks_lesson_version_sort_order_key;
alter table physics.lesson_blocks
  add constraint lesson_blocks_lesson_version_sort_order_key
  unique (lesson_id, content_version, sort_order);

alter table physics.lesson_blocks
  drop constraint if exists lesson_blocks_lesson_version_fkey;
alter table physics.lesson_blocks
  add constraint lesson_blocks_lesson_version_fkey
  foreign key (lesson_id, content_version)
  references physics.lesson_versions(lesson_id, version)
  on delete cascade;

drop trigger if exists lesson_blocks_guard_published on physics.lesson_blocks;
create trigger lesson_blocks_guard_published
before insert or update or delete on physics.lesson_blocks
for each row execute function physics.guard_published_lesson_content();

drop trigger if exists lesson_sources_guard_published on physics.lesson_sources;
create trigger lesson_sources_guard_published
before insert or update or delete on physics.lesson_sources
for each row execute function physics.guard_published_lesson_content();

drop trigger if exists lesson_reviews_guard_published on physics.lesson_reviews;
create trigger lesson_reviews_guard_published
before insert or update or delete on physics.lesson_reviews
for each row execute function physics.guard_published_lesson_content();

create or replace function physics.prevent_published_lesson_delete()
returns trigger
language plpgsql
set search_path = ''
as $func$
begin
  if exists (
    select 1 from physics.lesson_versions
    where lesson_id = old.id and published_at is not null
  ) then
    raise exception 'Lessons with published versions must be archived, not deleted';
  end if;
  return old;
end;
$func$;

drop trigger if exists lessons_prevent_published_delete on physics.lessons;
create trigger lessons_prevent_published_delete
before delete on physics.lessons
for each row execute function physics.prevent_published_lesson_delete();
