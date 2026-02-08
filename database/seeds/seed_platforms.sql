-- Seed raw_events explicitly for each platform: meta (ad_spend), google_analytics_4 (ga4_traffic_source),
-- stripe (stripe_charge), paypal (paypal_charge). 100 rows per platform for user 36dcc72d-6e7e-479c-a6ea-b412aaf7168f

-- META: ad_spend events
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
SELECT
  gen_random_uuid()::uuid AS id,
  '36dcc72d-6e7e-479c-a6ea-b412aaf7168f'::uuid AS user_id,
  'meta' AS platform,
  'ad_spend' AS event_type,
  jsonb_build_object(
    'campaign_id', ('cmp_' || i),
    'channel', CASE WHEN (i % 5)=0 THEN 'instagram' WHEN (i % 5)=1 THEN 'facebook' WHEN (i % 5)=2 THEN 'google' WHEN (i % 5)=3 THEN 'tiktok' ELSE 'email' END,
    'impressions', (1000 + i * 10),
    'clicks', ((i % 200) + 1),
    'spend', round((((i % 200) + 1) * 1.5)::numeric, 2),
    'currency', 'PHP'
  ) AS event_data,
  now() - ((i % 30) || ' days')::interval + ((i % 24) || ' hours')::interval AS timestamp,
  now() AS created_at
FROM generate_series(1,100) AS s(i)
ON CONFLICT DO NOTHING;

-- GOOGLE_ANALYTICS_4: ga4_traffic_source events
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
SELECT
  gen_random_uuid()::uuid,
  '36dcc72d-6e7e-479c-a6ea-b412aaf7168f'::uuid,
  'google_analytics_4',
  'ga4_traffic_source',
  jsonb_build_object(
    'date', to_char(now() - ((i % 30) || ' days')::interval, 'YYYYMMDD'),
    'channel_group', CASE WHEN (i % 4)=0 THEN 'google' WHEN (i % 4)=1 THEN 'facebook' WHEN (i % 4)=2 THEN 'email' ELSE 'instagram' END,
    'sessionSource', CASE WHEN (i % 3)=0 THEN 'organic' ELSE 'cpc' END,
    'conversions', (i % 3),
    'utm_source', ('utm_' || (i % 10))
  ),
  now() - ((i % 30) || ' days')::interval + ((i % 24) || ' hours')::interval,
  now()
FROM generate_series(1,100) AS s(i)
ON CONFLICT DO NOTHING;

-- STRIPE: stripe_charge events
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
SELECT
  gen_random_uuid()::uuid,
  '36dcc72d-6e7e-479c-a6ea-b412aaf7168f'::uuid,
  'stripe',
  'stripe_charge',
  jsonb_build_object(
    'id', ('txn_stripe_' || i),
    'receipt_email', ('payer' || (i % 50) || '@example.com'),
    'amount', round((((i % 200) + 1) * 10)::numeric, 2),
    'currency', 'PHP',
    'metadata', jsonb_build_object('order_id', ('ORDER-' || (1000 + i)))
  ),
  now() - ((i % 30) || ' days')::interval + ((i % 24) || ' hours')::interval,
  now()
FROM generate_series(1,100) AS s(i)
ON CONFLICT DO NOTHING;

-- PAYPAL: paypal_charge events
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
SELECT
  gen_random_uuid()::uuid,
  '36dcc72d-6e7e-479c-a6ea-b412aaf7168f'::uuid,
  'paypal',
  'paypal_charge',
  jsonb_build_object(
    'transaction_id', ('txn_paypal_' || md5(random()::text || i::text)),
    'payer_email', ('payer' || (i % 50) || '@example.com'),
    'amount', round((((i % 150) + 1) * 12)::numeric, 2),
    'currency', 'PHP',
    'status', CASE WHEN (i % 10)=0 THEN 'refunded' WHEN (i % 5)=0 THEN 'pending' ELSE 'completed' END
  ),
  now() - ((i % 30) || ' days')::interval + ((i % 24) || ' hours')::interval,
  now()
FROM generate_series(1,100) AS s(i)
ON CONFLICT DO NOTHING;
