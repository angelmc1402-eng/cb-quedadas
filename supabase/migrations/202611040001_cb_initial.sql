-- C&B isolated project. Direct Data API access is denied; the gateway validates writes.
create table public.plans (id uuid primary key, title text not null check(length(title) between 1 and 100), date date not null, time text not null check(time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), category text not null, location text not null default '', city text not null, budget integer not null check(budget between 0 and 10000), description text not null default '', creator text not null, owner text not null, status text not null check(status in ('Propuesto','Confirmado','Cancelado')), created timestamptz not null default now());
create index plans_date_idx on public.plans(date,time);
create table public.rsvps (plan uuid not null references public.plans(id) on delete cascade, member text not null, answer text not null check(answer in ('yes','maybe','no')), primary key(plan,member));
create table public.comments (id uuid primary key,plan uuid not null references public.plans(id) on delete cascade,member text not null,body text not null check(length(body) between 1 and 1500),created timestamptz not null default now());
create index comments_plan_created_idx on public.comments(plan,created);
create table public.availability (date date not null, member text not null, answer text not null check(answer in ('yes','maybe','no','')),primary key(date,member));
create table public.photos (id uuid primary key,plan uuid not null references public.plans(id) on delete cascade,member text not null,owner text not null,type text not null check(type in ('image/jpeg','image/png','image/webp')),created timestamptz not null default now());
create index photos_plan_created_idx on public.photos(plan,created);
create table public.cb_metadata (name text primary key,value text not null);
alter table public.plans enable row level security;
alter table public.rsvps enable row level security;
alter table public.comments enable row level security;
alter table public.availability enable row level security;
alter table public.photos enable row level security;
alter table public.cb_metadata enable row level security;
revoke all on public.plans,public.rsvps,public.comments,public.availability,public.photos,public.cb_metadata from anon, authenticated;
grant all on public.plans,public.rsvps,public.comments,public.availability,public.photos,public.cb_metadata to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cb-photos','cb-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
-- Invoker function, callable only by the server role. It cannot override existing records.
create function public.cb_import_legacy(payload jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(19022026);
 if exists(select 1 from public.cb_metadata where name='legacy_import') then return true; end if;
 insert into public.plans select * from pg_catalog.jsonb_populate_recordset(null::public.plans,coalesce(payload->'plans','[]'::jsonb)) on conflict do nothing;
 insert into public.rsvps select * from pg_catalog.jsonb_populate_recordset(null::public.rsvps,coalesce(payload->'rsvps','[]'::jsonb)) on conflict do nothing;
 insert into public.comments select * from pg_catalog.jsonb_populate_recordset(null::public.comments,coalesce(payload->'comments','[]'::jsonb)) on conflict do nothing;
 insert into public.availability select * from pg_catalog.jsonb_populate_recordset(null::public.availability,coalesce(payload->'availability','[]'::jsonb)) on conflict do nothing;
 insert into public.photos select * from pg_catalog.jsonb_populate_recordset(null::public.photos,coalesce(payload->'photos','[]'::jsonb)) on conflict do nothing;
 insert into public.cb_metadata(name,value) values('legacy_import',pg_catalog.now()::text);
 return true;
end $$;
revoke all on function public.cb_import_legacy(jsonb) from public,anon,authenticated;
grant execute on function public.cb_import_legacy(jsonb) to service_role;
