import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Load backend .env when present
const backendEnvPath = path.resolve(process.cwd(), 'packages', 'backend', '.env');
if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath });
else dotenv.config();

const argv = yargs(hideBin(process.argv))
  .option('email', { type: 'string', describe: 'Only seed the given email from config' })
  .argv as { email?: string };

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

type DemoUser = { id: string; email: string; profile: string; pixel_id: string };

function readConfig(): DemoUser[] {
  const p = path.resolve(process.cwd(), 'scripts', 'seed_config.json');
  const raw = fs.readFileSync(p, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.demo_users || [];
}

async function resolveOrCreateAuthUser(email: string) {
  // Try to find existing auth user
  try {
    const maybe = (supabase.auth.admin as any).getUserByEmail?.(email);
    if (maybe) {
      const { data, error } = await maybe;
      if (!error && data) return data.id;
    }
  } catch (e) {
    // continue to fallback
  }

  try {
    const list = await (supabase.auth.admin as any).listUsers?.();
    const usersArray: any[] = (list && (list.data?.users || list.data || [])) || [];
    const found = usersArray.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (found) return found.id;
  } catch (e) {
    // ignore
  }

  // If admin create user API exists, try to create a lightweight auth user
  try {
    const create = (supabase.auth.admin as any).createUser?.({ email, password: 'demo-password' });
    if (create) {
      const { data, error } = await create;
      if (!error && data) return data.id;
    }
  } catch (e) {
    // cannot create; fall back to no-op
  }

  return undefined;
}

function journeysForProfile(profile: string) {
  // Basic journey templates per profile
  if (profile === 'google-heavy') {
    return Array.from({ length: 30 }).map((_, i) => ({ channels: i % 5 === 0 ? ['instagram'] : ['google'], amount: 2000 + (i % 7) * 200, daysAgo: (i % 20) + 1 }));
  }
  if (profile === 'social-first') {
    return Array.from({ length: 30 }).map((_, i) => ({ channels: i % 3 === 0 ? ['facebook', 'google'] : ['facebook'], amount: 1800 + (i % 6) * 150, daysAgo: (i % 25) + 1 }));
  }
  if (profile === 'balanced') {
    const templates = [['google'], ['facebook'], ['email','google'], ['instagram']];
    return Array.from({ length: 30 }).map((_, i) => ({ channels: templates[i % templates.length], amount: 1500 + (i % 10) * 120, daysAgo: (i % 30) + 1 }));
  }
  // personal-demo or fallback
  return Array.from({ length: 30 }).map((_, i) => ({ channels: i % 4 === 0 ? ['email','google'] : ['google'], amount: 1000 + (i % 8) * 100, daysAgo: (i % 20) + 1 }));
}

async function upsertDemoUser(u: DemoUser) {
  console.log('Seeding for', u.email, 'profile', u.profile);

  // Try resolve auth user id; fallback to provided id
  const authId = await resolveOrCreateAuthUser(u.email).catch(() => undefined);
  const userId = authId || u.id;

  const userRecord = {
    id: userId,
    email: u.email,
    pixel_id: u.pixel_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as any;

  const connections = [
    { id: randomUUID(), user_id: userId, platform: 'google_analytics_4', status: 'connected', access_token: 'ga4-seed-token', platform_account_id: `ga_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'meta', status: 'connected', access_token: 'meta-seed-token', platform_account_id: `meta_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'stripe', status: 'connected', access_token: 'stripe-seed-token', platform_account_id: `stripe_${userId.slice(0,8)}` }
  ];

  // Upsert user
  const up = await supabase.from('users').upsert(userRecord, { onConflict: 'email' } as any);
  if (up.error) console.warn('users upsert warning:', (up.error as any)?.message || up.error);

  // Upsert connections
  for (const c of connections) {
    const { error } = await supabase.from('platform_connections').upsert(c, { onConflict: 'user_id,platform' } as any);
    if (error) console.warn('platform_connections upsert warning:', (error as any)?.message || error);
  }

  // Generate journeys and insert pixel events + verified conversions + raw_events (spend and stripe)
  const journeys = journeysForProfile(u.profile);
  const pixelEvents: any[] = [];
  const verifiedConversions: any[] = [];
  const rawEvents: any[] = [];

  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < journeys.length; i++) {
    const j = journeys[i];
    const convTime = new Date(now - (j.daysAgo || 1) * msPerDay);
    const txnId = `demo_txn_${userId.slice(0,8)}_${1000 + i}`;
    const sessionIds: string[] = [];

    for (let t = 0; t < j.channels.length; t++) {
      const sessionId = randomUUID();
      sessionIds.push(sessionId);
      const touchTime = new Date(convTime.getTime() - (j.channels.length - t) * 60 * 60 * 1000);

      pixelEvents.push({ id: randomUUID(), pixel_id: u.pixel_id, session_id: sessionId, user_id: userId, event_type: 'page_view', page_url: 'https://example.com/product', utm_source: j.channels[t], utm_medium: 'cpc', utm_campaign: `campaign_${j.channels[t]}`, timestamp: touchTime.toISOString(), user_agent: 'Mozilla/5.0' });

      if (t === j.channels.length - 1) {
        pixelEvents.push({ id: randomUUID(), pixel_id: u.pixel_id, session_id: sessionId, user_id: userId, event_type: 'conversion', page_url: 'https://example.com/checkout/complete', utm_source: j.channels[t], utm_medium: 'cpc', utm_campaign: `campaign_${j.channels[t]}`, timestamp: convTime.toISOString(), user_agent: 'Mozilla/5.0', metadata: { order_id: `ORDER-${1000 + i}` } });
      }
    }

    verifiedConversions.push({ id: randomUUID(), user_id: userId, transaction_id: txnId, email: u.email, amount: j.amount, currency: 'PHP', pixel_session_id: sessionIds[sessionIds.length - 1], attributed_channel: j.channels[j.channels.length - 1], confidence_score: 70 + Math.floor(Math.random() * 25), confidence_level: j.channels.length > 1 ? 'high' : 'medium', attribution_method: j.channels.length > 1 ? 'dual_verified' : 'single_source', timestamp: convTime.toISOString(), metadata: { journey_channels: j.channels } });

    // Stripe charge raw event
    rawEvents.push({ id: randomUUID(), user_id: userId, platform: 'stripe', event_type: 'stripe_charge', event_data: { id: txnId, amount: j.amount, currency: 'PHP' }, timestamp: convTime.toISOString() });
  }

  // Insert pixel events in chunks
  for (let i = 0; i < pixelEvents.length; i += 50) {
    const chunk = pixelEvents.slice(i, i + 50);
    const { error } = await supabase.from('pixel_events').insert(chunk);
    if (error) console.warn('pixel_events insert warning:', (error as any)?.message || error);
  }

  // Insert verified conversions
  for (let i = 0; i < verifiedConversions.length; i += 50) {
    const chunk = verifiedConversions.slice(i, i + 50);
    const { error } = await supabase.from('verified_conversions').upsert(chunk, { onConflict: 'transaction_id' } as any);
    if (error) console.warn('verified_conversions warning:', (error as any)?.message || error);
  }

  // Insert raw events
  for (let i = 0; i < rawEvents.length; i += 50) {
    const chunk = rawEvents.slice(i, i + 50);
    const { error } = await supabase.from('raw_events').insert(chunk);
    if (error) console.warn('raw_events warning:', (error as any)?.message || error);
  }

  console.log('Seeded user:', u.email, '->', userId);
}

async function main() {
  const config = readConfig();
  const toSeed = argv.email ? config.filter(c => c.email.toLowerCase() === argv.email?.toLowerCase()) : config;
  if (!toSeed.length) {
    console.error('No matching demo users found for', argv.email || '(none)');
    process.exit(1);
  }

  for (const u of toSeed) {
    try {
      await upsertDemoUser(u);
    } catch (e) {
      console.error('Failed to seed user', u.email, typeof e === 'object' && e !== null && 'message' in e ? (e as any).message : e);
    }
  }

  console.log('All done.');
  process.exit(0);
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
