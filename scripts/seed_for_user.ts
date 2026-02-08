import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load env (allow pointing to a specific env file via ROOT_ENV_PATH)
dotenv.config({ path: process.env.ROOT_ENV_PATH || undefined });

const argv = yargs(hideBin(process.argv))
  .option('email', { type: 'string', demandOption: true, describe: 'Supabase auth user email to seed data for' })
  .argv as { email: string };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  const email = argv.email;
  console.log('Looking up auth user for email:', email);

  // Some supabase client typings may not include getUserByEmail; fall back to listing users and finding by email
  const { data: listData, error: listErr } = await (supabase.auth.admin as any).listUsers?.() ?? { data: null, error: null };
  if (listErr) {
    console.error('Failed to list auth users:', listErr.message || listErr);
    process.exit(1);
  }

  // Support different shapes: { users: [...] } or an array
  const usersArray: any[] = (listData && (listData.users || listData)) || [];
  const authUser = usersArray.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!authUser) {
    console.error('Auth user not found for email:', email);
    process.exit(1);
  }
  const authUserId = authUser.id;
  console.log('Found auth user id:', authUserId);

  // Upsert a users row (mirror auth user to users table)
  const userRow = {
    id: authUserId,
    email,
    pixel_id: `pix_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: userUpsertErr } = await supabase.from('users').upsert(userRow, { onConflict: 'id' } as any);
  if (userUpsertErr) {
    console.error('users upsert failed:', userUpsertErr.message);
    process.exit(1);
  }

  // Platform connections
  const connections = [
    {
      id: randomUUID(),
      user_id: authUserId,
      platform: 'google_analytics_4',
      status: 'connected',
      access_token: 'ga4-seed-token',
      platform_account_id: 'ga_seed_account',
      metadata: { seeded: true },
      connected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      user_id: authUserId,
      platform: 'stripe',
      status: 'connected',
      access_token: 'stripe-seed-token',
      platform_account_id: 'stripe_seed_account',
      metadata: { seeded: true },
      connected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  for (const conn of connections) {
    const { error } = await supabase.from('platform_connections').upsert(conn, { onConflict: 'user_id,platform' } as any);
    if (error) console.warn('platform_connections upsert warning:', error.message);
  }

  // Pixel events, raw events, verified conversions
  const now = new Date();
  const sessionId = randomUUID();

  const pixelEvents = [
    {
      id: randomUUID(),
      pixel_id: userRow.pixel_id,
      session_id: sessionId,
      user_id: authUserId,
      event_type: 'page_view',
      page_url: 'https://example.com/product',
      referrer: 'https://google.com',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'seed_campaign',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      user_agent: 'seed-agent',
      metadata: { note: 'seed page view' },
      created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      pixel_id: userRow.pixel_id,
      session_id: sessionId,
      user_id: authUserId,
      event_type: 'conversion',
      page_url: 'https://example.com/checkout/complete',
      referrer: 'https://example.com/product',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'seed_campaign',
      timestamp: now.toISOString(),
      user_agent: 'seed-agent',
      metadata: { order_id: 'SEED-ORDER-1' },
      created_at: new Date().toISOString(),
    },
  ];

  for (let i = 0; i < pixelEvents.length; i += 20) {
    const chunk = pixelEvents.slice(i, i + 20);
    const { error } = await supabase.from('pixel_events').insert(chunk);
    if (error) console.warn('pixel_events insert warning:', error.message);
  }

  const rawEvents = [
    {
      id: randomUUID(),
      user_id: authUserId,
      platform: 'stripe',
      event_type: 'stripe_charge',
      event_data: { id: `txn_seed_${Date.now()}`, receipt_email: email, amount: 150.0, currency: 'PHP', metadata: { order_id: 'SEED-ORDER-1' } },
      timestamp: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  for (let i = 0; i < rawEvents.length; i += 20) {
    const chunk = rawEvents.slice(i, i + 20);
    const { error } = await supabase.from('raw_events').insert(chunk);
    if (error) console.warn('raw_events insert warning:', error.message);
  }

  const verifiedConversions = [
    {
      id: randomUUID(),
      user_id: authUserId,
      transaction_id: `SEED-TXN-${Date.now()}`,
      email,
      amount: 150.0,
      currency: 'PHP',
      pixel_session_id: sessionId,
      attributed_channel: 'google',
      confidence_score: 90,
      confidence_level: 'high',
      attribution_method: 'dual_verified',
      timestamp: now.toISOString(),
      created_at: new Date().toISOString(),
      metadata: { seeded: true },
    },
  ];

  for (let i = 0; i < verifiedConversions.length; i += 20) {
    const chunk = verifiedConversions.slice(i, i + 20);
    const { error } = await supabase.from('verified_conversions').upsert(chunk, { onConflict: 'transaction_id' } as any);
    if (error) console.warn('verified_conversions insert warning:', error.message);
  }

  console.log('Seed for', email, 'complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
