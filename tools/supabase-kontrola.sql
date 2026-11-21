-- Kontrolní okno simulátoru Vltavské kaskády: schéma pro Supabase.
-- Spusť celé v Supabase → SQL Editor. Skript lze spustit opakovaně.
-- Testeři (role anon) nemají přístup k tabulkám, smějí jen volat vk_ingest a vk_forget s platným kódem.
-- Číst a spravovat data smí jen přihlášený uživatel uvedený ve vk_admins.

create table if not exists public.vk_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.vk_testers (
  code text primary key check (code ~ '^[A-Z0-9-]{4,20}$'),
  note text not null default '' check (char_length(note) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vk_sessions (
  id uuid primary key,
  code text not null references public.vk_testers(code) on delete cascade,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  events_n integer not null default 0,
  errors_n integer not null default 0
);
create index if not exists vk_sessions_code_idx on public.vk_sessions(code, last_at desc);

create table if not exists public.vk_events (
  session_id uuid not null references public.vk_sessions(id) on delete cascade,
  seq integer not null,
  at timestamptz not null,
  kind text not null,
  sim_h real,
  data jsonb not null default '{}'::jsonb,
  primary key (session_id, seq)
);

alter table public.vk_admins enable row level security;
alter table public.vk_testers enable row level security;
alter table public.vk_sessions enable row level security;
alter table public.vk_events enable row level security;

revoke all on public.vk_admins, public.vk_testers, public.vk_sessions, public.vk_events from anon, authenticated;
grant select on public.vk_admins to authenticated;
grant select, insert, update, delete on public.vk_testers to authenticated;
grant select, delete on public.vk_sessions, public.vk_events to authenticated;

create or replace function public.vk_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.vk_admins a where a.user_id = (select auth.uid())) $$;
revoke all on function public.vk_is_admin() from public, anon;
grant execute on function public.vk_is_admin() to authenticated;

drop policy if exists vk_admins_self on public.vk_admins;
create policy vk_admins_self on public.vk_admins for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists vk_testers_admin on public.vk_testers;
create policy vk_testers_admin on public.vk_testers for all to authenticated using ((select public.vk_is_admin())) with check ((select public.vk_is_admin()));
drop policy if exists vk_sessions_read on public.vk_sessions;
create policy vk_sessions_read on public.vk_sessions for select to authenticated using ((select public.vk_is_admin()));
drop policy if exists vk_sessions_del on public.vk_sessions;
create policy vk_sessions_del on public.vk_sessions for delete to authenticated using ((select public.vk_is_admin()));
drop policy if exists vk_events_read on public.vk_events;
create policy vk_events_read on public.vk_events for select to authenticated using ((select public.vk_is_admin()));
drop policy if exists vk_events_del on public.vk_events;
create policy vk_events_del on public.vk_events for delete to authenticated using ((select public.vk_is_admin()));

create or replace function public.vk_ingest(p_code text, p_session uuid, p_meta jsonb, p_events jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_n integer; v_added integer; v_err integer; v_owner text;
begin
  if not exists (select 1 from public.vk_testers t where t.code = p_code and t.active) then
    raise exception 'vk_bad_code' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 200 or pg_column_size(p_events) > 200000
     or pg_column_size(p_meta) > 2000 then
    raise exception 'vk_bad_batch' using errcode = 'P0001';
  end if;
  select s.code, s.events_n into v_owner, v_n from public.vk_sessions s where s.id = p_session;
  if v_owner is null then
    if (select count(*) from public.vk_sessions s where s.code = p_code) >= 200 then
      return jsonb_build_object('ok', false, 'full', true);
    end if;
    insert into public.vk_sessions(id, code, meta) values (p_session, p_code, coalesce(p_meta, '{}'::jsonb));
    v_n := 0;
  elsif v_owner <> p_code then
    raise exception 'vk_bad_session' using errcode = 'P0001';
  end if;
  if v_n >= 20000 then
    return jsonb_build_object('ok', false, 'full', true);
  end if;
  with ins as (
    insert into public.vk_events(session_id, seq, at, kind, sim_h, data)
    select p_session, (e->>'s')::integer,
           least(now(), greatest(now() - interval '2 days', to_timestamp((e->>'at')::double precision / 1000))),
           left(e->>'k', 24), (e->>'h')::real, coalesce(e->'d', '{}'::jsonb)
    from jsonb_array_elements(p_events) e
    where e->>'k' is not null and pg_column_size(e) <= 2000
    on conflict do nothing
    returning kind
  )
  select count(*), count(*) filter (where kind = 'error') into v_added, v_err from ins;
  update public.vk_sessions s set last_at = now(), events_n = s.events_n + v_added, errors_n = s.errors_n + v_err where s.id = p_session;
  return jsonb_build_object('ok', true, 'added', v_added);
end $$;

-- tester může svůj záznam sám kdykoli smazat (zná kód i náhodné ID své relace)
create or replace function public.vk_forget(p_code text, p_session uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.vk_sessions s where s.id = p_session and s.code = p_code;
  return found;
end $$;

revoke all on function public.vk_ingest(text, uuid, jsonb, jsonb) from public;
revoke all on function public.vk_forget(text, uuid) from public;
grant execute on function public.vk_ingest(text, uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.vk_forget(text, uuid) to anon, authenticated;

-- PO VYTVOŘENÍ SVÉHO ÚČTU (Authentication → Users → Add user) spusť zvlášť, se svým e-mailem:
-- insert into public.vk_admins(user_id) select id from auth.users where email = 'SEM_TVUJ_EMAIL' on conflict do nothing;
