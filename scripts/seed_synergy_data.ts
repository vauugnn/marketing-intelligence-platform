/**
 * Seed: Synergy & Recommendation test data
 *
 * Creates verified_conversions with multi-touch pixel journeys
 * so the synergy engine produces recommendations and Gemini can enhance them.
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load env: prefer packages/backend/.env when present
const backendEnvPath = path.resolve(process.cwd(), 'packages', 'backend', '.env');
if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else {
  dotenv.config();
}

const argv = yargs(hideBin(process.argv))
  .option('email', { type: 'string', describe: 'Supabase auth user email to attach seed data to' })
  .argv as { email?: string };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Default test ids (kept for backward compatibility)
let USER_ID = '11111111-1111-1111-1111-111111111111';
const PIXEL_ID = 'pixel_abc123';

async function resolveUserIdByEmail(email?: string) {
  if (!email) return;
  // Try getUserByEmail if available, else listUsers fallback
  try {
    const maybe = (supabase.auth.admin as any).getUserByEmail?.(email);
    if (maybe) {
      const { data, error } = await maybe;
      if (!error && data) return data.id;
    }
  } catch (e) {
    // continue to fallback
  }

  // Fallback: list users and find by email
  const { data: listData, error: listErr } = await (supabase.auth.admin as any).listUsers?.() ?? { data: null, error: null };
  if (listErr) throw listErr;
  const usersArray: any[] = (listData && (listData.users || listData)) || [];
  const found = usersArray.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
  return found?.id;
}

interface SessionDef {
  channels: string[];      // multi-touch sequence
  amount: number;
  daysAgo: number;
}

// Define 40 conversion journeys with diverse channel combos
const journeys: SessionDef[] = [
  // Strong synergy: facebook → google (10 conversions, high revenue)
  { channels: ['facebook', 'google'], amount: 4500, daysAgo: 2 },
  { channels: ['facebook', 'google'], amount: 5200, daysAgo: 3 },
  { channels: ['facebook', 'google'], amount: 3800, daysAgo: 5 },
  { channels: ['facebook', 'google'], amount: 6100, daysAgo: 7 },
  { channels: ['facebook', 'google'], amount: 4900, daysAgo: 8 },
  { channels: ['facebook', 'google'], amount: 5500, daysAgo: 10 },
  { channels: ['facebook', 'google'], amount: 4100, daysAgo: 12 },
  { channels: ['facebook', 'google'], amount: 5800, daysAgo: 14 },
  { channels: ['facebook', 'google'], amount: 3600, daysAgo: 16 },
  { channels: ['facebook', 'google'], amount: 4700, daysAgo: 18 },

  // Synergy: email → google (5 conversions)
  { channels: ['email', 'google'], amount: 3200, daysAgo: 1 },
  { channels: ['email', 'google'], amount: 2800, daysAgo: 4 },
  { channels: ['email', 'google'], amount: 3500, daysAgo: 9 },
  { channels: ['email', 'google'], amount: 2600, daysAgo: 13 },
  { channels: ['email', 'google'], amount: 3100, daysAgo: 20 },

  // 3-touch: facebook → email → google (4 conversions)
  { channels: ['facebook', 'email', 'google'], amount: 7200, daysAgo: 3 },
  { channels: ['facebook', 'email', 'google'], amount: 6800, daysAgo: 6 },
  { channels: ['facebook', 'email', 'google'], amount: 8100, daysAgo: 11 },
  { channels: ['facebook', 'email', 'google'], amount: 7500, daysAgo: 15 },

  // Solo google (closers — good ROI)
  { channels: ['google'], amount: 2200, daysAgo: 1 },
  { channels: ['google'], amount: 1800, daysAgo: 4 },
  { channels: ['google'], amount: 2500, daysAgo: 6 },
  { channels: ['google'], amount: 2000, daysAgo: 10 },
  { channels: ['google'], amount: 1900, daysAgo: 17 },

  // Solo facebook (moderate)
  { channels: ['facebook'], amount: 1500, daysAgo: 2 },
  { channels: ['facebook'], amount: 1200, daysAgo: 8 },
  { channels: ['facebook'], amount: 1100, daysAgo: 12 },

  // Solo instagram — isolated, low revenue (should trigger "stop" rule)
  { channels: ['instagram'], amount: 200, daysAgo: 3 },
  { channels: ['instagram'], amount: 150, daysAgo: 7 },
  { channels: ['instagram'], amount: 180, daysAgo: 11 },
  { channels: ['instagram'], amount: 120, daysAgo: 15 },
  { channels: ['instagram'], amount: 160, daysAgo: 19 },
  { channels: ['instagram'], amount: 140, daysAgo: 22 },

  // Solo tiktok — isolated, poor ROI (should trigger "stop" rule)
  { channels: ['tiktok'], amount: 100, daysAgo: 2 },
  { channels: ['tiktok'], amount: 90, daysAgo: 5 },
  { channels: ['tiktok'], amount: 80, daysAgo: 9 },
  { channels: ['tiktok'], amount: 110, daysAgo: 14 },

  // Solo email (supporter role)
  { channels: ['email'], amount: 800, daysAgo: 4 },
  { channels: ['email'], amount: 650, daysAgo: 10 },
  { channels: ['email'], amount: 900, daysAgo: 16 },
];

async function main() {
  // If email supplied, resolve and set USER_ID
  if (argv.email) {
    const resolved = await resolveUserIdByEmail(argv.email).catch(err => {
      console.error('Failed to resolve user by email:', err?.message || err);
      process.exit(1);
    });
    if (!resolved) {
      console.error('No auth user found for email:', argv.email);
      process.exit(1);
    }
    USER_ID = resolved;
    console.log('Seeding for user id:', USER_ID);
  }

  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  const pixelEvents: any[] = [];
  const verifiedConversions: any[] = [];
  const rawSpendEvents: any[] = [];

  for (let i = 0; i < journeys.length; i++) {
    const j = journeys[i];
    const convTime = new Date(now - j.daysAgo * msPerDay);
    const txnId = `synergy_txn_${2000 + i}`;

    // Create pixel events for each touchpoint in the journey
    const sessionIds: string[] = [];
    for (let t = 0; t < j.channels.length; t++) {
      const sessionId = randomUUID();
      sessionIds.push(sessionId);
      const touchTime = new Date(convTime.getTime() - (j.channels.length - t) * 2 * 60 * 60 * 1000);

      pixelEvents.push({
        id: randomUUID(),
        pixel_id: PIXEL_ID,
        session_id: sessionId,
        user_id: USER_ID,
        event_type: 'page_view',
        page_url: 'https://example.com/product',
        referrer: `https://${j.channels[t]}.com`,
        utm_source: j.channels[t],
        utm_medium: 'cpc',
        utm_campaign: `campaign_${j.channels[t]}`,
        timestamp: touchTime.toISOString(),
        user_agent: 'Mozilla/5.0',
        metadata: { journey_index: i, touchpoint: t },
      });

      // Conversion event on last touchpoint
      if (t === j.channels.length - 1) {
        pixelEvents.push({
          id: randomUUID(),
          pixel_id: PIXEL_ID,
          session_id: sessionId,
          user_id: USER_ID,
          event_type: 'conversion',
          page_url: 'https://example.com/checkout/complete',
          referrer: 'https://example.com/product',
          utm_source: j.channels[t],
          utm_medium: 'cpc',
          utm_campaign: `campaign_${j.channels[t]}`,
          timestamp: convTime.toISOString(),
          user_agent: 'Mozilla/5.0',
          metadata: { order_id: `ORDER-${2000 + i}` },
        });
      }
    }

    // Verified conversion — attributed to last channel
    verifiedConversions.push({
      id: randomUUID(),
      user_id: USER_ID,
      transaction_id: txnId,
      email: 'customer@example.com',
      amount: j.amount,
      currency: 'PHP',
      pixel_session_id: sessionIds[sessionIds.length - 1],
      attributed_channel: j.channels[j.channels.length - 1],
      confidence_score: 75 + Math.floor(Math.random() * 20),
      confidence_level: j.channels.length > 1 ? 'high' : 'medium',
      attribution_method: j.channels.length > 1 ? 'dual_verified' : 'single_source',
      is_platform_over_attributed: false,
      timestamp: convTime.toISOString(),
      metadata: { journey_channels: j.channels },
    });
  }

  // Add spend data for channels (so ROI can be calculated)
  const spendData = [
    { platform: 'meta', channel: 'facebook', spend: 8000 },
    { platform: 'google_ads', channel: 'google', spend: 6000 },
    { platform: 'meta', channel: 'instagram', spend: 5000 },  // high spend, low revenue = poor ROI
    { platform: 'google_ads', channel: 'tiktok', spend: 4000 },  // high spend, low revenue = poor ROI
  ];

  for (const s of spendData) {
    rawSpendEvents.push({
      id: randomUUID(),
      user_id: USER_ID,
      platform: s.platform,
      event_type: 'ad_spend',
      event_data: { spend: s.spend, channel: s.channel },
      timestamp: new Date(now - 15 * msPerDay).toISOString(),
    });
  }

  // Insert data
  console.log(`Inserting ${verifiedConversions.length} verified conversions...`);
  for (let i = 0; i < verifiedConversions.length; i += 20) {
    const chunk = verifiedConversions.slice(i, i + 20);
    const { error } = await supabase.from('verified_conversions').upsert(chunk, { onConflict: 'transaction_id' } as any);
    if (error) console.warn('verified_conversions warning:', error.message);
  }

  console.log(`Inserting ${pixelEvents.length} pixel events...`);
  for (let i = 0; i < pixelEvents.length; i += 20) {
    const chunk = pixelEvents.slice(i, i + 20);
    const { error } = await supabase.from('pixel_events').insert(chunk);
    if (error) console.warn('pixel_events warning:', error.message);
  }

  console.log(`Inserting ${rawSpendEvents.length} spend events...`);
  const { error: spendErr } = await supabase.from('raw_events').insert(rawSpendEvents);
  if (spendErr) console.warn('raw_events warning:', spendErr.message);

  console.log('Synergy seed data complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
