/**
 * Stripe Service Unit Tests
 * 
 * Tests for Acceptance Criteria:
 * - Stripe API for actual transaction data
 * - Pull last 90 days of historical data
 */

import { StripeService } from './stripe.service';

// Mock Stripe SDK
const mockChargesList = jest.fn();
const mockPaymentIntentsList = jest.fn();
const mockCustomersList = jest.fn();
const mockBalanceRetrieve = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        charges: {
            list: mockChargesList,
        },
        paymentIntents: {
            list: mockPaymentIntentsList,
        },
        customers: {
            list: mockCustomersList,
        },
        balance: {
            retrieve: mockBalanceRetrieve,
        },
    }));
});

jest.mock('../../utils/date', () => ({
    toUnixTimestamp: jest.fn((date: Date) => Math.floor(date.getTime() / 1000)),
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Helper to create async iterator from array
function createAsyncIterator<T>(items: T[]) {
    return {
        [Symbol.asyncIterator]: async function* () {
            for (const item of items) {
                yield item;
            }
        },
    };
}

describe('Stripe Service', () => {
    let service: StripeService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new StripeService();

        // Mock charges
        mockChargesList.mockReturnValue(createAsyncIterator([
            {
                id: 'ch_123',
                amount: 9999,
                currency: 'usd',
                status: 'succeeded',
                description: 'Test charge',
                customer: 'cus_123',
                payment_method: 'pm_123',
                receipt_email: 'test@example.com',
                metadata: {},
                created: 1738886400, // 2026-02-07
            },
        ]));

        // Mock payment intents
        mockPaymentIntentsList.mockReturnValue(createAsyncIterator([
            {
                id: 'pi_456',
                amount: 5000,
                currency: 'usd',
                status: 'succeeded',
                description: 'Payment intent',
                customer: 'cus_123',
                payment_method: 'pm_456',
                metadata: {},
                created: 1738886400,
            },
        ]));

        // Mock customers
        mockCustomersList.mockReturnValue(createAsyncIterator([
            {
                id: 'cus_789',
                email: 'customer@example.com',
                name: 'John Doe',
                phone: '+1234567890',
                metadata: {},
                created: 1738886400,
            },
        ]));
    });

    describe('platformName', () => {
        it('should be stripe', () => {
            expect(service.platformName).toBe('stripe');
        });
    });

    describe('fetchHistoricalData', () => {
        const mockApiKey = 'sk_test_mock_key';
        const dateRange = {
            startDate: '2025-11-09T00:00:00Z',
            endDate: '2026-02-07T00:00:00Z',
        };

        it('should return array of events', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);
        });

        it('should include stripe_charge events', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            const chargeEvents = events.filter(e => e.event_type === 'stripe_charge');
            expect(chargeEvents.length).toBe(1);
            expect(chargeEvents[0].event_data.id).toBe('ch_123');
        });

        it('should include stripe_payment_intent events', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            const intentEvents = events.filter(e => e.event_type === 'stripe_payment_intent');
            expect(intentEvents.length).toBe(1);
        });

        it('should include stripe_customer events', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            const customerEvents = events.filter(e => e.event_type === 'stripe_customer');
            expect(customerEvents.length).toBe(1);
        });

        it('should convert amount from cents to dollars', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            const chargeEvent = events.find(e => e.event_type === 'stripe_charge');
            expect(chargeEvent?.event_data.amount).toBe(99.99); // 9999 cents = $99.99
        });

        it('should include ISO timestamp', async () => {
            const events = await service.fetchHistoricalData(mockApiKey, dateRange);

            events.forEach(event => {
                expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            });
        });

        it('should pass date filter to Stripe API', async () => {
            const { toUnixTimestamp } = require('../../utils/date');

            await service.fetchHistoricalData(mockApiKey, dateRange);

            expect(toUnixTimestamp).toHaveBeenCalled();
            expect(mockChargesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    created: expect.objectContaining({
                        gte: expect.any(Number),
                        lte: expect.any(Number),
                    }),
                })
            );
        });
    });
});
