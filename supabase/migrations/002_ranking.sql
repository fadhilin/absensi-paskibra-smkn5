create or replace function public.monthly_ranking(payload jsonb, period text)
returns jsonb language sql immutable set search_path = public as $$
with members as (
  select m.* from jsonb_to_recordset(payload->'members') as m(id text, name text, class_name text, joined_on text, left_on text, membership_spans jsonb)
  where exists (select 1 from jsonb_to_recordset(coalesce(m.membership_spans,jsonb_build_array(jsonb_build_object('from',m.joined_on,'until',m.left_on)))) as span("from" text, until text)
    where left(span."from",7)<=period and (span.until is null or left(span.until,7)>=period))
), sessions as (
  select * from jsonb_to_recordset(payload->'sessions') as t(id text, date text, status text)
  where left(t.date,7)=period and t.status<>'dibatalkan'
), records as (
  select * from jsonb_to_recordset(payload->'attendance') as a(member_id text,session_id text,status text,activity int,skill int)
), rules as (
  select * from jsonb_to_recordset(payload->'rules') as r(month text,present int,late int) where r.month=period
), aggregate as (
  select m.id,m.name,m.class_name,
    coalesce(sum(case a.status when 'hadir' then r.present when 'terlambat' then r.late else 0 end),0)::int attendance,
    coalesce(sum(case when r.month is not null and a.status in ('hadir','terlambat') then coalesce(a.activity,0) else 0 end),0)::int activity,
    coalesce(sum(case when r.month is not null and a.status in ('hadir','terlambat') then coalesce(a.skill,0) else 0 end),0)::int skill,
    count(*) filter(where t.id is not null and (a.status is null or (a.status in ('hadir','terlambat') and (a.activity is null or a.skill is null or r.month is null))))::int incomplete,
    count(*) filter(where a.status='hadir')::int hadir,
    count(*) filter(where a.status='terlambat')::int terlambat,
    count(*) filter(where a.status='izin')::int izin,
    count(*) filter(where a.status='sakit')::int sakit,
    count(*) filter(where a.status='alpa')::int alpa
  from members m left join sessions t on exists (
    select 1 from jsonb_to_recordset(coalesce(m.membership_spans,jsonb_build_array(jsonb_build_object('from',m.joined_on,'until',m.left_on)))) as span("from" text,until text)
    where span."from"<=t.date and (span.until is null or span.until>=t.date)
  ) left join records a on a.member_id=m.id and a.session_id=t.id left join rules r on true
  group by m.id,m.name,m.class_name
), totals as (select *,attendance+activity+skill total from aggregate), ranked as (
  select *,rank() over(order by total desc)::int rank from totals
)
select coalesce(jsonb_agg(to_jsonb(ranked) order by rank,name),'[]'::jsonb) from ranked;
$$;
revoke all on function public.monthly_ranking(jsonb,text) from public,anon,authenticated;
grant execute on function public.monthly_ranking(jsonb,text) to service_role;

create or replace function public.validate_school_state() returns trigger
language plpgsql set search_path=public as $$
begin
  if exists(select 1 from jsonb_array_elements(new.data->'attendance') a group by a->>'member_id',a->>'session_id' having count(*)>1) then
    raise exception 'Duplicate attendance';
  end if;
  if exists(select 1 from jsonb_array_elements(new.data->'members') m group by lower(m->>'nis') having count(*)>1) then
    raise exception 'Duplicate member number';
  end if;
  if exists(select 1 from jsonb_array_elements(new.data->'rules') r group by r->>'month' having count(*)>1) then
    raise exception 'Duplicate monthly rules';
  end if;
  return new;
end;
$$;
create trigger state_integrity before insert or update on public.school_state
for each row execute function public.validate_school_state();
