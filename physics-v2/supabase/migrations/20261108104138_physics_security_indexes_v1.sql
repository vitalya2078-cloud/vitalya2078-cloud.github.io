alter function physics.reject_official_bank_mutation()
  set search_path = pg_catalog, physics;

do $$
declare
  table_record record;
  policy_name text;
begin
  for table_record in
    select tablename
    from pg_tables
    where schemaname = 'physics'
  loop
    policy_name := 'deny_all_until_auth_' || table_record.tablename;
    execute format(
      'create policy %I on physics.%I for all to public using (false) with check (false)',
      policy_name,
      table_record.tablename
    );
  end loop;
end;
$$;

create index curriculum_question_mappings_legacy_topic_idx
  on physics.curriculum_question_mappings(legacy_topic_id);
create index daily_goal_logs_goal_idx
  on physics.daily_goal_logs(goal_id);
create index daily_goals_user_idx
  on physics.daily_goals(user_id);
create index lesson_assessment_attempts_lesson_idx
  on physics.lesson_assessment_attempts(lesson_id);
create index lesson_mastery_lesson_idx
  on physics.lesson_mastery(lesson_id);
create index lesson_progress_lesson_idx
  on physics.lesson_progress(lesson_id);
create index mistake_items_question_idx
  on physics.mistake_items(official_question_id);
create index sync_operations_device_idx
  on physics.sync_operations(device_id);
create index test_answers_question_idx
  on physics.test_answers(official_question_id);
create index test_attempts_definition_idx
  on physics.test_attempts(test_definition_id);
create index test_definition_items_question_idx
  on physics.test_definition_items(official_question_id);
create index topic_prerequisites_prerequisite_idx
  on physics.topic_prerequisites(prerequisite_topic_id);
create index user_program_enrollments_version_idx
  on physics.user_program_enrollments(program_version_id);
