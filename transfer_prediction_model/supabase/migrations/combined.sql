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

create index idx_markets_status      on markets(status);
create index idx_markets_player       on markets(player_name);
create index idx_bets_market          on bets(market_id);
create index idx_bets_wallet          on bets(wallet_address);
create index idx_rumour_items_player  on rumour_items(player_name);
create index idx_rumour_items_pubdate on rumour_items(published_at desc);
create index idx_rumour_groups_lookup on rumour_groups(player_name, to_club);

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
-- Seed data: realistic transfer rumours for demo (Phase 1)

insert into clubs (id, name, short_name, country, league) values
  ('11111111-0000-0000-0000-000000000001', 'Real Madrid', 'RMA', 'Spain', 'La Liga'),
  ('11111111-0000-0000-0000-000000000002', 'Manchester City', 'MCI', 'England', 'Premier League'),
  ('11111111-0000-0000-0000-000000000003', 'Arsenal', 'ARS', 'England', 'Premier League'),
  ('11111111-0000-0000-0000-000000000004', 'Paris Saint-Germain', 'PSG', 'France', 'Ligue 1'),
  ('11111111-0000-0000-0000-000000000005', 'Bayern Munich', 'BAY', 'Germany', 'Bundesliga'),
  ('11111111-0000-0000-0000-000000000006', 'Liverpool', 'LIV', 'England', 'Premier League'),
  ('11111111-0000-0000-0000-000000000007', 'Chelsea', 'CHE', 'England', 'Premier League'),
  ('11111111-0000-0000-0000-000000000008', 'Manchester United', 'MUN', 'England', 'Premier League'),
  ('11111111-0000-0000-0000-000000000009', 'Napoli', 'NAP', 'Italy', 'Serie A'),
  ('11111111-0000-0000-0000-000000000010', 'Barcelona', 'BAR', 'Spain', 'La Liga');

-- Rumour groups (3+ sources confirmed, go live)
insert into rumour_groups (id, player_name, from_club, to_club, source_count, sources, credibility) values
  ('22222222-0000-0000-0000-000000000001', 'Victor Osimhen', 'Napoli', 'Chelsea', 3, array['sky_sports', 'bbc_sport', 'the_independent']::source_name[], 78.5),
  ('22222222-0000-0000-0000-000000000002', 'Rodri', 'Manchester City', 'Real Madrid', 3, array['sky_sports', 'the_athletic', 'twitter_x']::source_name[], 45.0),
  ('22222222-0000-0000-0000-000000000003', 'Marcus Rashford', 'Manchester United', NULL, 4, array['sky_sports', 'bbc_sport', 'the_independent', 'the_athletic']::source_name[], 91.2),
  ('22222222-0000-0000-0000-000000000004', 'Bernardo Silva', 'Manchester City', 'Barcelona', 2, array['sky_sports', 'twitter_x']::source_name[], 38.0),
  ('22222222-0000-0000-0000-000000000005', 'Alexander Isak', 'Newcastle', 'Arsenal', 3, array['bbc_sport', 'the_independent', 'twitter_x']::source_name[], 67.3);

-- Markets (live)
insert into markets (id, rumour_group_id, market_type, title, description, player_name, from_club, to_club, status, source_count, yes_pool, no_pool, closes_at) values
  (
    '33333333-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'binary',
    'Will Victor Osimhen sign for Chelsea?',
    'Osimhen has been heavily linked with a move to Stamford Bridge. Chelsea have held talks with Napoli over a summer deal.',
    'Victor Osimhen', 'Napoli', 'Chelsea',
    'live', 3,
    78500000, 42300000,
    now() + interval '45 days'
  ),
  (
    '33333333-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000001',
    'fee_over_under',
    'Will Osimhen''s fee exceed £80m?',
    'Napoli are demanding over £100m. Will Chelsea meet the threshold?',
    'Victor Osimhen', 'Napoli', 'Chelsea',
    'live', 3,
    52100000, 88400000,
    now() + interval '45 days'
  ),
  (
    '33333333-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000003',
    'destination',
    'Where will Marcus Rashford sign?',
    'Rashford is set to leave Man United this summer. Multiple clubs are in the race.',
    'Marcus Rashford', 'Manchester United', NULL,
    'live', 4,
    0, 0,
    now() + interval '52 days'
  ),
  (
    '33333333-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000005',
    'binary',
    'Will Alexander Isak sign for Arsenal?',
    'Arsenal have identified Isak as their top striker target. Newcastle are holding firm on their valuation.',
    'Alexander Isak', 'Newcastle', 'Arsenal',
    'live', 3,
    61200000, 38800000,
    now() + interval '60 days'
  ),
  (
    '33333333-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000004',
    'binary',
    'Will Bernardo Silva sign for Barcelona?',
    'Barcelona have long admired Silva. A deal hinges on City''s asking price and Barca''s finances.',
    'Bernardo Silva', 'Manchester City', 'Barcelona',
    'pending', 2,
    0, 0,
    now() + interval '55 days'
  ),
  (
    '33333333-0000-0000-0000-000000000006',
    '22222222-0000-0000-0000-000000000001',
    'deadline',
    'Will Osimhen complete a move before August 31?',
    'Deadline day market — will the transfer be confirmed before the window shuts?',
    'Victor Osimhen', 'Napoli', 'Chelsea',
    'live', 3,
    91000000, 31500000,
    '2025-08-31T23:59:59Z'
  );

-- Destination options for Rashford market
insert into market_destinations (market_id, club_name, pool) values
  ('33333333-0000-0000-0000-000000000003', 'Paris Saint-Germain', 44200000),
  ('33333333-0000-0000-0000-000000000003', 'Barcelona', 28500000),
  ('33333333-0000-0000-0000-000000000003', 'Bayern Munich', 19800000),
  ('33333333-0000-0000-0000-000000000003', 'Saudi Pro League', 35100000),
  ('33333333-0000-0000-0000-000000000003', 'Other', 12400000);

-- Fee threshold for Osimhen fee market
update markets set fee_threshold = 8000000000 where id = '33333333-0000-0000-0000-000000000002'; -- £80m in pence

-- Recent rumour items for the feed
insert into rumour_items (source, headline, player_name, from_club, to_club, published_at) values
  ('sky_sports', 'Chelsea close in on Osimhen as Napoli accept £85m bid', 'Victor Osimhen', 'Napoli', 'Chelsea', now() - interval '2 hours'),
  ('bbc_sport', 'Rashford''s future at Manchester United in serious doubt', 'Marcus Rashford', 'Manchester United', NULL, now() - interval '3 hours'),
  ('the_independent', 'Arsenal make £80m bid for Isak as striker hunt intensifies', 'Alexander Isak', 'Newcastle', 'Arsenal', now() - interval '5 hours'),
  ('twitter_x', 'Fabrizio Romano: Osimhen to Chelsea, here we go expected this week', 'Victor Osimhen', 'Napoli', 'Chelsea', now() - interval '1 hour'),
  ('the_athletic', 'PSG leading the race for Rashford with personal terms agreed', 'Marcus Rashford', 'Manchester United', 'Paris Saint-Germain', now() - interval '6 hours'),
  ('sky_sports', 'Newcastle reject Arsenal bid for Isak — want £90m', 'Alexander Isak', 'Newcastle', 'Arsenal', now() - interval '8 hours'),
  ('bbc_sport', 'Silva open to Barcelona move but City demand £60m', 'Bernardo Silva', 'Manchester City', 'Barcelona', now() - interval '12 hours'),
  ('the_independent', 'Rashford tells United he wants to leave this summer', 'Marcus Rashford', 'Manchester United', NULL, now() - interval '18 hours');
