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

alter table physics.lesson_blocks
  drop constraint if exists lesson_blocks_lesson_id_sort_order_key;

alter table physics.lesson_blocks
  add constraint lesson_blocks_lesson_version_sort_order_key
  unique (lesson_id, content_version, sort_order);

alter table physics.lesson_blocks
  add constraint lesson_blocks_lesson_version_fkey
  foreign key (lesson_id, content_version)
  references physics.lesson_versions(lesson_id, version)
  on delete cascade;

create table if not exists physics.lesson_sources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  content_version integer not null check (content_version > 0),
  sort_order integer not null default 0,
  source_kind text not null
    check (source_kind in (
      'official_program','textbook','scientific_reference',
      'research_paper','image','simulation','other'
    )),
  source_title text not null,
  author text,
  publisher text,
  edition text,
  publication_year integer check (publication_year is null or publication_year between 1 and 3000),
  source_url text,
  page_reference text,
  accessed_at date,
  rights_status text not null default 'pending'
    check (rights_status in (
      'pending','original','public_domain','open_license',
      'permission_granted','citation_only','restricted'
    )),
  license_identifier text,
  license_url text,
  permission_reference text,
  notes text,
  created_at timestamptz not null default now(),
  unique (lesson_id, content_version, sort_order),
  foreign key (lesson_id, content_version)
    references physics.lesson_versions(lesson_id, version)
    on delete cascade
);

create table if not exists physics.lesson_reviews (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  content_version integer not null check (content_version > 0),
  review_type text not null
    check (review_type in ('physics','pedagogy','rights')),
  status text not null default 'pending'
    check (status in ('pending','approved','changes_requested')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_label text,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, content_version, review_type),
  foreign key (lesson_id, content_version)
    references physics.lesson_versions(lesson_id, version)
    on delete cascade,
  check (status <> 'approved' or reviewed_at is not null)
);

create index if not exists lesson_versions_lesson_version_idx
  on physics.lesson_versions(lesson_id, version desc);
create index if not exists lesson_sources_lesson_version_idx
  on physics.lesson_sources(lesson_id, content_version, sort_order);
create index if not exists lesson_reviews_lesson_version_idx
  on physics.lesson_reviews(lesson_id, content_version, review_type, status);

alter table physics.lesson_versions enable row level security;
alter table physics.lesson_sources enable row level security;
alter table physics.lesson_reviews enable row level security;

revoke all on physics.lesson_versions from public, anon, authenticated;
revoke all on physics.lesson_sources from public, anon, authenticated;
revoke all on physics.lesson_reviews from public, anon, authenticated;

drop policy if exists lesson_versions_deny_all on physics.lesson_versions;
create policy lesson_versions_deny_all
  on physics.lesson_versions for all to anon, authenticated
  using (false) with check (false);

drop policy if exists lesson_sources_deny_all on physics.lesson_sources;
create policy lesson_sources_deny_all
  on physics.lesson_sources for all to anon, authenticated
  using (false) with check (false);

drop policy if exists lesson_reviews_deny_all on physics.lesson_reviews;
create policy lesson_reviews_deny_all
  on physics.lesson_reviews for all to anon, authenticated
  using (false) with check (false);

create or replace function physics.create_initial_lesson_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into physics.lesson_versions (
    lesson_id, version, title, summary, estimated_minutes, status, created_at
  )
  values (
    new.id, new.content_version, new.title, new.summary,
    new.estimated_minutes, 'draft', new.created_at
  );
  return new;
end;
$$;

drop trigger if exists lessons_create_initial_version on physics.lessons;
create trigger lessons_create_initial_version
after insert on physics.lessons
for each row execute function physics.create_initial_lesson_version();

create or replace function physics.guard_lesson_version_pointer()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_outcomes jsonb;
  approved_review_count integer;
  source_count integer;
  block_count integer;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.content_version <> 1 then
      raise exception 'Lessons must be created as draft version 1';
    end if;
    return new;
  end if;

  if new.content_version < old.content_version
     or new.content_version > old.content_version + 1 then
    raise exception 'Lesson content versions must advance one version at a time';
  end if;

  if new.content_version = old.content_version
     and (
       new.title is distinct from old.title
       or new.summary is distinct from old.summary
       or new.estimated_minutes is distinct from old.estimated_minutes
     ) then
    raise exception 'Lesson metadata changes require a new content version';
  end if;

  if new.content_version = old.content_version + 1 then
    if new.status <> 'draft' then
      raise exception 'A new lesson version must begin as draft';
    end if;

    insert into physics.lesson_versions (
      lesson_id, version, title, summary, estimated_minutes, status
    )
    values (
      new.id, new.content_version, new.title, new.summary,
      new.estimated_minutes, 'draft'
    );
  end if;

  if old.status = 'archived'
     and not (new.content_version = old.content_version + 1 and new.status = 'draft') then
    raise exception 'Archived lessons can only be reopened as a new draft version';
  end if;

  if old.status = 'published'
     and new.status = 'draft'
     and new.content_version = old.content_version then
    raise exception 'Published lesson versions cannot be returned to draft';
  end if;

  if new.status = 'published' and old.status <> 'published' then
    if new.content_version <> old.content_version then
      raise exception 'A new lesson version must be reviewed before publication';
    end if;

    select learning_outcomes
      into current_outcomes
      from physics.lesson_versions
      where lesson_id = new.id and version = new.content_version;

    if current_outcomes is null or jsonb_array_length(current_outcomes) = 0 then
      raise exception 'A lesson needs at least one learning outcome before publication';
    end if;

    select count(*) into source_count
      from physics.lesson_sources
      where lesson_id = new.id
        and content_version = new.content_version
        and rights_status in (
          'original','public_domain','open_license',
          'permission_granted','citation_only'
        );

    if source_count = 0 then
      raise exception 'A lesson needs at least one source with reviewed rights status';
    end if;

    if exists (
      select 1
      from physics.lesson_sources
      where lesson_id = new.id
        and content_version = new.content_version
        and rights_status in ('pending','restricted')
    ) then
      raise exception 'Pending or restricted source rights prevent publication';
    end if;

    select count(*) into approved_review_count
      from physics.lesson_reviews
      where lesson_id = new.id
        and content_version = new.content_version
        and status = 'approved'
        and review_type in ('physics','pedagogy','rights');

    if approved_review_count <> 3 then
      raise exception 'Physics, pedagogy, and rights reviews must all be approved';
    end if;

    select count(*) into block_count
      from physics.lesson_blocks
      where lesson_id = new.id
        and content_version = new.content_version;

    if block_count < 2 then
      raise exception 'A published lesson needs at least two content blocks';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lessons_guard_version_pointer on physics.lessons;
create trigger lessons_guard_version_pointer
before insert or update on physics.lessons
for each row execute function physics.guard_lesson_version_pointer();

create or replace function physics.sync_lesson_version_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update physics.lesson_versions
  set status = new.status,
      published_at = case
        when new.status = 'published' then coalesce(published_at, now())
        else published_at
      end
  where lesson_id = new.id and version = new.content_version;
  return new;
end;
$$;

drop trigger if exists lessons_sync_version_status on physics.lessons;
create trigger lessons_sync_version_status
after update of status on physics.lessons
for each row execute function physics.sync_lesson_version_status();

create or replace function physics.guard_lesson_version_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status text;
begin
  select status into parent_status
  from physics.lessons
  where id = old.lesson_id;

  if tg_op = 'DELETE' then
    if old.status = 'published'
       or exists (
         select 1 from physics.lessons
         where id = old.lesson_id and content_version = old.version
       ) then
      raise exception 'Published or current lesson versions cannot be deleted';
    end if;
    return old;
  end if;

  if new.title is distinct from old.title
     or new.summary is distinct from old.summary
     or new.estimated_minutes is distinct from old.estimated_minutes then
    raise exception 'Version title, summary, and duration are managed by the lesson version pointer';
  end if;

  if old.status = 'published' then
    if new.status not in ('published','archived')
       or new.learning_outcomes is distinct from old.learning_outcomes
       or new.prerequisites is distinct from old.prerequisites
       or new.change_note is distinct from old.change_note then
      raise exception 'Published lesson versions are immutable';
    end if;
  end if;

  if new.status = 'published' and parent_status <> 'published' then
    raise exception 'Publish the lesson pointer only after publication checks pass';
  end if;

  if new.status = 'archived' and parent_status <> 'archived' then
    raise exception 'Archive the lesson pointer before archiving its version';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_versions_guard_mutation on physics.lesson_versions;
create trigger lesson_versions_guard_mutation
before update or delete on physics.lesson_versions
for each row execute function physics.guard_lesson_version_row();

create or replace function physics.guard_published_lesson_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if exists (
      select 1 from physics.lesson_versions
      where lesson_id = old.lesson_id
        and version = old.content_version
        and status = 'published'
    ) or exists (
      select 1 from physics.lesson_versions
      where lesson_id = new.lesson_id
        and version = new.content_version
        and status = 'published'
    ) then
      raise exception 'Published lesson content is immutable; create a new content version';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1 from physics.lesson_versions
      where lesson_id = old.lesson_id
        and version = old.content_version
        and status = 'published'
    ) then
      raise exception 'Published lesson content is immutable; create a new content version';
    end if;
    return old;
  end if;

  if exists (
    select 1 from physics.lesson_versions
    where lesson_id = new.lesson_id
      and version = new.content_version
      and status = 'published'
  ) then
    raise exception 'Published lesson content is immutable; create a new content version';
  end if;
  return new;
end;
$$;

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
as $$
begin
  if exists (
    select 1 from physics.lesson_versions
    where lesson_id = old.id and status = 'published'
  ) then
    raise exception 'Lessons with published versions must be archived, not deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists lessons_prevent_published_delete on physics.lessons;
create trigger lessons_prevent_published_delete
before delete on physics.lessons
for each row execute function physics.prevent_published_lesson_delete();
