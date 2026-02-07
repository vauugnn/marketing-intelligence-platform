import axios from 'axios';
import { PlatformService, RawEventInput } from './base-platform.service';
import { withRetry, sleep } from '../../utils/retry';
import { logger } from '../../utils/logger';

const MAILCHIMP_API_VERSION = '3.0';

interface MailchimpDataCenter {
    dc: string;
}

/**
 * Mailchimp Marketing API Service
 * Fetches email campaign performance data including opens, clicks, and conversions.
 */
export class MailchimpService implements PlatformService {
    platformName = 'mailchimp' as const;

    /**
     * Extracts the data center from a Mailchimp access token metadata.
     * Mailchimp API URLs are data center specific (e.g., us1.api.mailchimp.com).
     */
    private getApiBaseUrl(dc: string): string {
        return `https://${dc}.api.mailchimp.com/${MAILCHIMP_API_VERSION}`;
    }

    async fetchHistoricalData(
        accessToken: string,
        dateRange: { startDate: string; endDate: string },
        dataCenter?: string
    ): Promise<RawEventInput[]> {
        const events: RawEventInput[] = [];

        // Default to 'us1' if no data center specified
        const dc = dataCenter || 'us1';
        const baseUrl = this.getApiBaseUrl(dc);

        try {
            // Fetch all campaigns within the date range
            const campaigns = await this.fetchCampaigns(baseUrl, accessToken, dateRange);

            for (const campaign of campaigns) {
                // Fetch detailed report for each campaign
                const reportData = await this.fetchCampaignReport(baseUrl, accessToken, campaign.id);

                events.push({
                    event_type: 'mailchimp_campaign_report',
                    event_data: {
                        campaign_id: campaign.id,
                        campaign_title: campaign.settings?.title || '',
                        campaign_type: campaign.type,
                        list_id: campaign.recipients?.list_id || '',
                        subject_line: campaign.settings?.subject_line || '',
                        emails_sent: reportData.emails_sent || 0,
                        unique_opens: reportData.opens?.unique_opens || 0,
                        open_rate: reportData.opens?.open_rate || 0,
                        unique_clicks: reportData.clicks?.unique_clicks || 0,
                        click_rate: reportData.clicks?.click_rate || 0,
                        unsubscribes: reportData.unsubscribed || 0,
                        bounces: (reportData.bounces?.hard_bounces || 0) + (reportData.bounces?.soft_bounces || 0),
                    },
                    timestamp: campaign.send_time || new Date().toISOString(),
                });

                // Rate limiting between campaign report fetches
                await sleep(300);
            }

            logger.info('MailchimpService', `Fetched ${events.length} campaign reports from Mailchimp`);
        } catch (error) {
            logger.error('MailchimpService', 'Failed to fetch historical data', error);
            throw error;
        }

        return events;
    }

    private async fetchCampaigns(
        baseUrl: string,
        accessToken: string,
        dateRange: { startDate: string; endDate: string }
    ): Promise<any[]> {
        const campaigns: any[] = [];
        let offset = 0;
        const count = 100; // Max per page

        try {
            while (true) {
                const response = await withRetry(
                    () =>
                        axios.get(`${baseUrl}/campaigns`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                            params: {
                                status: 'sent',
                                since_send_time: dateRange.startDate,
                                before_send_time: dateRange.endDate,
                                count,
                                offset,
                            },
                        }),
                    { retryableStatusCodes: [429, 500, 502, 503] }
                );

                const data = response.data.campaigns || [];
                campaigns.push(...data);

                // Check if more pages exist
                if (data.length < count) {
                    break;
                }

                offset += count;
                await sleep(300);
            }
        } catch (error) {
            logger.error('MailchimpService', 'Failed to fetch campaigns', error);
            throw error;
        }

        return campaigns;
    }

    private async fetchCampaignReport(
        baseUrl: string,
        accessToken: string,
        campaignId: string
    ): Promise<any> {
        try {
            const response = await withRetry(
                () =>
                    axios.get(`${baseUrl}/reports/${campaignId}`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                { retryableStatusCodes: [429, 500, 502, 503] }
            );

            return response.data;
        } catch (error) {
            logger.error('MailchimpService', `Failed to fetch report for campaign ${campaignId}`, error);
            throw error;
        }
    }
}

export const mailchimpService = new MailchimpService();
