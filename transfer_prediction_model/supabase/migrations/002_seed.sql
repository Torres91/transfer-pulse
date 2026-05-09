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
