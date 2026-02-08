import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Load backend .env when present
const backendEnvPath = path.resolve(process.cwd(), 'packages', 'backend', '.env');
if (existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath });
else dotenv.config();

const argv = yargs(hideBin(process.argv))
  .option('user-id', { type: 'string', description: 'Target user id to attach events to' })
  .option('email', { type: 'string', description: 'Resolve user id by auth email' })
  .argv as { 'user-id'?: string; email?: string };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function resolveUserIdByEmail(email?: string) {
  if (!email) return undefined;
  try {
    const maybe = (supabase.auth.admin as any).getUserByEmail?.(email);
    if (maybe) {
      const { data, error } = await maybe;
      if (!error && data) return data.id;
    }
  } catch (e) {
    // fallback
  }

  try {
    const list = await (supabase.auth.admin as any).listUsers?.();
    const usersArray: any[] = (list && (list.data?.users || list.data || [])) || [];
    const found = usersArray.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (found) return found.id;
  } catch (e) {
    // ignore
  }

  return undefined;
}

function randTimestamp(i: number) {
  const now = Date.now();
  const days = i % 30;
  const hours = i % 24;
  return new Date(now - days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000).toISOString();
}

function makeMetaEvent(i: number, userId: string) {
  const channel = (i % 5) === 0 ? 'instagram' : (i % 5) === 1 ? 'facebook' : (i % 5) === 2 ? 'google' : (i % 5) === 3 ? 'tiktok' : 'email';
  const clicks = (i % 200) + 1;
  const spend = Math.round(clicks * 1.5 * 100) / 100;
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'meta',
    event_type: 'ad_spend',
    event_data: { campaign_id: `cmp_${i}`, channel, impressions: 1000 + i * 10, clicks, spend, currency: 'PHP' },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString()
  };
}

function makeGa4Event(i: number, userId: string) {
  const channel = (i % 4) === 0 ? 'google' : (i % 4) === 1 ? 'facebook' : (i % 4) === 2 ? 'email' : 'instagram';
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'google_analytics_4',
    event_type: 'ga4_traffic_source',
    event_data: { date: new Date().toISOString().slice(0,10).replace(/-/g,''), channel_group: channel, sessionSource: (i % 3) === 0 ? 'organic' : 'cpc', conversions: i % 3, utm_source: `utm_${i % 10}` },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString()
  };
}

function makeStripeEvent(i: number, userId: string) {
  const amount = Math.round((((i % 200) + 1) * 10) * 100) / 100;
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'stripe',
    event_type: 'stripe_charge',
    event_data: { id: `txn_stripe_${i}`, receipt_email: `payer${i % 50}@example.com`, amount, currency: 'PHP', metadata: { order_id: `ORDER-${1000 + i}` } },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString()
  };
}

function makePaypalEvent(i: number, userId: string) {
  const amount = Math.round((((i % 150) + 1) * 12) * 100) / 100;
  const status = (i % 10) === 0 ? 'refunded' : (i % 5) === 0 ? 'pending' : 'completed';
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'paypal',
    event_type: 'paypal_charge',
    event_data: { transaction_id: `txn_paypal_${i}_${Math.random().toString(36).slice(2,8)}`, payer_email: `payer${i % 50}@example.com`, amount, currency: 'PHP', status },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString()
  };
}

function makeHubspotEvent(i: number, userId: string) {
  const sends = 500 + i * 20;
  const opens = Math.round(sends * (0.15 + (i % 10) * 0.02));
  const clicks = Math.round(opens * (0.08 + (i % 5) * 0.01));
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'hubspot',
    event_type: 'hubspot_marketing_email',
    event_data: {
      email_id: `hs_email_${i}`,
      email_name: `HubSpot Campaign #${i}`,
      subject: `Promo Email ${i}`,
      state: 'sent',
      sends,
      opens,
      clicks,
      bounces: Math.round(sends * 0.02),
      unsubscribes: Math.round(sends * 0.005),
      delivered: sends - Math.round(sends * 0.02),
      channel: 'email',
      spend: Math.round(((i % 80) + 10) * 1.2 * 100) / 100,
      currency: 'PHP',
    },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString(),
  };
}

function makeMailchimpEvent(i: number, userId: string) {
  const emailsSent = 400 + i * 15;
  const uniqueOpens = Math.round(emailsSent * (0.18 + (i % 8) * 0.015));
  const uniqueClicks = Math.round(uniqueOpens * (0.1 + (i % 6) * 0.01));
  return {
    id: randomUUID(),
    user_id: userId,
    platform: 'mailchimp',
    event_type: 'mailchimp_campaign_report',
    event_data: {
      campaign_id: `mc_campaign_${i}`,
      campaign_title: `Mailchimp Newsletter #${i}`,
      campaign_type: 'regular',
      subject_line: `Weekly Update ${i}`,
      emails_sent: emailsSent,
      unique_opens: uniqueOpens,
      open_rate: uniqueOpens / emailsSent,
      unique_clicks: uniqueClicks,
      click_rate: uniqueClicks / emailsSent,
      unsubscribes: Math.round(emailsSent * 0.003),
      bounces: Math.round(emailsSent * 0.015),
      channel: 'email',
      spend: Math.round(((i % 60) + 5) * 0.8 * 100) / 100,
      currency: 'PHP',
    },
    timestamp: randTimestamp(i),
    created_at: new Date().toISOString(),
  };
}

async function insertInBatches(rows: any[], table = 'raw_events', batchSize = 50) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) console.warn(`${table} insert warning:`, (error as any)?.message || error);
    else console.log(`Inserted ${chunk.length} into ${table}`);
  }
}

async function upsertUserAndConnections(userId: string, email?: string) {
  const crypto = await import('crypto');
  const pixelId = 'pix_' + crypto.randomBytes(16).toString('hex');

  const userRecord = { id: userId, email: email || `user+${userId}@example.com`, pixel_id: pixelId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any;
  const { error: uErr } = await supabase.from('users').upsert(userRecord, { onConflict: 'email' } as any);
  if (uErr) console.warn('users upsert warning:', (uErr as any)?.message || uErr);

  const connections = [
    { id: randomUUID(), user_id: userId, platform: 'google_analytics_4', status: 'connected', access_token: 'ga4-seed-token', platform_account_id: `ga_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'meta', status: 'connected', access_token: 'meta-seed-token', platform_account_id: `meta_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'stripe', status: 'connected', access_token: 'stripe-seed-token', platform_account_id: `stripe_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'paypal', status: 'connected', access_token: 'paypal-seed-token', platform_account_id: `paypal_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'hubspot', status: 'connected', access_token: 'hubspot-seed-token', platform_account_id: `hubspot_${userId.slice(0,8)}` },
    { id: randomUUID(), user_id: userId, platform: 'mailchimp', status: 'connected', access_token: 'mailchimp-seed-token', platform_account_id: `mailchimp_${userId.slice(0,8)}` },
  ];

  for (const c of connections) {
    const { error } = await supabase.from('platform_connections').upsert(c, { onConflict: 'user_id,platform' } as any);
    if (error) console.warn('platform_connections upsert warning:', (error as any)?.message || error);
  }

  return pixelId;
}

async function main() {
  let userId = argv['user-id'];
  if (!userId && argv.email) {
    userId = await resolveUserIdByEmail(argv.email);
    if (!userId) {
      console.error('Could not resolve user id for email:', argv.email);
      process.exit(1);
    }
  }

  // Default to the provided demo id if not overridden
  if (!userId) userId = '36dcc72d-6e7e-479c-a6ea-b412aaf7168f';

  console.log('Seeding raw_events for user:', userId);

  const meta: any[] = [];
  const ga4: any[] = [];
  const stripe: any[] = [];
  const paypal: any[] = [];
  const hubspot: any[] = [];
  const mailchimp: any[] = [];

  for (let i = 1; i <= 100; i++) {
    meta.push(makeMetaEvent(i, userId));
    ga4.push(makeGa4Event(i, userId));
    stripe.push(makeStripeEvent(i, userId));
    paypal.push(makePaypalEvent(i, userId));
  }

  // Generate more email events (150 each for HubSpot and Mailchimp)
  for (let i = 1; i <= 150; i++) {
    hubspot.push(makeHubspotEvent(i, userId));
    mailchimp.push(makeMailchimpEvent(i, userId));
  }

  // Upsert user and connections (ensures user exists and provides pixel_id)
  const pixelId = await upsertUserAndConnections(userId, argv.email).catch((e) => {
    console.warn('Failed to upsert user/connections:', (e as any)?.message || e);
    return undefined;
  });

  await insertInBatches(meta);
  await insertInBatches(ga4);
  await insertInBatches(stripe);
  await insertInBatches(paypal);
  await insertInBatches(hubspot);
  await insertInBatches(mailchimp);

  // Generate pixel events and verified conversions tied to the same user and some stripe transactions
  const pixelEvents: any[] = [];
  const verifiedConversions: any[] = [];

  const journeys = [
    ['facebook','google'], ['email','google'], ['facebook','email','google'], ['google'], ['facebook'], ['instagram'],
    ['email'], ['facebook','email'], ['email','instagram'], ['google','email'], ['email','facebook','google']
  ];

  let convIndex = 1;
  for (let i = 0; i < 40; i++) {
    const j = journeys[i % journeys.length];
    const sessionIds: string[] = [];
    for (let t = 0; t < j.length; t++) {
      const sessionId = randomUUID();
      sessionIds.push(sessionId);
      pixelEvents.push({ id: randomUUID(), pixel_id: pixelId || `pix_${userId.replace(/-/g,'').slice(0,16)}`, session_id: sessionId, user_id: userId, event_type: 'page_view', page_url: 'https://example.com/product', referrer: `https://${j[t]}.com`, utm_source: j[t], utm_medium: 'cpc', utm_campaign: `campaign_${j[t]}`, timestamp: randTimestamp(i + t), user_agent: 'Mozilla/5.0', metadata: { journey_index: i, touchpoint: t, ...(j[t] === 'email' ? { email: `user${i}@example.com` } : {}) } });
      if (t === j.length - 1) {
        pixelEvents.push({ id: randomUUID(), pixel_id: pixelId || `pix_${userId.replace(/-/g,'').slice(0,16)}`, session_id: sessionId, user_id: userId, event_type: 'conversion', page_url: 'https://example.com/checkout/complete', referrer: 'https://example.com/product', utm_source: j[t], utm_medium: 'cpc', utm_campaign: `campaign_${j[t]}`, timestamp: randTimestamp(i + t), user_agent: 'Mozilla/5.0', metadata: { order_id: `ORDER-${2000 + i}`, ...(j[t] === 'email' ? { email: `user${i}@example.com` } : {}) } });
      }
    }

    // Attach a verified conversion using a stripe txn if available
    const txnId = `txn_stripe_${convIndex}`;
    const amount = (((convIndex % 200) + 1) * 10);
    verifiedConversions.push({ id: randomUUID(), user_id: userId, transaction_id: txnId, email: `payer${convIndex % 50}@example.com`, amount, currency: 'PHP', pixel_session_id: sessionIds[sessionIds.length - 1], attributed_channel: j[j.length - 1], confidence_score: 75 + Math.floor(Math.random() * 20), confidence_level: j.length > 1 ? 'high' : 'medium', attribution_method: j.length > 1 ? 'dual_verified' : 'single_source', timestamp: randTimestamp(i), metadata: { journey_channels: j } });
    convIndex++;
  }

  if (pixelEvents.length) await insertInBatches(pixelEvents, 'pixel_events');
  if (verifiedConversions.length) await insertInBatches(verifiedConversions, 'verified_conversions');

  console.log('Seeding complete.');
  process.exit(0);
}

main().catch((err) => { console.error('Seeder failed:', (err as any)?.message || err); process.exit(1); });
