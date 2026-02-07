-- Seed: Attribution test data
-- Created: 2026-02-07
-- Inserts a test user, platform connections, pixel events, GA4 raw event, and Stripe raw event

BEGIN;

-- 1) Test user
INSERT INTO users (id, email, pixel_id, created_at, updated_at)
VALUES
('11111111-1111-1111-1111-111111111111', 'customer@example.com', 'pixel_abc123', '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z')
ON CONFLICT (email) DO UPDATE SET pixel_id = EXCLUDED.pixel_id, updated_at = EXCLUDED.updated_at;

-- 2) Platform connections for GA4 and Stripe
INSERT INTO platform_connections (id, user_id, platform, status, access_token, refresh_token, token_expires_at, platform_account_id, metadata, connected_at, last_synced_at, created_at)
VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'google_analytics_4', 'connected', 'ga4-fake-access-token', NULL, NULL, 'ga_account_1', '{"note":"seed GA4 connection"}', '2026-02-05T09:00:00Z', '2026-02-06T09:00:00Z', NOW())
ON CONFLICT (user_id, platform) DO UPDATE SET access_token = EXCLUDED.access_token, metadata = EXCLUDED.metadata, last_synced_at = EXCLUDED.last_synced_at;

INSERT INTO platform_connections (id, user_id, platform, status, access_token, refresh_token, token_expires_at, platform_account_id, metadata, connected_at, last_synced_at, created_at)
VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'stripe', 'connected', 'stripe-fake-access-token', NULL, NULL, 'stripe_account_1', '{"note":"seed stripe connection"}', '2026-02-05T09:10:00Z', '2026-02-06T09:10:00Z', NOW())
ON CONFLICT (user_id, platform) DO UPDATE SET access_token = EXCLUDED.access_token, metadata = EXCLUDED.metadata, last_synced_at = EXCLUDED.last_synced_at;

-- 3) Pixel events: same session (page_view then conversion) with UTM tags
INSERT INTO pixel_events (id, pixel_id, session_id, user_id, event_type, page_url, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, timestamp, user_agent, ip_address, metadata, created_at)
VALUES
('44444444-4444-4444-4444-444444444444', 'pixel_abc123', 'sess-abc-1', '11111111-1111-1111-1111-111111111111', 'page_view', 'https://example.com/product', 'https://google.com', 'google', 'cpc', 'summer_sale', 'shoes', 'ad-variant-a', '2026-02-05T10:15:00Z', 'Mozilla/5.0', NULL, '{"note":"seed page view"}', NOW()),
('55555555-5555-5555-5555-555555555555', 'pixel_abc123', 'sess-abc-1', '11111111-1111-1111-1111-111111111111', 'conversion', 'https://example.com/checkout/complete', 'https://example.com/product', 'google', 'cpc', 'summer_sale', 'shoes', 'ad-variant-a', '2026-02-05T10:25:00Z', 'Mozilla/5.0', NULL, '{"order_id":"ORDER-1001"}', NOW())
ON CONFLICT DO NOTHING;

-- 4) Raw GA4 traffic source event
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
VALUES
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'google_analytics_4', 'ga4_traffic_source',
 '{"date":"20260205","channel_group":"google","sessionSource":"google","conversions":1}', '2026-02-05T00:00:00Z', NOW())
ON CONFLICT DO NOTHING;

-- 5) Raw Stripe charge matching the email and close in time (transaction)
INSERT INTO raw_events (id, user_id, platform, event_type, event_data, timestamp, created_at)
VALUES
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'stripe', 'stripe_charge',
 '{"id":"txn_1001","receipt_email":"customer@example.com","amount":100.00,"currency":"PHP","metadata":{"order_id":"ORDER-1001"}}', '2026-02-06T12:00:00Z', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
