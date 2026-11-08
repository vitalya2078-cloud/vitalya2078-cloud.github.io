alter table physics.curriculum_units
  alter column topic_id drop not null;

alter table physics.curriculum_units
  add column if not exists education_level_id uuid
    references physics.education_levels(id) on delete cascade;

alter table physics.curriculum_units
  add column if not exists unit_type text not null default 'topic'
    check (unit_type in ('topic', 'review', 'reserve', 'practicum'));

alter table physics.curriculum_units
  drop constraint if exists curriculum_units_topic_id_source_row_code_key;

alter table physics.curriculum_units
  add constraint curriculum_units_level_row_code_key
  unique (education_level_id, source_row_code);

create index if not exists curriculum_units_level_sort_idx
  on physics.curriculum_units(education_level_id, sort_order);

alter table physics.curriculum_units
  alter column education_level_id set not null;