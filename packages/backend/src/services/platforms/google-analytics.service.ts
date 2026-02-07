import { google } from 'googleapis';
import { PlatformService, RawEventInput } from './base-platform.service';
import { withRetry } from '../../utils/retry';
import { logger } from '../../utils/logger';

export class GoogleAnalyticsService implements PlatformService {
  platformName = 'google_analytics_4' as const;

  async fetchHistoricalData(
    accessToken: string,
    dateRange: { startDate: string; endDate: string },
    propertyId?: string
  ): Promise<RawEventInput[]> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    // If no propertyId provided, discover the first available property
    if (!propertyId) {
      propertyId = await this.discoverPropertyId(auth);
    }

    if (!propertyId) {
      logger.warn('GA4Service', 'No GA4 property found for this account');
      return [];
    }

    const property = `properties/${propertyId}`;
    const startDate = dateRange.startDate.split('T')[0];
    const endDate = dateRange.endDate.split('T')[0];

    const events: RawEventInput[] = [];

    // Fetch sessions and page views report
    const sessionsData = await this.fetchSessionsReport(analyticsData, property, startDate, endDate);
    events.push(...sessionsData);

    // Fetch traffic sources report
    const trafficData = await this.fetchTrafficSourcesReport(analyticsData, property, startDate, endDate);
    events.push(...trafficData);

    logger.info('GA4Service', `Fetched ${events.length} events from GA4`);
    return events;
  }

  private async discoverPropertyId(auth: any): Promise<string | undefined> {
    try {
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth });
      const response = await withRetry(() =>
        analyticsAdmin.properties.list({ filter: 'parent:accounts/-' })
      );

      const properties = response.data.properties;
      if (properties && properties.length > 0) {
        // Extract numeric ID from "properties/123456"
        const fullName = properties[0].name || '';
        return fullName.replace('properties/', '');
      }
    } catch (error) {
      logger.error('GA4Service', 'Failed to discover GA4 properties', error);
    }
    return undefined;
  }

  private async fetchSessionsReport(
    analyticsData: any,
    property: string,
    startDate: string,
    endDate: string
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    try {
      const response: any = await withRetry(() =>
        analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'date' },
              { name: 'sessionDefaultChannelGroup' },
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'conversions' },
              { name: 'totalUsers' },
            ],
          },
        })
      );

      const rows = response.data.rows || [];
      for (const row of rows) {
        const date = row.dimensionValues?.[0]?.value || '';
        const channelGroup = row.dimensionValues?.[1]?.value || '';

        events.push({
          event_type: 'ga4_sessions',
          event_data: {
            date,
            channel_group: channelGroup,
            sessions: parseInt(row.metricValues?.[0]?.value || '0'),
            page_views: parseInt(row.metricValues?.[1]?.value || '0'),
            conversions: parseInt(row.metricValues?.[2]?.value || '0'),
            total_users: parseInt(row.metricValues?.[3]?.value || '0'),
          },
          // Convert GA4 date format (YYYYMMDD) to ISO
          timestamp: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`,
        });
      }
    } catch (error) {
      logger.error('GA4Service', 'Failed to fetch sessions report', error);
      throw error;
    }

    return events;
  }

  private async fetchTrafficSourcesReport(
    analyticsData: any,
    property: string,
    startDate: string,
    endDate: string
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    try {
      const response: any = await withRetry(() =>
        analyticsData.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'date' },
              { name: 'sessionSource' },
              { name: 'sessionMedium' },
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'conversions' },
            ],
          },
        })
      );

      const rows = response.data.rows || [];
      for (const row of rows) {
        const date = row.dimensionValues?.[0]?.value || '';
        events.push({
          event_type: 'ga4_traffic_source',
          event_data: {
            date,
            source: row.dimensionValues?.[1]?.value || '',
            medium: row.dimensionValues?.[2]?.value || '',
            sessions: parseInt(row.metricValues?.[0]?.value || '0'),
            total_users: parseInt(row.metricValues?.[1]?.value || '0'),
            conversions: parseInt(row.metricValues?.[2]?.value || '0'),
          },
          timestamp: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`,
        });
      }
    } catch (error) {
      logger.error('GA4Service', 'Failed to fetch traffic sources report', error);
      throw error;
    }

    return events;
  }
}

export const googleAnalyticsService = new GoogleAnalyticsService();
