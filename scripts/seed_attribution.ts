import { existsSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load repo root .env first, then backend .env if present
const rootEnv = dotenv.config();
const backendEnvPath = path.resolve(process.cwd(), 'packages', 'backend', '.env');
if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const argv = yargs(hideBin(process.argv))
  .option('email', { type: 'string', describe: 'Supabase auth user email to attach seed data to' })
  .argv as { email?: string };

async function getSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const supabase = await getSupabaseClient();

  // Resolve auth user id if email provided
  let resolvedUserId: string | undefined;
  if (argv.email) {
    // Try getUserByEmail (if available) then fallback to listUsers
    try {
      const maybe = (supabase.auth.admin as any).getUserByEmail?.(argv.email);
      if (maybe) {
        const { data, error } = await maybe;
        if (!error && data) resolvedUserId = data.id;
      }
    } catch (e) {
      // ignore and fallback
    }

    if (!resolvedUserId) {
      const { data: listData } = await (supabase.auth.admin as any).listUsers?.() ?? { data: null };
      const usersArray: any[] = (listData && (listData.users || listData)) || [];
      const found = usersArray.find((u: any) => String(u.email).toLowerCase() === String(argv.email).toLowerCase());
      if (found) resolvedUserId = found.id;
    }

    if (!resolvedUserId) {
      console.error('Auth user not found for email:', argv.email);
      process.exit(1);
    }
    console.log('Seeding attribution for user id:', resolvedUserId);
  }

  // Records (UUIDs chosen explicitly)
  const user = {
    id: resolvedUserId || '11111111-1111-1111-1111-111111111111',
    email: argv.email || 'customer@example.com',
    pixel_id: 'pixel_abc123',
    created_at: new Date('2026-02-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-02-01T08:00:00Z').toISOString()
  };

  const connections = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: user.id,
      platform: 'google_analytics_4',
      status: 'connected',
      access_token: 'ga4-fake-access-token',
      platform_account_id: 'ga_account_1',
      metadata: { note: 'seed GA4 connection' },
      connected_at: '2026-02-05T09:00:00Z',
      last_synced_at: '2026-02-06T09:00:00Z'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      user_id: user.id,
      platform: 'stripe',
      status: 'connected',
      access_token: 'stripe-fake-access-token',
      platform_account_id: 'stripe_account_1',
      metadata: { note: 'seed stripe connection' },
      connected_at: '2026-02-05T09:10:00Z',
      last_synced_at: '2026-02-06T09:10:00Z'
    }
  ];

  // Generate 50 transactions and corresponding pixel sessions
  const pixelEvents: any[] = [];
  const rawEvents: any[] = [];

  const startDate = new Date('2026-02-01T00:00:00Z').getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 50; i++) {
    // determine origin platform for this session
    const origin = i % 4 === 0 ? 'google' : i % 4 === 1 ? 'facebook' : i % 4 === 2 ? 'instagram' : 'email_campaign';
    const txnId = `txn_${1001 + i}`;
    const sessionId = randomUUID();
    const eventDate = new Date(startDate + (i % 7) * msPerDay + (i % 24) * 60 * 60 * 1000);
    const gaDate = eventDate.toISOString().slice(0, 10).replace(/-/g, '');

    pixelEvents.push({
      id: randomUUID(),
      pixel_id: 'pixel_abc123',
      session_id: sessionId,
      user_id: user.id,
      event_type: 'page_view',
      page_url: 'https://example.com/product',
      referrer: 'https://google.com',
      utm_source: origin,
      utm_medium: 'cpc',
      utm_campaign: 'spring_sale',
      utm_term: 'shoes',
      utm_content: `variant-${i % 3}`,
      timestamp: new Date(eventDate.getTime() - 10 * 60 * 1000).toISOString(),
      user_agent: 'Mozilla/5.0',
      metadata: { seq: i, origin_platform: origin }
    });

    pixelEvents.push({
      id: randomUUID(),
      pixel_id: 'pixel_abc123',
      session_id: sessionId,
      user_id: user.id,
      event_type: 'conversion',
      page_url: 'https://example.com/checkout/complete',
      referrer: 'https://example.com/product',
      utm_source: origin,
      utm_medium: 'cpc',
      utm_campaign: 'spring_sale',
      utm_term: 'shoes',
      utm_content: `variant-${i % 3}`,
      timestamp: eventDate.toISOString(),
      user_agent: 'Mozilla/5.0',
      metadata: { order_id: `ORDER-${1000 + i}`, origin_platform: origin }
    });

    rawEvents.push({
      id: randomUUID(),
      user_id: user.id,
      platform: 'stripe',
      event_type: 'stripe_charge',
      event_data: { id: txnId, receipt_email: user.email, amount: 50 + (i % 5) * 10, currency: 'PHP', metadata: { order_id: `ORDER-${1000 + i}` } },
      timestamp: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
    });

  if (i % 3 === 0) {
      rawEvents.push({
        id: randomUUID(),
        user_id: user.id,
        platform: 'google_analytics_4',
        event_type: 'ga4_traffic_source',
      event_data: { date: gaDate, channel_group: origin, sessionSource: origin, conversions: 1, origin_platform: origin },
        timestamp: eventDate.toISOString()
      });
    }
  }

  // Upsert user
  console.log('Upserting user...');
  let resp = await supabase.from('users').upsert(user, { onConflict: 'email' } as any);
  if (resp.error) throw resp.error;

  // Upsert connections
  console.log('Upserting platform connections...');
  for (const conn of connections) {
    const { error: e } = await supabase.from('platform_connections').upsert(conn, { onConflict: 'user_id,platform' } as any);
    if (e) throw e;
  }

  // Insert pixel events in chunks
  console.log(`Inserting ${pixelEvents.length} pixel events...`);
  for (let i = 0; i < pixelEvents.length; i += 20) {
    const chunk = pixelEvents.slice(i, i + 20);
    const { error: pErr } = await supabase.from('pixel_events').insert(chunk);
    if (pErr) console.warn('pixel_events insert warning:', pErr.message);
  }

  // Insert raw events in chunks
  console.log(`Inserting ${rawEvents.length} raw events...`);
  for (let i = 0; i < rawEvents.length; i += 20) {
    const chunk = rawEvents.slice(i, i + 20);
    const { error: rErr } = await supabase.from('raw_events').insert(chunk);
    if (rErr) console.warn('raw_events insert warning:', rErr.message);
  }

  console.log('Seed completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
