/**
 * Google Analytics 4 Service Unit Tests
 * 
 * Tests for Acceptance Criteria:
 * - OAuth integration for Google Analytics 4
 * - Use Google Analytics Data API v1
 * - Handle API rate limits gracefully
 */

import { GoogleAnalyticsService } from './google-analytics.service';

// Mock googleapis
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
            })),
        },
        analyticsdata: jest.fn(() => ({
            properties: {
                runReport: jest.fn(() => Promise.resolve({
                    data: {
                        rows: [
                            {
                                dimensionValues: [{ value: '20260201' }, { value: 'Organic Search' }],
                                metricValues: [{ value: '100' }, { value: '500' }, { value: '10' }, { value: '80' }],
                            },
                        ],
                    },
                })),
            },
        })),
        analyticsadmin: jest.fn(() => ({
            properties: {
                list: jest.fn(() => Promise.resolve({
                    data: {
                        properties: [{ name: 'properties/123456' }],
                    },
                })),
            },
        })),
    },
}));

jest.mock('../../utils/retry', () => ({
    withRetry: jest.fn((fn) => fn()),
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Google Analytics 4 Service', () => {
    let service: GoogleAnalyticsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new GoogleAnalyticsService();
    });

    describe('platformName', () => {
        it('should be google_analytics_4', () => {
            expect(service.platformName).toBe('google_analytics_4');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockAccessToken = 'mock-ga4-access-token';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of RawEventInput objects', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, '123456');

            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);
        });

        it('should include ga4_sessions event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, '123456');

            const sessionEvents = events.filter(e => e.event_type === 'ga4_sessions');
            expect(sessionEvents.length).toBeGreaterThan(0);
        });

        it('should include timestamp in ISO format', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, '123456');

            events.forEach(event => {
                expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            });
        });

        it('should include event_data with metrics', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange, '123456');

            const sessionEvent = events.find(e => e.event_type === 'ga4_sessions');
            expect(sessionEvent?.event_data).toHaveProperty('sessions');
            expect(sessionEvent?.event_data).toHaveProperty('page_views');
        });

        it('should use withRetry for API calls (rate limit handling)', async () => {
            const { withRetry } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange, '123456');

            expect(withRetry).toHaveBeenCalled();
        });

        it('should auto-discover property ID if not provided', async () => {
            const { google } = require('googleapis');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            // Should call analyticsadmin to discover properties
            expect(google.analyticsadmin).toHaveBeenCalled();
        });
    });
});
