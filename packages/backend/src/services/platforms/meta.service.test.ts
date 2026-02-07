/**
 * Meta Marketing API Service Unit Tests
 * 
 * Tests for Acceptance Criteria:
 * - OAuth integration for Meta
 * - Meta Marketing API for ad performance
 * - Handle API rate limits gracefully
 */

import { MetaService } from './meta.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../utils/retry', () => ({
    withRetry: jest.fn((fn) => fn()),
    sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/date', () => ({
    formatDateYMD: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Meta Marketing API Service', () => {
    let service: MetaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MetaService();

        // Mock getAdAccounts response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                data: [
                    { id: 'act_123456', name: 'Test Ad Account', account_status: 1 },
                ],
            },
        });

        // Mock fetchCampaignInsights response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                data: [
                    {
                        campaign_name: 'Summer Sale',
                        campaign_id: 'camp_001',
                        impressions: '10000',
                        clicks: '500',
                        spend: '250.00',
                        cpc: '0.50',
                        cpm: '25.00',
                        ctr: '5.00',
                        actions: [],
                        action_values: [],
                        date_start: '2026-02-01',
                    },
                ],
                paging: {},
            },
        });
    });

    describe('platformName', () => {
        it('should be meta', () => {
            expect(service.platformName).toBe('meta');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockAccessToken = 'mock-meta-access-token';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of campaign insights', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(Array.isArray(events)).toBe(true);
        });

        it('should include meta_campaign_insights event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const campaignEvents = events.filter(e => e.event_type === 'meta_campaign_insights');
            expect(campaignEvents.length).toBeGreaterThan(0);
        });

        it('should include campaign metrics in event_data', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const event = events[0];
            expect(event.event_data).toHaveProperty('campaign_name');
            expect(event.event_data).toHaveProperty('impressions');
            expect(event.event_data).toHaveProperty('clicks');
            expect(event.event_data).toHaveProperty('spend');
        });

        it('should use sleep for rate limiting between accounts', async () => {
            const { sleep } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(sleep).toHaveBeenCalledWith(500);
        });

        it('should use withRetry for API calls', async () => {
            const { withRetry } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(withRetry).toHaveBeenCalled();
        });

        it('should filter only active ad accounts (account_status = 1)', async () => {
            // Reset mocks
            mockedAxios.get.mockReset();

            // Mock with inactive account
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    data: [
                        { id: 'act_inactive', name: 'Inactive Account', account_status: 2 },
                    ],
                },
            });

            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            // Should return empty since only inactive account exists
            expect(events.length).toBe(0);
        });

        it('should return empty array when no ad accounts found', async () => {
            mockedAxios.get.mockReset();
            mockedAxios.get.mockResolvedValueOnce({
                data: { data: [] },
            });

            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(events).toEqual([]);
        });
    });
});
