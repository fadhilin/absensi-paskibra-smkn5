create or replace function public.monthly_ranking(payload jsonb, period text)
returns jsonb language sql immutable set search_path = public as $$
with members as (
  select m.* from jsonb_to_recordset(payload->'members') as m(id text,name text,class_name text,joined_on text,left_on text,membership_spans jsonb)
  where exists(select 1 from jsonb_to_recordset(coalesce(m.membership_spans,jsonb_build_array(jsonb_build_object('from',m.joined_on,'until',m.left_on)))) as span("from" text,until text)
    where left(span."from",7)<=period and (span.until is null or left(span.until,7)>=period))
), sessions as (
  select * from jsonb_to_recordset(payload->'sessions') as t(id text,date text,status text) where left(t.date,7)=period and t.status<>'dibatalkan'
), records as (
  select * from jsonb_to_recordset(payload->'attendance') as a(member_id text,session_id text,status text,activity int,skill int,scores jsonb)
), rules as (
  select * from jsonb_to_recordset(payload->'rules') as r(month text,present int,late int,criteria jsonb) where r.month=period
), scored as (
  select m.id,m.name,m.class_name,t.id session_id,a.status,r.month,
    case a.status when 'hadir' then coalesce(r.present,0) when 'terlambat' then coalesce(r.late,0) else 0 end attendance,
    case when r.month is not null and a.status in ('hadir','terlambat') and jsonb_array_length(coalesce(r.criteria,'[]'::jsonb))=0 then coalesce(a.activity,0) else 0 end activity,
    case when r.month is not null and a.status in ('hadir','terlambat') and jsonb_array_length(coalesce(r.criteria,'[]'::jsonb))=0 then coalesce(a.skill,0) else 0 end skill,
    case when r.month is null or a.status not in ('hadir','terlambat') then 0
      when jsonb_array_length(coalesce(r.criteria,'[]'::jsonb))>0 then (select coalesce(sum((a.scores->>(c->>'id'))::int),0)::int from jsonb_array_elements(r.criteria) c)
      else coalesce(a.activity,0)+coalesce(a.skill,0) end evaluation,
    t.id is not null and (a.status is null or (a.status in ('hadir','terlambat') and (r.month is null or
      case when jsonb_array_length(coalesce(r.criteria,'[]'::jsonb))>0 then exists(select 1 from jsonb_array_elements(r.criteria) c where a.scores->>(c->>'id') is null)
      else a.activity is null or a.skill is null end))) incomplete
  from members m left join sessions t on exists(
    select 1 from jsonb_to_recordset(coalesce(m.membership_spans,jsonb_build_array(jsonb_build_object('from',m.joined_on,'until',m.left_on)))) as span("from" text,until text)
    where span."from"<=t.date and (span.until is null or span.until>=t.date))
  left join records a on a.member_id=m.id and a.session_id=t.id left join rules r on true
), aggregate as (
  select id,name,class_name,coalesce(sum(attendance),0)::int attendance,coalesce(sum(activity),0)::int activity,coalesce(sum(skill),0)::int skill,
    coalesce(sum(evaluation),0)::int evaluation,count(*) filter(where incomplete)::int incomplete,
    count(*) filter(where status='hadir')::int hadir,count(*) filter(where status='terlambat')::int terlambat,
    count(*) filter(where status='izin')::int izin,count(*) filter(where status='sakit')::int sakit,count(*) filter(where status='alpa')::int alpa
  from scored group by id,name,class_name
), totals as (select *,attendance+evaluation total from aggregate), ranked as (
  select *,rank() over(order by total desc)::int rank from totals
)
select coalesce(jsonb_agg(to_jsonb(ranked) order by rank,name),'[]'::jsonb) from ranked;
$$;
revoke all on function public.monthly_ranking(jsonb,text) from public,anon,authenticated;
grant execute on function public.monthly_ranking(jsonb,text) to service_role;
