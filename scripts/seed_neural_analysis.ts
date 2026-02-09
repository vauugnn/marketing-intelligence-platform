/**
 * Seed: 90-day Revenue + Coverage dataset for Neural Analysis page
 *
 * Creates conversion journeys across 4 channels (google, facebook, email,
 * instagram) with weekly spend events and campaign-level data, so the
 * Neural Analysis page shows meaningful data across performance table,
 * network graph, synergy table, and AI channel insights.
 *
 * Calibrated to produce:
 *   - 6 synergy pairs with varied statuses (strong, needs_improvement, needs_attention, urgent)
 *   - 4 channel roles: google (closer), facebook (introducer), email (introducer),
 *     instagram (isolated)
 *   - 4 performance ratings: exceptional, satisfactory, poor, failing
 *   - 10 campaigns across 4 channels with cross-platform attribution
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
  campaign: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Journey definitions — calibrated for synergy scores, isolation ratios,
// performance ratings, and campaign-level attribution.
//
// Solo baselines kept LOW so synergy ratios (avgPair / maxSoloAvg) are high.
// NO 3-touch journeys — they pollute pair scores across multiple pairs.
// Each 2-touch pair amount is calibrated independently for its target status.
//
// Campaigns (10 total):
//   1. fb_summer_promo        — Facebook awareness
//   2. fb_retargeting_q1      — Facebook retargeting
//   3. gads_brand_search      — Google brand terms
//   4. gads_competitor_kw     — Google competitor keywords
//   5. email_weekly_digest    — Regular email newsletter
//   6. email_abandoned_cart   — Cart recovery emails
//   7. ig_product_showcase    — Instagram product posts
//   8. ig_stories_engagement  — Instagram stories
//   9. cross_holiday_sale     — Multi-channel (FB + Google + Email)
//  10. cross_new_product_launch — Multi-channel (all 4)
// ═══════════════════════════════════════════════════════════════════════

const journeys: SessionDef[] = [
  // ── Google solo (20 journeys, avg ~2,800) ──
  { channels: ['google'], amount: 2400, daysAgo: 2, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 3100, daysAgo: 5, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2600, daysAgo: 9, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 3400, daysAgo: 14, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2200, daysAgo: 18, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 3000, daysAgo: 23, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2500, daysAgo: 28, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 3200, daysAgo: 35, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2700, daysAgo: 42, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 3300, daysAgo: 50, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 2100, daysAgo: 58, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2900, daysAgo: 62, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 2800, daysAgo: 68, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 3100, daysAgo: 72, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2600, daysAgo: 78, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 2900, daysAgo: 85, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2750, daysAgo: 6, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 3050, daysAgo: 20, campaign: 'gads_competitor_kw' },
  { channels: ['google'], amount: 2350, daysAgo: 44, campaign: 'gads_brand_search' },
  { channels: ['google'], amount: 2950, daysAgo: 66, campaign: 'gads_competitor_kw' },

  // ── Facebook solo (14 journeys, avg ~1,450) ──
  { channels: ['facebook'], amount: 1200, daysAgo: 3, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1600, daysAgo: 8, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1100, daysAgo: 15, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1700, daysAgo: 22, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1300, daysAgo: 30, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1500, daysAgo: 38, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1400, daysAgo: 45, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1800, daysAgo: 52, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1200, daysAgo: 60, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1500, daysAgo: 70, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1650, daysAgo: 80, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1350, daysAgo: 11, campaign: 'fb_summer_promo' },
  { channels: ['facebook'], amount: 1550, daysAgo: 33, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook'], amount: 1450, daysAgo: 56, campaign: 'fb_summer_promo' },

  // ── Email solo (12 journeys, avg ~850) ──
  { channels: ['email'], amount: 800, daysAgo: 1, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 950, daysAgo: 10, campaign: 'email_abandoned_cart' },
  { channels: ['email'], amount: 700, daysAgo: 18, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 1000, daysAgo: 28, campaign: 'email_abandoned_cart' },
  { channels: ['email'], amount: 750, daysAgo: 38, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 900, daysAgo: 48, campaign: 'email_abandoned_cart' },
  { channels: ['email'], amount: 850, daysAgo: 55, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 800, daysAgo: 65, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 950, daysAgo: 75, campaign: 'email_abandoned_cart' },
  { channels: ['email'], amount: 820, daysAgo: 13, campaign: 'email_weekly_digest' },
  { channels: ['email'], amount: 880, daysAgo: 41, campaign: 'email_abandoned_cart' },
  { channels: ['email'], amount: 770, daysAgo: 83, campaign: 'email_weekly_digest' },

  // ── Instagram solo (18 journeys, avg ~340) ──
  { channels: ['instagram'], amount: 300, daysAgo: 2, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 380, daysAgo: 7, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 250, daysAgo: 12, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 400, daysAgo: 17, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 320, daysAgo: 23, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 350, daysAgo: 29, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 280, daysAgo: 35, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 420, daysAgo: 42, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 300, daysAgo: 50, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 370, daysAgo: 58, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 340, daysAgo: 65, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 290, daysAgo: 73, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 400, daysAgo: 82, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 310, daysAgo: 87, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 360, daysAgo: 89, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 330, daysAgo: 4, campaign: 'ig_product_showcase' },
  { channels: ['instagram'], amount: 290, daysAgo: 31, campaign: 'ig_stories_engagement' },
  { channels: ['instagram'], amount: 350, daysAgo: 53, campaign: 'ig_product_showcase' },

  // ═══════════════════════════════════════════════════════════════════
  // Multi-touch pairs — NO 3-touch journeys (they pollute pair scores).
  // Each pair is calibrated independently.
  //
  // Synergy = avgPairRevenue / max(soloA_avg, soloB_avg)
  // Solo avgs: google=2800, facebook=1450, email=848, instagram=338
  //
  // TARGET DISTRIBUTION:
  //   fb→google:  avg 8100 / 2800 = 2.89 → Strong
  //   email→ig:   avg 1400 / 848  = 1.65 → Strong
  //   email→ggl:  avg 3200 / 2800 = 1.14 → Needs Improvement
  //   email→fb:   avg 1100 / 1450 = 0.76 → Needs Attention
  //   ig→google:  avg 1750 / 2800 = 0.63 → Needs Attention
  //   ig→fb:      avg 575  / 1450 = 0.40 → Urgent
  // ═══════════════════════════════════════════════════════════════════

  // ── facebook → google (25 journeys, avg ~8,100) → 8100/2800 = 2.89 Strong ──
  { channels: ['facebook', 'google'], amount: 7500, daysAgo: 1, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8800, daysAgo: 4, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 7200, daysAgo: 7, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 9200, daysAgo: 11, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 7800, daysAgo: 15, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8500, daysAgo: 19, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 7600, daysAgo: 23, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 9000, daysAgo: 27, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 8100, daysAgo: 32, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 7900, daysAgo: 37, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8400, daysAgo: 42, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 7700, daysAgo: 47, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8600, daysAgo: 52, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 8200, daysAgo: 57, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 7400, daysAgo: 62, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8900, daysAgo: 68, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 8000, daysAgo: 75, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8100, daysAgo: 82, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 7650, daysAgo: 10, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8350, daysAgo: 34, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 8050, daysAgo: 55, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 7850, daysAgo: 77, campaign: 'fb_summer_promo' },
  { channels: ['facebook', 'google'], amount: 8250, daysAgo: 86, campaign: 'cross_holiday_sale' },
  { channels: ['facebook', 'google'], amount: 7950, daysAgo: 40, campaign: 'fb_retargeting_q1' },
  { channels: ['facebook', 'google'], amount: 8450, daysAgo: 63, campaign: 'fb_summer_promo' },

  // ── email → instagram (8 journeys, avg ~1,400) → 1400/848 = 1.65 Strong ──
  { channels: ['email', 'instagram'], amount: 1350, daysAgo: 9, campaign: 'email_weekly_digest' },
  { channels: ['email', 'instagram'], amount: 1500, daysAgo: 18, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'instagram'], amount: 1300, daysAgo: 30, campaign: 'email_weekly_digest' },
  { channels: ['email', 'instagram'], amount: 1450, daysAgo: 40, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'instagram'], amount: 1380, daysAgo: 52, campaign: 'email_weekly_digest' },
  { channels: ['email', 'instagram'], amount: 1420, daysAgo: 64, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'instagram'], amount: 1350, daysAgo: 72, campaign: 'email_weekly_digest' },
  { channels: ['email', 'instagram'], amount: 1450, daysAgo: 84, campaign: 'email_abandoned_cart' },

  // ── email → google (12 journeys, avg ~3,200) → 3200/2800 = 1.14 Needs Improvement ──
  { channels: ['email', 'google'], amount: 3000, daysAgo: 3, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'google'], amount: 3400, daysAgo: 10, campaign: 'cross_holiday_sale' },
  { channels: ['email', 'google'], amount: 2900, daysAgo: 17, campaign: 'email_weekly_digest' },
  { channels: ['email', 'google'], amount: 3500, daysAgo: 25, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'google'], amount: 3100, daysAgo: 33, campaign: 'cross_holiday_sale' },
  { channels: ['email', 'google'], amount: 3300, daysAgo: 42, campaign: 'email_weekly_digest' },
  { channels: ['email', 'google'], amount: 3000, daysAgo: 50, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'google'], amount: 3200, daysAgo: 60, campaign: 'cross_holiday_sale' },
  { channels: ['email', 'google'], amount: 3500, daysAgo: 70, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'google'], amount: 3100, daysAgo: 80, campaign: 'email_weekly_digest' },
  { channels: ['email', 'google'], amount: 3250, daysAgo: 16, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'google'], amount: 3050, daysAgo: 64, campaign: 'cross_holiday_sale' },

  // ── email → facebook (7 journeys, avg ~1,100) → 1100/1450 = 0.76 Needs Attention ──
  { channels: ['email', 'facebook'], amount: 1000, daysAgo: 6, campaign: 'email_weekly_digest' },
  { channels: ['email', 'facebook'], amount: 1200, daysAgo: 20, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'facebook'], amount: 1000, daysAgo: 35, campaign: 'email_weekly_digest' },
  { channels: ['email', 'facebook'], amount: 1200, daysAgo: 55, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'facebook'], amount: 1100, daysAgo: 75, campaign: 'email_weekly_digest' },
  { channels: ['email', 'facebook'], amount: 1050, daysAgo: 26, campaign: 'email_abandoned_cart' },
  { channels: ['email', 'facebook'], amount: 1150, daysAgo: 63, campaign: 'email_weekly_digest' },

  // ── instagram → google (4 journeys, avg ~1,750) → 1750/2800 = 0.63 Needs Attention ──
  { channels: ['instagram', 'google'], amount: 1600, daysAgo: 5, campaign: 'ig_product_showcase' },
  { channels: ['instagram', 'google'], amount: 1900, daysAgo: 35, campaign: 'ig_stories_engagement' },
  { channels: ['instagram', 'google'], amount: 1750, daysAgo: 70, campaign: 'ig_product_showcase' },
  { channels: ['instagram', 'google'], amount: 1700, daysAgo: 46, campaign: 'ig_stories_engagement' },

  // ── instagram → facebook (3 journeys, avg ~500) → 500/1450 = 0.34 Urgent ──
  { channels: ['instagram', 'facebook'], amount: 520, daysAgo: 45, campaign: 'ig_product_showcase' },
  { channels: ['instagram', 'facebook'], amount: 480, daysAgo: 79, campaign: 'ig_stories_engagement' },
  { channels: ['instagram', 'facebook'], amount: 500, daysAgo: 30, campaign: 'ig_product_showcase' },
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

// Campaign-level spend breakdown
const campaignSpendConfig = [
  // Google campaigns
  { platform: 'google_ads', campaign_id: 'gads_brand_search', campaign_name: 'Brand Search', channel: 'google', minSpend: 500, maxSpend: 700, minImpressions: 8000, maxImpressions: 12000, minClicks: 200, maxClicks: 350 },
  { platform: 'google_ads', campaign_id: 'gads_competitor_kw', campaign_name: 'Competitor Keywords', channel: 'google', minSpend: 350, maxSpend: 550, minImpressions: 6000, maxImpressions: 9000, minClicks: 120, maxClicks: 220 },
  // Facebook campaigns
  { platform: 'meta', campaign_id: 'fb_summer_promo', campaign_name: 'Summer Promo', channel: 'facebook', minSpend: 300, maxSpend: 500, minImpressions: 10000, maxImpressions: 15000, minClicks: 150, maxClicks: 280 },
  { platform: 'meta', campaign_id: 'fb_retargeting_q1', campaign_name: 'Retargeting Q1', channel: 'facebook', minSpend: 250, maxSpend: 400, minImpressions: 5000, maxImpressions: 8000, minClicks: 100, maxClicks: 200 },
  // Email campaigns
  { platform: 'hubspot', campaign_id: 'email_weekly_digest', campaign_name: 'Weekly Digest', channel: 'email', minSpend: 100, maxSpend: 200, minImpressions: 3000, maxImpressions: 5000, minClicks: 80, maxClicks: 150 },
  { platform: 'hubspot', campaign_id: 'email_abandoned_cart', campaign_name: 'Abandoned Cart', channel: 'email', minSpend: 150, maxSpend: 300, minImpressions: 2000, maxImpressions: 4000, minClicks: 60, maxClicks: 120 },
  // Instagram campaigns
  { platform: 'google_analytics_4', campaign_id: 'ig_product_showcase', campaign_name: 'Product Showcase', channel: 'instagram', minSpend: 200, maxSpend: 400, minImpressions: 7000, maxImpressions: 12000, minClicks: 80, maxClicks: 160 },
  { platform: 'google_analytics_4', campaign_id: 'ig_stories_engagement', campaign_name: 'Stories Engagement', channel: 'instagram', minSpend: 180, maxSpend: 350, minImpressions: 5000, maxImpressions: 9000, minClicks: 60, maxClicks: 130 },
];

function randBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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
        utm_campaign: j.campaign,
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
          utm_campaign: j.campaign,
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
      metadata: { journey_channels: j.channels, campaign: j.campaign },
    });
  }

  // Weekly spend events with campaign-level breakdown (~13 weeks across 90 days)
  for (let week = 0; week < 13; week++) {
    const weekDaysAgo = week * 7 + 3; // mid-week timestamp
    for (const cs of campaignSpendConfig) {
      const spend = randBetween(cs.minSpend, cs.maxSpend);
      const impressions = randBetween(cs.minImpressions, cs.maxImpressions);
      const clicks = randBetween(cs.minClicks, cs.maxClicks);

      const eventData: Record<string, any> = {
        spend,
        campaign_id: cs.campaign_id,
        campaign_name: cs.campaign_name,
        impressions,
        clicks,
      };

      // Add channel routing fields for specific platforms
      if (cs.platform === 'hubspot') {
        eventData.channel = 'email';
      } else if (cs.platform === 'google_analytics_4') {
        eventData.channel_group = 'instagram';
      }

      rawSpendEvents.push({
        id: randomUUID(),
        user_id: USER_ID,
        platform: cs.platform,
        event_type: 'ad_spend',
        event_data: eventData,
        timestamp: new Date(now - weekDaysAgo * msPerDay).toISOString(),
      });
    }
  }

  // ── Clean up old data for this user before inserting ──
  console.log('Cleaning old seed data for user...');
  const { error: delConv } = await supabase.from('verified_conversions').delete().eq('user_id', USER_ID);
  if (delConv) console.warn('cleanup verified_conversions:', delConv.message);
  const { error: delPixel } = await supabase.from('pixel_events').delete().eq('pixel_id', PIXEL_ID);
  if (delPixel) console.warn('cleanup pixel_events:', delPixel.message);
  const { error: delRaw } = await supabase.from('raw_events').delete().eq('user_id', USER_ID);
  if (delRaw) console.warn('cleanup raw_events:', delRaw.message);
  console.log('Old data cleaned.');

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

  console.log(`Neural analysis seed complete! (${journeys.length} journeys, ${rawSpendEvents.length} spend events, ${campaignSpendConfig.length} campaigns)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
