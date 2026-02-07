import axios from 'axios';
import { PlatformService, RawEventInput } from './base-platform.service';
import { withRetry, sleep } from '../../utils/retry';
import { logger } from '../../utils/logger';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

/**
 * HubSpot Marketing API Service
 * Fetches marketing email performance data including sends, opens, clicks, and engagement metrics.
 */
export class HubSpotService implements PlatformService {
    platformName = 'hubspot' as const;

    async fetchHistoricalData(
        accessToken: string,
        dateRange: { startDate: string; endDate: string }
    ): Promise<RawEventInput[]> {
        const events: RawEventInput[] = [];

        try {
            // Fetch marketing email statistics
            const emailStats = await this.fetchMarketingEmailStats(accessToken, dateRange);
            events.push(...emailStats);

            // Fetch campaign performance data
            const campaignData = await this.fetchCampaignData(accessToken, dateRange);
            events.push(...campaignData);

            logger.info('HubSpotService', `Fetched ${events.length} events from HubSpot`);
        } catch (error) {
            logger.error('HubSpotService', 'Failed to fetch historical data', error);
            throw error;
        }

        return events;
    }

    private async fetchMarketingEmailStats(
        accessToken: string,
        dateRange: { startDate: string; endDate: string }
    ): Promise<RawEventInput[]> {
        const events: RawEventInput[] = [];
        let after: string | undefined;

        try {
            while (true) {
                const response = await withRetry(
                    () =>
                        axios.get(`${HUBSPOT_API_BASE}/marketing/v3/emails`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                            params: {
                                limit: 100,
                                after,
                            },
                        }),
                    { retryableStatusCodes: [429, 500, 502, 503] }
                );

                const emails = response.data.results || [];

                for (const email of emails) {
                    // Filter by date range based on updated timestamp
                    const emailDate = new Date(email.updatedAt || email.createdAt);
                    const startDate = new Date(dateRange.startDate);
                    const endDate = new Date(dateRange.endDate);

                    if (emailDate >= startDate && emailDate <= endDate) {
                        // Fetch statistics for each email
                        const stats = await this.fetchEmailStatistics(accessToken, email.id);

                        events.push({
                            event_type: 'hubspot_marketing_email',
                            event_data: {
                                email_id: email.id,
                                email_name: email.name || '',
                                subject: email.subject || '',
                                state: email.state || '',
                                sends: stats.counters?.sent || 0,
                                opens: stats.counters?.open || 0,
                                clicks: stats.counters?.click || 0,
                                bounces: stats.counters?.bounce || 0,
                                unsubscribes: stats.counters?.unsubscribed || 0,
                                spam_reports: stats.counters?.spamreport || 0,
                                delivered: stats.counters?.delivered || 0,
                            },
                            timestamp: email.updatedAt || email.createdAt || new Date().toISOString(),
                        });

                        await sleep(200);
                    }
                }

                // Handle pagination
                if (response.data.paging?.next?.after) {
                    after = response.data.paging.next.after;
                    await sleep(300);
                } else {
                    break;
                }
            }
        } catch (error) {
            logger.error('HubSpotService', 'Failed to fetch marketing emails', error);
            throw error;
        }

        return events;
    }

    private async fetchEmailStatistics(accessToken: string, emailId: string): Promise<any> {
        try {
            const response = await withRetry(
                () =>
                    axios.get(`${HUBSPOT_API_BASE}/marketing/v3/emails/${emailId}/statistics`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                { retryableStatusCodes: [429, 500, 502, 503] }
            );

            return response.data;
        } catch (error) {
            // Some emails may not have statistics, return empty object
            logger.warn('HubSpotService', `No statistics available for email ${emailId}`);
            return { counters: {} };
        }
    }

    private async fetchCampaignData(
        accessToken: string,
        dateRange: { startDate: string; endDate: string }
    ): Promise<RawEventInput[]> {
        const events: RawEventInput[] = [];

        try {
            const response = await withRetry(
                () =>
                    axios.get(`${HUBSPOT_API_BASE}/marketing/v3/campaigns`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: {
                            limit: 100,
                        },
                    }),
                { retryableStatusCodes: [429, 500, 502, 503] }
            );

            const campaigns = response.data.results || [];

            for (const campaign of campaigns) {
                events.push({
                    event_type: 'hubspot_campaign',
                    event_data: {
                        campaign_id: campaign.id,
                        campaign_name: campaign.name || '',
                        campaign_type: campaign.type || '',
                    },
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            logger.error('HubSpotService', 'Failed to fetch campaigns', error);
            // Don't throw - campaign data is supplementary
        }

        return events;
    }
}

export const hubspotService = new HubSpotService();
