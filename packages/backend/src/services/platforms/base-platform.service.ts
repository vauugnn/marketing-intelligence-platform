import { Platform } from '@shared/types';

/**
 * A single raw event to be inserted into the raw_events table.
 */
export interface RawEventInput {
  event_type: string;
  event_data: Record<string, any>;
  timestamp: string; // ISO string
}

/**
 * Interface that all platform data services must implement.
 */
export interface PlatformService {
  platformName: Platform;

  /**
   * Fetches historical data for the given date range.
   * Each platform handles its own pagination and rate limiting internally.
   */
  fetchHistoricalData(
    accessToken: string,
    dateRange: { startDate: string; endDate: string },
    accountId?: string
  ): Promise<RawEventInput[]>;
}
