/**
 * PayPal Service Unit Tests
 * 
 * Tests for Acceptance Criteria:
 * - PayPal API for actual transaction data
 * - Pull last 90 days of historical data
 * - Handle API rate limits gracefully (splits into 31-day chunks)
 */

import { PayPalService } from './paypal.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../utils/retry', () => ({
    withRetry: jest.fn((fn) => fn()),
    sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/date', () => ({
    splitDateRange: jest.fn((start: Date, end: Date, maxDays: number) => {
        // Simulate splitting 90 days into 31-day chunks
        return [
            { start: new Date('2025-11-09'), end: new Date('2025-12-10') },
            { start: new Date('2025-12-10'), end: new Date('2026-01-10') },
            { start: new Date('2026-01-10'), end: new Date('2026-02-07') },
        ];
    }),
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('PayPal Service', () => {
    let service: PayPalService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PayPalService();

        // Mock transaction response
        mockedAxios.get.mockResolvedValue({
            data: {
                transaction_details: [
                    {
                        transaction_info: {
                            transaction_id: 'TXN_001',
                            transaction_status: 'S',
                            transaction_event_code: 'T0006',
                            transaction_amount: { value: '99.99', currency_code: 'USD' },
                            fee_amount: { value: '2.99', currency_code: 'USD' },
                            transaction_initiation_date: '2026-02-01T10:00:00Z',
                        },
                        payer_info: {
                            email_address: 'buyer@example.com',
                            payer_name: { alternate_full_name: 'John Buyer' },
                        },
                        cart_info: {
                            item_details: [{ name: 'Product A', quantity: '1' }],
                        },
                    },
                ],
                total_pages: 1,
            },
        });
    });

    describe('platformName', () => {
        it('should be paypal', () => {
            expect(service.platformName).toBe('paypal');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockAccessToken = 'mock-paypal-access-token';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of transaction events', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(Array.isArray(events)).toBe(true);
        });

        it('should include paypal_transaction event type', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const txnEvents = events.filter(e => e.event_type === 'paypal_transaction');
            expect(txnEvents.length).toBeGreaterThan(0);
        });

        it('should split 90-day range into 31-day chunks', async () => {
            const { splitDateRange } = require('../../utils/date');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(splitDateRange).toHaveBeenCalledWith(
                expect.any(Date),
                expect.any(Date),
                31
            );
        });

        it('should use sleep between chunk requests for rate limiting', async () => {
            const { sleep } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            // Should sleep between chunks (3 chunks = 2 sleeps between them)
            // Plus sleeps between pages if any
            expect(sleep).toHaveBeenCalledWith(2000);
        });

        it('should include transaction details in event_data', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const event = events[0];
            expect(event.event_data).toHaveProperty('transaction_id');
            expect(event.event_data).toHaveProperty('gross_amount');
            expect(event.event_data).toHaveProperty('payer_email');
        });

        it('should parse amount correctly', async () => {
            const events = await service.fetchHistoricalData(mockAccessToken, dateRange);

            const event = events[0];
            expect(event.event_data.gross_amount).toBe(99.99);
            expect(event.event_data.fee_amount).toBe(2.99);
        });

        it('should use withRetry for API calls', async () => {
            const { withRetry } = require('../../utils/retry');

            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(withRetry).toHaveBeenCalled();
        });

        it('should include Authorization header with Bearer token', async () => {
            await service.fetchHistoricalData(mockAccessToken, dateRange);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockAccessToken}`,
                    }),
                })
            );
        });
    });
});
