import axios from 'axios';
import { PlatformService, RawEventInput } from './base-platform.service';
import { withRetry, sleep } from '../../utils/retry';
import { formatDateYMD } from '../../utils/date';
import { logger } from '../../utils/logger';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export class MetaService implements PlatformService {
  platformName = 'meta' as const;

  async fetchHistoricalData(
    accessToken: string,
    dateRange: { startDate: string; endDate: string }
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    // Step 1: Get all ad accounts accessible to the user
    const adAccounts = await this.getAdAccounts(accessToken);

    if (adAccounts.length === 0) {
      logger.warn('MetaService', 'No ad accounts found');
      return [];
    }

    const startDate = formatDateYMD(new Date(dateRange.startDate));
    const endDate = formatDateYMD(new Date(dateRange.endDate));

    // Step 2: Fetch campaign insights for each ad account
    for (const account of adAccounts) {
      const campaignInsights = await this.fetchCampaignInsights(
        accessToken,
        account.id,
        startDate,
        endDate
      );
      events.push(...campaignInsights);

      // Rate limit: pause between accounts
      await sleep(500);
    }

    logger.info('MetaService', `Fetched ${events.length} events from Meta`);
    return events;
  }

  private async getAdAccounts(accessToken: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await withRetry(() =>
        axios.get(`${META_API_BASE}/me/adaccounts`, {
          params: {
            fields: 'name,account_id,account_status',
            access_token: accessToken,
          },
        })
      );

      return (response.data.data || [])
        .filter((acc: any) => acc.account_status === 1) // Only active accounts
        .map((acc: any) => ({
          id: acc.id, // Format: "act_123456"
          name: acc.name,
        }));
    } catch (error) {
      logger.error('MetaService', 'Failed to fetch ad accounts', error);
      throw error;
    }
  }

  private async fetchCampaignInsights(
    accessToken: string,
    adAccountId: string,
    startDate: string,
    endDate: string
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];
    let url: string | null = `${META_API_BASE}/${adAccountId}/insights`;

    const params: Record<string, any> = {
      fields: 'campaign_name,campaign_id,impressions,clicks,spend,actions,action_values,cpc,cpm,ctr',
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      time_increment: 1, // Daily breakdown
      level: 'campaign',
      limit: 500,
      access_token: accessToken,
    };

    try {
      while (url) {
        const response = await withRetry(
          () => axios.get(url!, { params: url === `${META_API_BASE}/${adAccountId}/insights` ? params : undefined }),
          { retryableStatusCodes: [429, 500, 502, 503] }
        );

        const rows = response.data.data || [];
        for (const row of rows) {
          events.push({
            event_type: 'meta_campaign_insights',
            event_data: {
              campaign_name: row.campaign_name,
              campaign_id: row.campaign_id,
              impressions: parseInt(row.impressions || '0'),
              clicks: parseInt(row.clicks || '0'),
              spend: parseFloat(row.spend || '0'),
              cpc: parseFloat(row.cpc || '0'),
              cpm: parseFloat(row.cpm || '0'),
              ctr: parseFloat(row.ctr || '0'),
              actions: row.actions || [],
              action_values: row.action_values || [],
            },
            timestamp: new Date(row.date_start).toISOString(),
          });
        }

        // Handle pagination
        url = response.data.paging?.next || null;

        // Rate limit: pause between paginated requests
        if (url) {
          await sleep(500);
        }
      }
    } catch (error) {
      logger.error('MetaService', `Failed to fetch insights for ${adAccountId}`, error);
      throw error;
    }

    return events;
  }
}

export const metaService = new MetaService();
