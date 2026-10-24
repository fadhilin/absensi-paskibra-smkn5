-- Correct the legacy October 2026 attendance rule while preserving its criteria.
update public.school_state as school
set data = jsonb_set(
  school.data,
  '{rules}',
  (
    select coalesce(
      jsonb_agg(
        case
          when rule.value ->> 'month' = '2026-10'
            then rule.value || jsonb_build_object('present', 10, 'late', 7)
          else rule.value
        end
        order by rule.ordinality
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(coalesce(school.data -> 'rules', '[]'::jsonb)) with ordinality as rule(value, ordinality)
  )
)
where school.id = true
  and jsonb_typeof(school.data -> 'rules') = 'array'
  and school.data -> 'rules' @> '[{"month":"2026-10"}]'::jsonb;
