import { generateAuthUrl } from './oauth.service';

// Mock the OAuth config
jest.mock('../config/oauth', () => ({
    getOAuthConfig: jest.fn((platform: string) => {
        if (platform === 'google_analytics_4') {
            return {
                clientId: 'test-google-client-id',
                clientSecret: 'test-google-secret',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
                redirectUri: 'http://localhost:3001/api/oauth/callback',
            };
        }
        if (platform === 'meta') {
            return {
                clientId: 'test-meta-app-id',
                clientSecret: 'test-meta-secret',
                authorizationUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
                tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
                scopes: ['ads_read', 'read_insights'],
                redirectUri: 'http://localhost:3001/api/oauth/callback',
            };
        }
        if (platform === 'stripe') {
            return null; // Stripe uses API key, not OAuth
        }
        return null;
    }),
    OAUTH_REDIRECT_URI: 'http://localhost:3001/api/oauth/callback',
}));

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('OAuth Service', () => {
    describe('generateAuthUrl', () => {
        it('should generate a valid Google Analytics 4 auth URL', () => {
            const userId = 'user-123';
            const url = generateAuthUrl('google_analytics_4', userId);

            expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
            expect(url).toContain('client_id=test-google-client-id');
            expect(url).toContain('response_type=code');
            expect(url).toContain('scope=https');
            expect(url).toContain('access_type=offline'); // Google-specific
            expect(url).toContain('prompt=consent'); // Google-specific
        });

        it('should include base64-encoded state with platform and userId', () => {
            const userId = 'user-456';
            const url = generateAuthUrl('google_analytics_4', userId);

            // Extract state from URL
            const urlObj = new URL(url);
            const state = urlObj.searchParams.get('state');
            expect(state).toBeTruthy();

            // Decode and verify state
            const decoded = JSON.parse(Buffer.from(state!, 'base64').toString());
            expect(decoded.platform).toBe('google_analytics_4');
            expect(decoded.userId).toBe('user-456');
        });

        it('should generate a valid Meta auth URL', () => {
            const userId = 'user-789';
            const url = generateAuthUrl('meta', userId);

            expect(url).toContain('https://www.facebook.com/v19.0/dialog/oauth');
            expect(url).toContain('client_id=test-meta-app-id');
            expect(url).toContain('scope=ads_read');
        });

        it('should throw for unsupported platforms', () => {
            expect(() => generateAuthUrl('stripe', 'user-123')).toThrow(
                'OAuth is not supported for platform: stripe'
            );
        });

        it('should include correct redirect URI', () => {
            const url = generateAuthUrl('google_analytics_4', 'user-123');

            expect(url).toContain('redirect_uri=http');
            expect(url).toContain('localhost%3A3001');
        });
    });
});
