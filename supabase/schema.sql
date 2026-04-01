-- ============================================================
-- Barbalak-Ball: Supabase Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor to bootstrap the tables.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------
-- 1. games
-- -----------------------------------------------------------
create table if not exists public.games (
  id         uuid        default gen_random_uuid() primary key,
  short_code text        not null unique,
  status     text        not null default 'lobby'
                         check (status in ('lobby', 'settings', 'playing')),
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Allow public read on games"
  on public.games for select
  using (true);

create policy "Allow public insert on games"
  on public.games for insert
  with check (true);

create policy "Allow public update on games"
  on public.games for update
  using (true)
  with check (true);

-- -----------------------------------------------------------
-- 2. players
-- -----------------------------------------------------------
create table if not exists public.players (
  id               uuid        default gen_random_uuid() primary key,
  game_id          uuid        not null references public.games (id) on delete cascade,
  name             text        not null,
  icon_id          text        not null default 'icon-1',
  is_phoneless_phil boolean    not null default false,
  created_at       timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Allow public read on players"
  on public.players for select
  using (true);

create policy "Allow public insert on players"
  on public.players for insert
  with check (true);

create policy "Allow public update on players"
  on public.players for update
  using (true)
  with check (true);

-- -----------------------------------------------------------
-- Enable Realtime for both tables
-- -----------------------------------------------------------
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
