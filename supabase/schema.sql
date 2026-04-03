-- ============================================================
-- Barbalak-Ball: Supabase Database Schema v2
-- ============================================================
-- Run this in the Supabase SQL Editor to bootstrap the tables.
-- If upgrading from v1, drop existing tables first.
-- ============================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------
-- 1. games
-- -----------------------------------------------------------
create table if not exists public.games (
  id              uuid        default gen_random_uuid() primary key,
  short_code      text        not null unique,
  status          text        not null default 'lobby'
                              check (status in ('lobby', 'settings', 'playing', 'finished')),
  point_threshold integer     not null default 100,
  enabled_categories jsonb    not null default '[]'::jsonb,
  current_round   jsonb,
  round_number    integer     not null default 0,
  ffi_count       integer     not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.games enable row level security;
create policy "games_select" on public.games for select using (true);
create policy "games_insert" on public.games for insert with check (true);
create policy "games_update" on public.games for update using (true) with check (true);

-- -----------------------------------------------------------
-- 2. players
-- -----------------------------------------------------------
create table if not exists public.players (
  id                uuid        default gen_random_uuid() primary key,
  game_id           uuid        not null references public.games (id) on delete cascade,
  name              text        not null,
  icon_id           text        not null default 'icon-1',
  is_host           boolean     not null default false,
  score             integer     not null default 0,
  created_at        timestamptz not null default now()
);

alter table public.players enable row level security;
create policy "players_select" on public.players for select using (true);
create policy "players_insert" on public.players for insert with check (true);
create policy "players_update" on public.players for update using (true) with check (true);

-- -----------------------------------------------------------
-- 3. purchases (Point Shop queue)
-- -----------------------------------------------------------
create table if not exists public.purchases (
  id          uuid        default gen_random_uuid() primary key,
  game_id     uuid        not null references public.games (id) on delete cascade,
  buyer_id    uuid        not null references public.players (id) on delete cascade,
  target_id   uuid        references public.players (id) on delete set null,
  item_id     text        not null,
  cost        integer     not null,
  status      text        not null default 'pending'
                          check (status in ('pending', 'executed', 'cancelled')),
  created_at  timestamptz not null default now()
);

alter table public.purchases enable row level security;
create policy "purchases_select" on public.purchases for select using (true);
create policy "purchases_insert" on public.purchases for insert with check (true);
create policy "purchases_update" on public.purchases for update using (true) with check (true);

-- -----------------------------------------------------------
-- 4. answers (Trivia responses)
-- -----------------------------------------------------------
create table if not exists public.answers (
  id              uuid        default gen_random_uuid() primary key,
  game_id         uuid        not null references public.games (id) on delete cascade,
  player_id       uuid        not null references public.players (id) on delete cascade,
  question_id     text        not null,
  selected_option integer     not null,
  is_correct      boolean     not null default false,
  answered_at     timestamptz not null default now()
);

alter table public.answers enable row level security;
create policy "answers_select" on public.answers for select using (true);
create policy "answers_insert" on public.answers for insert with check (true);

-- -----------------------------------------------------------
-- 5. votes (Scategories voting)
-- -----------------------------------------------------------
create table if not exists public.votes (
  id          uuid        default gen_random_uuid() primary key,
  game_id     uuid        not null references public.games (id) on delete cascade,
  voter_id    uuid        not null references public.players (id) on delete cascade,
  round_id    text        not null,
  vote        boolean     not null,
  created_at  timestamptz not null default now(),
  unique (game_id, voter_id, round_id)
);

alter table public.votes enable row level security;
create policy "votes_select" on public.votes for select using (true);
create policy "votes_insert" on public.votes for insert with check (true);

-- -----------------------------------------------------------
-- 6. used_content (content exhaustion tracking)
-- -----------------------------------------------------------
create table if not exists public.used_content (
  id           uuid default gen_random_uuid() primary key,
  game_id      uuid not null references public.games (id) on delete cascade,
  content_type text not null,
  content_id   text not null,
  unique (game_id, content_type, content_id)
);

alter table public.used_content enable row level security;
create policy "used_content_select" on public.used_content for select using (true);
create policy "used_content_insert" on public.used_content for insert with check (true);

-- -----------------------------------------------------------
-- Enable Realtime for all tables
-- -----------------------------------------------------------
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.purchases;
alter publication supabase_realtime add table public.answers;
alter publication supabase_realtime add table public.votes;
