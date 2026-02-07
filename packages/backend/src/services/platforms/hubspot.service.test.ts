/**
 * HubSpot Marketing API Service Unit Tests
 *
 * Tests for:
 * - OAuth integration for HubSpot
 * - Marketing email statistics fetching
 * - Campaign data fetching
 * - Handle API rate limits gracefully
 */

import { HubSpotService } from './hubspot.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../utils/retry', () => ({
    withRetry: jest.fn((fn) => fn()),
    sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('HubSpot Marketing API Service', () => {
    let service: HubSpotService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new HubSpotService();

        // Mock marketing emails list response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                results: [
                    {
                        id: 'email_001',
                        name: 'Welcome Email',
                        subject: 'Welcome to our platform!',
                        state: 'PUBLISHED',
                        createdAt: '2026-02-01T10:00:00Z',
                        updatedAt: '2026-02-01T10:00:00Z',
                    },
                ],
                paging: {},
            },
        });

        // Mock email statistics response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                counters: {
                    sent: 10000,
                    open: 4000,
                    click: 800,
                    bounce: 50,
                    unsubscribed: 20,
                    spamreport: 5,
                    delivered: 9950,
                },
            },
        });

        // Mock campaigns response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                results: [
                    {
                        id: 'campaign_001',
                        name: 'Q1 Marketing Campaign',
                        type: 'EMAIL',
                    },
                ],
            },
        });
    });

    describe('platformName', () => {
        it('should be hubspot', () => {
            expect(service.platformName).toBe('hubspot');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockAccessToken = 'mock-hubspot-access-token';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of events', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(Array.isArray(events)).toBe(true);
        });

        it('should include hubspot_marketing_email event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const emailEvents = events.filter((e) => e.event_type === 'hubspot_marketing_email');
            expect(emailEvents.length).toBeGreaterThan(0);
        });

        it('should include hubspot_campaign event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const campaignEvents = events.filter((e) => e.event_type === 'hubspot_campaign');
            expect(campaignEvents.length).toBeGreaterThan(0);
        });

        it('should include email metrics in event_data', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const emailEvent = events.find((e) => e.event_type === 'hubspot_marketing_email');
            expect(emailEvent?.event_data).toHaveProperty('email_id');
            expect(emailEvent?.event_data).toHaveProperty('email_name');
            expect(emailEvent?.event_data).toHaveProperty('sends');
            expect(emailEvent?.event_data).toHaveProperty('opens');
            expect(emailEvent?.event_data).toHaveProperty('clicks');
        });

        it('should include all email statistics', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const emailEvent = events.find((e) => e.event_type === 'hubspot_marketing_email');
            expect(emailEvent?.event_data.sends).toBe(10000);
            expect(emailEvent?.event_data.opens).toBe(4000);
            expect(emailEvent?.event_data.clicks).toBe(800);
            expect(emailEvent?.event_data.bounces).toBe(50);
        });

        it('should use sleep for rate limiting', async () => {
            const { sleep } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(sleep).toHaveBeenCalled();
        });

        it('should use withRetry for API calls', async () => {
            const { withRetry } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(withRetry).toHaveBeenCalled();
        });

        it('should return empty array when no emails found', async () => {
            mockedAxios.get.mockReset();
            mockedAxios.get.mockResolvedValueOnce({
                data: { results: [] },
            });
            mockedAxios.get.mockResolvedValueOnce({
                data: { results: [] },
            });

            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(events).toEqual([]);
        });

        it('should handle emails without statistics gracefully', async () => {
            mockedAxios.get.mockReset();

            // Mock emails list
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    results: [
                        {
                            id: 'email_002',
                            name: 'Draft Email',
                            createdAt: '2026-02-01T10:00:00Z',
                            updatedAt: '2026-02-01T10:00:00Z',
                        },
                    ],
                },
            });

            // Mock statistics - returns error
            mockedAxios.get.mockRejectedValueOnce(new Error('No statistics available'));

            // Mock campaigns
            mockedAxios.get.mockResolvedValueOnce({
                data: { results: [] },
            });

            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            // Should still return an event with empty statistics
            const emailEvent = events.find((e) => e.event_type === 'hubspot_marketing_email');
            expect(emailEvent?.event_data.sends).toBe(0);
        });
    });
});
