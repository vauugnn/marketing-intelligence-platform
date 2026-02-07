/**
 * Mailchimp Marketing API Service Unit Tests
 *
 * Tests for:
 * - OAuth integration for Mailchimp
 * - Campaign report fetching
 * - Handle API rate limits gracefully
 */

import { MailchimpService } from './mailchimp.service';
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

describe('Mailchimp Marketing API Service', () => {
    let service: MailchimpService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MailchimpService();

        // Mock campaigns list response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                campaigns: [
                    {
                        id: 'camp_001',
                        type: 'regular',
                        send_time: '2026-02-01T10:00:00Z',
                        settings: {
                            title: 'February Newsletter',
                            subject_line: 'Check out our latest updates!',
                        },
                        recipients: {
                            list_id: 'list_123',
                        },
                    },
                ],
            },
        });

        // Mock campaign report response
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                emails_sent: 5000,
                opens: {
                    unique_opens: 2500,
                    open_rate: 0.5,
                },
                clicks: {
                    unique_clicks: 500,
                    click_rate: 0.1,
                },
                unsubscribed: 10,
                bounces: {
                    hard_bounces: 5,
                    soft_bounces: 15,
                },
            },
        });
    });

    describe('platformName', () => {
        it('should be mailchimp', () => {
            expect(service.platformName).toBe('mailchimp');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockAccessToken = 'mock-mailchimp-access-token';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of campaign reports', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            expect(Array.isArray(events)).toBe(true);
        });

        it('should include mailchimp_campaign_report event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            const campaignEvents = events.filter((e) => e.event_type === 'mailchimp_campaign_report');
            expect(campaignEvents.length).toBeGreaterThan(0);
        });

        it('should include campaign metrics in event_data', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            const event = events[0];
            expect(event.event_data).toHaveProperty('campaign_id');
            expect(event.event_data).toHaveProperty('campaign_title');
            expect(event.event_data).toHaveProperty('emails_sent');
            expect(event.event_data).toHaveProperty('unique_opens');
            expect(event.event_data).toHaveProperty('unique_clicks');
        });

        it('should calculate total bounces correctly', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            const event = events[0];
            expect(event.event_data.bounces).toBe(20); // 5 hard + 15 soft
        });

        it('should use sleep for rate limiting between reports', async () => {
            const { sleep } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            expect(sleep).toHaveBeenCalledWith(300);
        });

        it('should use withRetry for API calls', async () => {
            const { withRetry } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            expect(withRetry).toHaveBeenCalled();
        });

        it('should return empty array when no campaigns found', async () => {
            mockedAxios.get.mockReset();
            mockedAxios.get.mockResolvedValueOnce({
                data: { campaigns: [] },
            });

            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, 'us1');

            expect(events).toEqual([]);
        });

        it('should default to us1 data center when not specified', async () => {
            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('us1.api.mailchimp.com'),
                expect.any(Object)
            );
        });
    });
});
