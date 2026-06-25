-- ============================================================
-- Hypodermical Benelux — Supabase schema
-- Run this in Supabase → SQL Editor (or `supabase db push`).
-- Provides B2B accounts (manual approval), gated trade prices,
-- and a lightweight order log. Security is enforced by RLS:
-- trade prices are readable ONLY by approved B2B accounts.
-- ============================================================

-- ─── B2B profiles (1:1 with auth.users) ─────────────────────
create table if not exists public.b2b_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  contact_name   text,
  company_name   text not null,
  vat_number     text,
  license_number text,
  phone          text,
  country        text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now()
);

comment on table public.b2b_profiles is
  'Professional (B2B) accounts. status flips to approved manually by an admin.';

-- ─── Trade prices, keyed by product SKU (matches products.json) ─
create table if not exists public.trade_prices (
  sku             text primary key,
  price_cents     integer not null check (price_cents >= 0),
  stripe_price_id text,
  min_qty         integer not null default 1 check (min_qty >= 1),
  updated_at      timestamptz not null default now()
);

comment on table public.trade_prices is
  'Wholesale prices, gated by RLS to approved B2B accounts only.';

-- ─── Orders (Stripe remains source of truth; this is a log) ──
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  email             text,
  stripe_session_id text,
  amount_total      integer,
  currency          text default 'eur',
  status            text default 'pending',
  tier              text default 'retail' check (tier in ('retail', 'trade')),
  items             jsonb,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Helper: is the current user an approved B2B account?
-- ============================================================
create or replace function public.is_approved_b2b()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.b2b_profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

-- ============================================================
-- Trigger: force new signups to status 'pending' and prevent
-- self-escalation of status on update.
-- ============================================================
create or replace function public.enforce_b2b_status()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    new.status := 'pending';
  elsif (tg_op = 'UPDATE') then
    -- Only privileged roles (service_role) may change status.
    if (new.status is distinct from old.status)
       and (current_setting('request.jwt.claim.role', true) <> 'service_role') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_b2b_status on public.b2b_profiles;
create trigger trg_enforce_b2b_status
  before insert or update on public.b2b_profiles
  for each row execute function public.enforce_b2b_status();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.b2b_profiles enable row level security;
alter table public.trade_prices enable row level security;
alter table public.orders       enable row level security;

-- b2b_profiles: a user may read + create + edit only their own row.
-- (status changes are blocked by the trigger above.)
drop policy if exists "own profile read"   on public.b2b_profiles;
drop policy if exists "own profile insert" on public.b2b_profiles;
drop policy if exists "own profile update" on public.b2b_profiles;

create policy "own profile read"   on public.b2b_profiles
  for select using (auth.uid() = id);
create policy "own profile insert" on public.b2b_profiles
  for insert with check (auth.uid() = id);
create policy "own profile update" on public.b2b_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- trade_prices: readable only by approved B2B accounts. No client writes.
drop policy if exists "approved read trade prices" on public.trade_prices;
create policy "approved read trade prices" on public.trade_prices
  for select using (public.is_approved_b2b());

-- orders: a user may read their own orders. Inserts happen server-side
-- via the service role (which bypasses RLS).
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders
  for select using (auth.uid() = user_id);

-- ============================================================
-- Seed example (optional) — replace SKUs/prices with real values.
-- Trade prices are in cents. Leave stripe_price_id null to have the
-- checkout API create ad-hoc prices, or set a recurring Stripe price.
-- ============================================================
-- insert into public.trade_prices (sku, price_cents) values
--   ('HY-HC-GLYCO-001', 2400),
--   ('HY-SPF50-001',    1800)
-- on conflict (sku) do update set price_cents = excluded.price_cents;
