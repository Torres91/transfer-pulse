-- TransferPulse database schema

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Core lookup tables
-- ─────────────────────────────────────────────

create table clubs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  short_name  text,
  country     text,
  league      text,
  logo_url    text,
  created_at  timestamptz default now()
);

create table players (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  position      text,
  nationality   text,
  current_club  uuid references clubs(id),
  photo_url     text,
  market_value  bigint, -- in pence/cents
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Rumour ingestion
-- ─────────────────────────────────────────────

create type source_name as enum (
  'sky_sports',
  'bbc_sport',
  'the_independent',
  'the_athletic',
  'twitter_x',
  'fabrizio_romano',
  'other'
);

-- Raw rumour items scraped from sources
create table rumour_items (
  id            uuid primary key default uuid_generate_v4(),
  source        source_name not null,
  headline      text not null,
  url           text,
  player_name   text,             -- extracted entity
  from_club     text,
  to_club       text,
  fee_mention   bigint,           -- extracted fee in pence if mentioned
  published_at  timestamptz not null,
  raw_text      text,
  created_at    timestamptz default now(),
  unique(source, url)
);

-- Grouped rumours (same player+transfer from multiple sources)
create table rumour_groups (
  id            uuid primary key default uuid_generate_v4(),
  player_name   text not null,
  from_club     text,
  to_club       text,             -- null for multi-destination markets
  source_count  int default 0,
  sources       source_name[],
  credibility   numeric(4,2) default 0, -- 0-100 score
  first_seen    timestamptz default now(),
  last_updated  timestamptz default now()
);

create table rumour_group_items (
  group_id    uuid references rumour_groups(id) on delete cascade,
  item_id     uuid references rumour_items(id) on delete cascade,
  primary key (group_id, item_id)
);

-- ─────────────────────────────────────────────
-- Prediction markets
-- ─────────────────────────────────────────────

create type market_type as enum (
  'binary',         -- YES/NO: will player X sign for club Y?
  'fee_over_under', -- OVER/UNDER a specific fee threshold
  'destination',    -- Which club? (multi-outcome)
  'deadline'        -- Done before a specific date?
);

create type market_status as enum (
  'pending',    -- < 3 sources, not live yet
  'live',       -- open for betting
  'closed',     -- no new bets, awaiting resolution
  'resolved',   -- settled
  'cancelled'   -- cancelled (rumour debunked)
);

create type market_resolution as enum (
  'yes',
  'no',
  'over',
  'under',
  'cancelled'
);

create table markets (
  id              uuid primary key default uuid_generate_v4(),
  rumour_group_id uuid references rumour_groups(id),
  market_type     market_type not null,
  title           text not null,
  description     text,
  player_name     text not null,
  from_club       text,
  to_club         text,
  fee_threshold   bigint,           -- for fee markets, in pence
  deadline        timestamptz,      -- for deadline markets
  status          market_status default 'pending',
  source_count    int default 0,
  -- Parimutuel pools (in MATIC wei for on-chain, or paper units for Phase 1)
  yes_pool        bigint default 0,
  no_pool         bigint default 0,
  -- Resolution
  resolution      market_resolution,
  resolved_at     timestamptz,
  resolver        text,             -- wallet address or 'admin'
  -- On-chain reference (Phase 2+)
  contract_address text,
  chain_id        int,
  -- Metadata
  closes_at       timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- For multi-destination markets, each possible destination gets a pool
create table market_destinations (
  id          uuid primary key default uuid_generate_v4(),
  market_id   uuid references markets(id) on delete cascade,
  club_name   text not null,
  pool        bigint default 0,
  is_winner   boolean,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Bets (Phase 1: paper / Phase 2: on-chain)
-- ─────────────────────────────────────────────

create type bet_side as enum ('yes', 'no', 'over', 'under');

create table bets (
  id              uuid primary key default uuid_generate_v4(),
  market_id       uuid references markets(id) on delete cascade,
  wallet_address  text not null,
  side            bet_side not null,
  destination_id  uuid references market_destinations(id), -- for destination markets
  amount          bigint not null,  -- in MATIC wei (or paper units)
  is_paper        boolean default true,  -- Phase 1 flag
  claimed         boolean default false,
  payout          bigint,
  tx_hash         text,             -- on-chain tx (Phase 2+)
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

create index on markets(status);
create index on markets(player_name);
create index on bets(market_id);
create index on bets(wallet_address);
create index on rumour_items(player_name);
create index on rumour_items(published_at desc);
create index on rumour_groups(player_name, to_club);

-- ─────────────────────────────────────────────
-- Updated_at trigger
-- ─────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger markets_updated_at
  before update on markets
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- Row-level security (enable for Supabase)
-- ─────────────────────────────────────────────

alter table markets enable row level security;
alter table bets enable row level security;
alter table rumour_items enable row level security;
alter table rumour_groups enable row level security;

-- Public read on markets and rumours
create policy "markets_public_read" on markets for select using (true);
create policy "rumours_public_read" on rumour_items for select using (true);
create policy "groups_public_read" on rumour_groups for select using (true);

-- Users can only read/write their own bets
create policy "bets_public_read" on bets for select using (true);
create policy "bets_insert_own" on bets for insert with check (true);
