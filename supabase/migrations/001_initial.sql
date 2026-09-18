-- Single-school aggregate, private to server. Compare-and-swap commits all
-- attendance, scores, results and audit changes atomically.
create table public.school_state (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.school_state enable row level security;
revoke all on public.school_state from anon, authenticated;
grant all on public.school_state to service_role;

create table public.profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  role text not null check (role in ('admin', 'member')),
  active boolean not null default true
);
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

insert into public.school_state(id, data) values (true, '{"school":"Paskibra","timezone":"","members":[],"sessions":[],"attendance":[],"rules":[],"results":[],"audits":[],"achievements":[]}');

create or replace function public.commit_school_state(expected_revision bigint, new_data jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update school_state set data = new_data, revision = revision + 1, updated_at = now()
  where id = true and revision = expected_revision;
  return found;
end;
$$;
revoke all on function public.commit_school_state(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.commit_school_state(bigint, jsonb) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('attendance', 'attendance', false, 3145728, array['image/jpeg']) on conflict do nothing;
-- No client policies: short-lived evidence URLs are issued by authorized server routes.
