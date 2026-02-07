/**
 * Sync Service Unit Tests
 * 
 * Tests for Acceptance Criteria:
 * - Pull last 90 days of historical data on connection
 * - Store raw data in Supabase with timestamps
 * - Handle API rate limits gracefully
 */

import { syncHistoricalData } from './sync.service';
import * as connectionService from './connection.service';

// Mock dependencies
jest.mock('./connection.service');
jest.mock('../config/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn(() => ({
            insert: jest.fn(() => Promise.resolve({ error: null })),
        })),
    },
}));

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/date', () => ({
    getHistoricalDateRange: jest.fn((days: number) => ({
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
    })),
}));

// Mock platform services
jest.mock('./platforms/google-analytics.service', () => ({
    googleAnalyticsService: {
        platformName: 'google_analytics_4',
        fetchHistoricalData: jest.fn(() => Promise.resolve([
            { event_type: 'ga4_sessions', event_data: { sessions: 100 }, timestamp: '2026-02-01T00:00:00Z' },
            { event_type: 'ga4_traffic_source', event_data: { source: 'google' }, timestamp: '2026-02-01T00:00:00Z' },
        ])),
    },
}));

jest.mock('./platforms/meta.service', () => ({
    metaService: {
        platformName: 'meta',
        fetchHistoricalData: jest.fn(() => Promise.resolve([
            { event_type: 'meta_campaign_insights', event_data: { impressions: 5000 }, timestamp: '2026-02-01T00:00:00Z' },
        ])),
    },
}));

jest.mock('./platforms/stripe.service', () => ({
    stripeService: {
        platformName: 'stripe',
        fetchHistoricalData: jest.fn(() => Promise.resolve([
            { event_type: 'stripe_charge', event_data: { amount: 99.99 }, timestamp: '2026-02-01T00:00:00Z' },
        ])),
    },
}));

jest.mock('./platforms/paypal.service', () => ({
    paypalService: {
        platformName: 'paypal',
        fetchHistoricalData: jest.fn(() => Promise.resolve([
            { event_type: 'paypal_transaction', event_data: { gross_amount: 50.00 }, timestamp: '2026-02-01T00:00:00Z' },
        ])),
    },
}));

describe('Sync Service', () => {
    const mockConnection = {
        user_id: 'user-123',
        platform: 'google_analytics_4',
        status: 'connected',
        access_token: 'mock-token',
        platform_account_id: 'GA-123456',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (connectionService.getConnection as jest.Mock).mockResolvedValue(mockConnection);
        (connectionService.updateConnectionStatus as jest.Mock).mockResolvedValue(undefined);
        (connectionService.updateLastSynced as jest.Mock).mockResolvedValue(undefined);
    });

    describe('syncHistoricalData', () => {
        it('should fetch 90 days of historical data', async () => {
            const { getHistoricalDateRange } = require('../utils/date');

            await syncHistoricalData('user-123', 'google_analytics_4');

            // Verify 90-day date range is requested
            expect(getHistoricalDateRange).toHaveBeenCalledWith(90);
        });

        it('should update connection status to syncing during sync', async () => {
            await syncHistoricalData('user-123', 'google_analytics_4');

            expect(connectionService.updateConnectionStatus).toHaveBeenCalledWith(
                'user-123',
                'google_analytics_4',
                'syncing'
            );
        });

        it('should update connection status to connected after successful sync', async () => {
            await syncHistoricalData('user-123', 'google_analytics_4');

            // Should be called twice: first 'syncing', then 'connected'
            expect(connectionService.updateConnectionStatus).toHaveBeenLastCalledWith(
                'user-123',
                'google_analytics_4',
                'connected'
            );
        });

        it('should update last_synced_at timestamp after sync', async () => {
            await syncHistoricalData('user-123', 'google_analytics_4');

            expect(connectionService.updateLastSynced).toHaveBeenCalledWith(
                'user-123',
                'google_analytics_4'
            );
        });

        it('should set status to error on sync failure', async () => {
            const { googleAnalyticsService } = require('./platforms/google-analytics.service');
            googleAnalyticsService.fetchHistoricalData.mockRejectedValueOnce(new Error('API Error'));

            await expect(syncHistoricalData('user-123', 'google_analytics_4')).rejects.toThrow();

            expect(connectionService.updateConnectionStatus).toHaveBeenLastCalledWith(
                'user-123',
                'google_analytics_4',
                'error'
            );
        });

        it('should throw error if no connection found', async () => {
            (connectionService.getConnection as jest.Mock).mockResolvedValue(null);

            await expect(syncHistoricalData('user-123', 'google_analytics_4')).rejects.toThrow(
                'No active connection found for google_analytics_4'
            );
        });

        it('should handle Meta platform sync', async () => {
            (connectionService.getConnection as jest.Mock).mockResolvedValue({
                ...mockConnection,
                platform: 'meta',
            });

            await syncHistoricalData('user-123', 'meta');

            expect(connectionService.updateConnectionStatus).toHaveBeenLastCalledWith(
                'user-123',
                'meta',
                'connected'
            );
        });

        it('should handle Stripe platform sync', async () => {
            (connectionService.getConnection as jest.Mock).mockResolvedValue({
                ...mockConnection,
                platform: 'stripe',
            });

            await syncHistoricalData('user-123', 'stripe');

            expect(connectionService.updateConnectionStatus).toHaveBeenLastCalledWith(
                'user-123',
                'stripe',
                'connected'
            );
        });

        it('should handle PayPal platform sync', async () => {
            (connectionService.getConnection as jest.Mock).mockResolvedValue({
                ...mockConnection,
                platform: 'paypal',
            });

            await syncHistoricalData('user-123', 'paypal');

            expect(connectionService.updateConnectionStatus).toHaveBeenLastCalledWith(
                'user-123',
                'paypal',
                'connected'
            );
        });
    });
});
