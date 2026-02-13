-- Joppa v1 schema (baseline)
-- NOTE: This is a starting point for Supabase migrations.

-- Extensions
create extension if not exists "pgcrypto";

-- Companies (Brand DNA)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website text,
  brand_primary_color text,
  brand_tone text,
  brand_pitch text,
  created_at timestamptz not null default now()
);

-- Company members (tenancy)
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- Jobs (Job Campaign container)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  raw_intent text not null,

  title text,
  location text,
  seniority text,
  employment_type text,
  extracted_data jsonb not null default '{}'::jsonb,

  job_slug text not null,
  published_at timestamptz,

  -- snapshots for public page safety (fill at publish time)
  company_slug_snapshot text,
  brand_snapshot_public jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_id_idx on public.jobs(company_id);
create index if not exists jobs_status_idx on public.jobs(status);

-- Versioned channel output
create table if not exists public.job_contents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  channel text not null check (channel in ('website','indeed','instagram','facebook','tiktok','linkedin')),
  version int not null,
  state text not null default 'draft' check (state in ('draft','approved','published')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(job_id, channel, version)
);

create index if not exists job_contents_job_id_idx on public.job_contents(job_id);

-- Assets
create table if not exists public.job_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  template_id text not null,
  background_source text not null check (background_source in ('procedural','upload','ai')),
  background_prompt text,
  background_model text,
  background_seed text,
  background_params jsonb not null default '{}'::jsonb,
  background_url text,
  composite_urls jsonb not null default '{}'::jsonb,
  checksum text,
  created_at timestamptz not null default now()
);

-- Generation runs (traceability)
create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  step text not null check (step in ('extract','copy','assets')),
  status text not null check (status in ('queued','running','succeeded','failed')),
  model text,
  prompt text,
  error text,
  cost_usd numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Analytics (future-proof)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  type text not null,
  ts timestamptz not null default now(),
  anon_id text,
  utm jsonb not null default '{}'::jsonb,
  referrer text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.analytics_rollups (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  page_views bigint not null default 0,
  apply_clicks bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS (baseline)
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.jobs enable row level security;
alter table public.job_contents enable row level security;
alter table public.job_assets enable row level security;
alter table public.generation_runs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_rollups enable row level security;

-- Helper function: check membership
create or replace function public.is_company_member(cid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.company_members m
    where m.company_id = cid
      and m.user_id = auth.uid()
  );
$$;

-- Policies
-- Make this script safe to re-run (drop existing policies first)
drop policy if exists "companies_select_member" on public.companies;
drop policy if exists "companies_update_member" on public.companies;
drop policy if exists "company_members_select_member" on public.company_members;
drop policy if exists "jobs_select_member" on public.jobs;
drop policy if exists "jobs_insert_member" on public.jobs;
drop policy if exists "jobs_update_member" on public.jobs;
drop policy if exists "jobs_delete_member" on public.jobs;
drop policy if exists "job_contents_all_member" on public.job_contents;
drop policy if exists "job_assets_all_member" on public.job_assets;
drop policy if exists "generation_runs_all_member" on public.generation_runs;

-- Companies: members can read; owners/admin/editors can update; creation via service/admin flows (v1 keep simple)
create policy "companies_select_member"
on public.companies
for select
using (public.is_company_member(id));

create policy "companies_update_member"
on public.companies
for update
using (public.is_company_member(id))
with check (public.is_company_member(id));

-- Company members: members can read their company; owners/admin manage (simplified for v1)
create policy "company_members_select_member"
on public.company_members
for select
using (public.is_company_member(company_id));

-- Jobs: members can CRUD within company
create policy "jobs_select_member"
on public.jobs
for select
using (public.is_company_member(company_id));

create policy "jobs_insert_member"
on public.jobs
for insert
with check (public.is_company_member(company_id));

create policy "jobs_update_member"
on public.jobs
for update
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "jobs_delete_member"
on public.jobs
for delete
using (public.is_company_member(company_id));

-- Job contents/assets/runs: membership via job.company_id
create policy "job_contents_all_member"
on public.job_contents
for all
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
);

create policy "job_assets_all_member"
on public.job_assets
for all
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
);

create policy "generation_runs_all_member"
on public.generation_runs
for all
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  )
);

-- Public job pages: we recommend a separate public view or edge function.
-- In v1, keep public reads off by default (handled by app using snapshots or a public table/view).

