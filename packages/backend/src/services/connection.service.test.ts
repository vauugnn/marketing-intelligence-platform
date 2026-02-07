import * as connectionService from './connection.service';

// Mock Supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../config/supabase', () => ({
    supabaseAdmin: {
        from: () => ({
            select: () => ({
                eq: (col: string, val: string) => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: null }),
                    }),
                    single: () => Promise.resolve({ data: null, error: null }),
                }),
            }),
            upsert: () => ({
                select: () => ({
                    single: () => Promise.resolve({
                        data: {
                            id: 'conn-123',
                            user_id: 'user-123',
                            platform: 'google_analytics_4',
                            status: 'connected',
                            access_token: 'token-xyz',
                            connected_at: new Date().toISOString(),
                        },
                        error: null,
                    }),
                }),
            }),
            update: () => ({
                eq: () => ({
                    eq: () => Promise.resolve({ error: null }),
                }),
            }),
            delete: () => ({
                eq: () => ({
                    eq: () => Promise.resolve({ error: null }),
                }),
            }),
        }),
    },
}));

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Connection Service', () => {
    describe('upsertConnection', () => {
        it('should upsert a connection with all required fields', async () => {
            const params = {
                userId: 'user-123',
                platform: 'google_analytics_4' as const,
                status: 'connected' as const,
                accessToken: 'access-token-xyz',
                refreshToken: 'refresh-token-abc',
                tokenExpiresAt: new Date('2026-02-08T00:00:00Z'),
            };

            const result = await connectionService.upsertConnection(params);

            expect(result).toBeDefined();
            expect(result.platform).toBe('google_analytics_4');
            expect(result.status).toBe('connected');
        });
    });

    // Note: Full integration tests would require a real Supabase connection
    // These are unit tests with mocked database calls
});
