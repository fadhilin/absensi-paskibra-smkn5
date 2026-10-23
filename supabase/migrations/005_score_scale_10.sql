update public.school_state
set data = jsonb_set(
  data,
  '{attendance}',
  coalesce(
    (
      select jsonb_agg(
        case
          when jsonb_typeof(item->'scores') = 'object' then
            jsonb_set(
              item,
              '{scores}',
              (
                select coalesce(
                  jsonb_object_agg(
                    score.key,
                    case
                      when score.value = 'null'::jsonb then 'null'::jsonb
                      else to_jsonb(round((score.value #>> '{}')::numeric / 10)::int)
                    end
                  ),
                  '{}'::jsonb
                )
                from jsonb_each(item->'scores') as score(key, value)
              )
            )
          else item
        end
      )
      from jsonb_array_elements(data->'attendance') as entry(item)
    ),
    '[]'::jsonb
  ),
  false
);
