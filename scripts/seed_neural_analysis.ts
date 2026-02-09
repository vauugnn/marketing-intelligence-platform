/**
 * Seed: 90-day Revenue + Coverage dataset for Neural Analysis page
 *
 * Creates conversion journeys across 4 channels (google, facebook, email,
 * instagram) with weekly spend events, so the Neural Analysis page
 * shows meaningful data across performance table, network graph, and synergy table.
 *
 * Calibrated to produce:
 *   - 6 synergy pairs: 1 Strong, 3 Medium, 2 Weak
 *   - 4 channel roles: google (closer), facebook (introducer), email (introducer),
 *     instagram (isolated)
 *   - 4 performance ratings: exceptional, satisfactory, poor, failing
 *
 * Usage:
 *   npx tsx scripts/seed_neural_analysis.ts [--email user@example.com]
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

let USER_ID = '11111111-1111-1111-1111-111111111111';
const PIXEL_ID = 'pixel_abc123';

async function resolveUserIdByEmail(email?: string) {
  if (!email) return;
  try {
    const maybe = (supabase.auth.admin as any).getUserByEmail?.(email);
    if (maybe) {
      const { data, error } = await maybe;
      if (!error && data) return data.id;
    }
  } catch (e) {
    // continue to fallback
  }

  const { data: listData, error: listErr } = await (supabase.auth.admin as any).listUsers?.() ?? { data: null, error: null };
  if (listErr) throw listErr;
  const usersArray: any[] = (listData && (listData.users || listData)) || [];
  const found = usersArray.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
  return found?.id;
}

interface SessionDef {
  channels: string[];
  amount: number;
  daysAgo: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Journey definitions — calibrated for synergy scores, isolation ratios,
// and performance ratings.
//
// Solo baselines kept LOW so synergy ratios (avgPair / maxSoloAvg) are high.
// Multi-touch amounts kept HIGH relative to solos to produce strong scores.
// ═══════════════════════════════════════════════════════════════════════

const journeys: SessionDef[] = [
  // ── Google solo (16 journeys, avg ~2,800) ──
  { channels: ['google'], amount: 2400, daysAgo: 2 },
  { channels: ['google'], amount: 3100, daysAgo: 5 },
  { channels: ['google'], amount: 2600, daysAgo: 9 },
  { channels: ['google'], amount: 3400, daysAgo: 14 },
  { channels: ['google'], amount: 2200, daysAgo: 18 },
  { channels: ['google'], amount: 3000, daysAgo: 23 },
  { channels: ['google'], amount: 2500, daysAgo: 28 },
  { channels: ['google'], amount: 3200, daysAgo: 35 },
  { channels: ['google'], amount: 2700, daysAgo: 42 },
  { channels: ['google'], amount: 3300, daysAgo: 50 },
  { channels: ['google'], amount: 2100, daysAgo: 58 },
  { channels: ['google'], amount: 2900, daysAgo: 62 },
  { channels: ['google'], amount: 2800, daysAgo: 68 },
  { channels: ['google'], amount: 3100, daysAgo: 72 },
  { channels: ['google'], amount: 2600, daysAgo: 78 },
  { channels: ['google'], amount: 2900, daysAgo: 85 },

  // ── Facebook solo (11 journeys, avg ~1,450) ──
  { channels: ['facebook'], amount: 1200, daysAgo: 3 },
  { channels: ['facebook'], amount: 1600, daysAgo: 8 },
  { channels: ['facebook'], amount: 1100, daysAgo: 15 },
  { channels: ['facebook'], amount: 1700, daysAgo: 22 },
  { channels: ['facebook'], amount: 1300, daysAgo: 30 },
  { channels: ['facebook'], amount: 1500, daysAgo: 38 },
  { channels: ['facebook'], amount: 1400, daysAgo: 45 },
  { channels: ['facebook'], amount: 1800, daysAgo: 52 },
  { channels: ['facebook'], amount: 1200, daysAgo: 60 },
  { channels: ['facebook'], amount: 1500, daysAgo: 70 },
  { channels: ['facebook'], amount: 1650, daysAgo: 80 },

  // ── Email solo (9 journeys, avg ~850) ──
  { channels: ['email'], amount: 800, daysAgo: 1 },
  { channels: ['email'], amount: 950, daysAgo: 10 },
  { channels: ['email'], amount: 700, daysAgo: 18 },
  { channels: ['email'], amount: 1000, daysAgo: 28 },
  { channels: ['email'], amount: 750, daysAgo: 38 },
  { channels: ['email'], amount: 900, daysAgo: 48 },
  { channels: ['email'], amount: 850, daysAgo: 55 },
  { channels: ['email'], amount: 800, daysAgo: 65 },
  { channels: ['email'], amount: 950, daysAgo: 75 },

  // ── Instagram solo (15 journeys, avg ~340) ──
  { channels: ['instagram'], amount: 300, daysAgo: 2 },
  { channels: ['instagram'], amount: 380, daysAgo: 7 },
  { channels: ['instagram'], amount: 250, daysAgo: 12 },
  { channels: ['instagram'], amount: 400, daysAgo: 17 },
  { channels: ['instagram'], amount: 320, daysAgo: 23 },
  { channels: ['instagram'], amount: 350, daysAgo: 29 },
  { channels: ['instagram'], amount: 280, daysAgo: 35 },
  { channels: ['instagram'], amount: 420, daysAgo: 42 },
  { channels: ['instagram'], amount: 300, daysAgo: 50 },
  { channels: ['instagram'], amount: 370, daysAgo: 58 },
  { channels: ['instagram'], amount: 340, daysAgo: 65 },
  { channels: ['instagram'], amount: 290, daysAgo: 73 },
  { channels: ['instagram'], amount: 400, daysAgo: 82 },
  { channels: ['instagram'], amount: 310, daysAgo: 87 },
  { channels: ['instagram'], amount: 360, daysAgo: 89 },

  // ═══════════════════════════════════════════════════════════════════
  // 2-touch pairs — HIGH amounts drive synergy scores
  // ═══════════════════════════════════════════════════════════════════

  // ── facebook → google (18 journeys, avg ~8,100) → synergy ~2.5 Strong ──
  { channels: ['facebook', 'google'], amount: 7500, daysAgo: 1 },
  { channels: ['facebook', 'google'], amount: 8800, daysAgo: 4 },
  { channels: ['facebook', 'google'], amount: 7200, daysAgo: 7 },
  { channels: ['facebook', 'google'], amount: 9200, daysAgo: 11 },
  { channels: ['facebook', 'google'], amount: 7800, daysAgo: 15 },
  { channels: ['facebook', 'google'], amount: 8500, daysAgo: 19 },
  { channels: ['facebook', 'google'], amount: 7600, daysAgo: 23 },
  { channels: ['facebook', 'google'], amount: 9000, daysAgo: 27 },
  { channels: ['facebook', 'google'], amount: 8100, daysAgo: 32 },
  { channels: ['facebook', 'google'], amount: 7900, daysAgo: 37 },
  { channels: ['facebook', 'google'], amount: 8400, daysAgo: 42 },
  { channels: ['facebook', 'google'], amount: 7700, daysAgo: 47 },
  { channels: ['facebook', 'google'], amount: 8600, daysAgo: 52 },
  { channels: ['facebook', 'google'], amount: 8200, daysAgo: 57 },
  { channels: ['facebook', 'google'], amount: 7400, daysAgo: 62 },
  { channels: ['facebook', 'google'], amount: 8900, daysAgo: 68 },
  { channels: ['facebook', 'google'], amount: 8000, daysAgo: 75 },
  { channels: ['facebook', 'google'], amount: 8100, daysAgo: 82 },

  // ── email → google (10 journeys, avg ~3,200) → synergy ~1.1 Medium ──
  { channels: ['email', 'google'], amount: 3000, daysAgo: 3 },
  { channels: ['email', 'google'], amount: 3400, daysAgo: 10 },
  { channels: ['email', 'google'], amount: 2900, daysAgo: 17 },
  { channels: ['email', 'google'], amount: 3500, daysAgo: 25 },
  { channels: ['email', 'google'], amount: 3100, daysAgo: 33 },
  { channels: ['email', 'google'], amount: 3300, daysAgo: 42 },
  { channels: ['email', 'google'], amount: 3000, daysAgo: 50 },
  { channels: ['email', 'google'], amount: 3200, daysAgo: 60 },
  { channels: ['email', 'google'], amount: 3500, daysAgo: 70 },
  { channels: ['email', 'google'], amount: 3100, daysAgo: 80 },

  // ── email → facebook (5 journeys, avg ~1,100) ──
  { channels: ['email', 'facebook'], amount: 1000, daysAgo: 6 },
  { channels: ['email', 'facebook'], amount: 1200, daysAgo: 20 },
  { channels: ['email', 'facebook'], amount: 1000, daysAgo: 35 },
  { channels: ['email', 'facebook'], amount: 1200, daysAgo: 55 },
  { channels: ['email', 'facebook'], amount: 1100, daysAgo: 75 },

  // ── instagram → google (3 journeys, avg ~1,750) → synergy ~0.6 Weak ──
  { channels: ['instagram', 'google'], amount: 1600, daysAgo: 5 },
  { channels: ['instagram', 'google'], amount: 1900, daysAgo: 35 },
  { channels: ['instagram', 'google'], amount: 1750, daysAgo: 70 },

  // ── email → instagram (3 journeys, avg ~1,150) → synergy ~1.3 Medium ──
  { channels: ['email', 'instagram'], amount: 1050, daysAgo: 9 },
  { channels: ['email', 'instagram'], amount: 1250, daysAgo: 40 },
  { channels: ['email', 'instagram'], amount: 1150, daysAgo: 72 },

  // ── instagram → facebook (1 journey) ──
  { channels: ['instagram', 'facebook'], amount: 600, daysAgo: 45 },

  // ═══════════════════════════════════════════════════════════════════
  // 3-touch journeys — LOW counts, contribute to multiple pairs
  // ═══════════════════════════════════════════════════════════════════

  // ── facebook → email → google (3 journeys, avg ~3,000) ──
  { channels: ['facebook', 'email', 'google'], amount: 2800, daysAgo: 12 },
  { channels: ['facebook', 'email', 'google'], amount: 3200, daysAgo: 40 },
  { channels: ['facebook', 'email', 'google'], amount: 3000, daysAgo: 70 },

  // ── google → email → facebook (2 journeys, avg ~2,800) ──
  { channels: ['google', 'email', 'facebook'], amount: 2600, daysAgo: 25 },
  { channels: ['google', 'email', 'facebook'], amount: 3000, daysAgo: 60 },

];

// ═══════════════════════════════════════════════════════════════════════
// Spend platform mapping — MUST match the whitelist in synergy.service.ts:
//   .in('platform', ['meta', 'google_analytics_4', 'google_ads', 'hubspot', 'mailchimp'])
//
// Channel routing in getChannelPerformance():
//   meta           → 'facebook'
//   google_ads     → 'google'
//   hubspot        → normalizeChannel(data.channel || 'email')
//   google_analytics_4 → normalizeChannel(data.channel_group || data.sessionSource || 'google')
// ═══════════════════════════════════════════════════════════════════════
const spendConfig = [
  { platform: 'google_ads',           eventData: { spend: 0 },                        channel: 'google',    minSpend: 800,  maxSpend: 1200 },
  { platform: 'meta',                 eventData: { spend: 0 },                        channel: 'facebook',  minSpend: 600,  maxSpend: 900  },
  { platform: 'hubspot',              eventData: { spend: 0, channel: 'email' },      channel: 'email',     minSpend: 300,  maxSpend: 500  },
  { platform: 'google_analytics_4',   eventData: { spend: 0, channel_group: 'instagram' }, channel: 'instagram', minSpend: 400, maxSpend: 700 },
];

async function main() {
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

  // Build pixel events and verified conversions from journeys
  for (let i = 0; i < journeys.length; i++) {
    const j = journeys[i];
    const convTime = new Date(now - j.daysAgo * msPerDay);
    const txnId = `neural_txn_${3000 + i}`;

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
        metadata: {
          journey_index: i,
          touchpoint: t,
          ...(j.channels[t] === 'email' ? { email: `customer${i}@example.com` } : {}),
        },
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
          metadata: {
            order_id: `ORDER-${3000 + i}`,
            ...(j.channels[t] === 'email' ? { email: `customer${i}@example.com` } : {}),
          },
        });
      }
    }

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

  // Weekly spend events (~13 weeks across 90 days)
  for (let week = 0; week < 13; week++) {
    const weekDaysAgo = week * 7 + 3; // mid-week timestamp
    for (const s of spendConfig) {
      const spend = s.minSpend + Math.floor(Math.random() * (s.maxSpend - s.minSpend + 1));
      rawSpendEvents.push({
        id: randomUUID(),
        user_id: USER_ID,
        platform: s.platform,
        event_type: 'ad_spend',
        event_data: { ...s.eventData, spend },
        timestamp: new Date(now - weekDaysAgo * msPerDay).toISOString(),
      });
    }
  }

  // Insert verified conversions (chunked, upsert on transaction_id)
  console.log(`Inserting ${verifiedConversions.length} verified conversions...`);
  for (let i = 0; i < verifiedConversions.length; i += 20) {
    const chunk = verifiedConversions.slice(i, i + 20);
    const { error } = await supabase.from('verified_conversions').upsert(chunk, { onConflict: 'transaction_id' } as any);
    if (error) console.warn('verified_conversions warning:', error.message);
  }

  // Insert pixel events (chunked)
  console.log(`Inserting ${pixelEvents.length} pixel events...`);
  for (let i = 0; i < pixelEvents.length; i += 20) {
    const chunk = pixelEvents.slice(i, i + 20);
    const { error } = await supabase.from('pixel_events').insert(chunk);
    if (error) console.warn('pixel_events warning:', error.message);
  }

  // Insert spend events (chunked)
  console.log(`Inserting ${rawSpendEvents.length} spend events...`);
  for (let i = 0; i < rawSpendEvents.length; i += 20) {
    const chunk = rawSpendEvents.slice(i, i + 20);
    const { error } = await supabase.from('raw_events').insert(chunk);
    if (error) console.warn('raw_events warning:', error.message);
  }

  console.log(`Neural analysis seed complete! (${journeys.length} journeys, ${rawSpendEvents.length} spend events)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
