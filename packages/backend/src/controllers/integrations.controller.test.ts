/**
 * Integrations Controller Unit Tests
 *
 * Tests for:
 * - Listing connection status for all platforms
 * - Initiating OAuth flows (class-based services)
 * - Stripe API key connection
 * - Disconnecting platforms
 */

import { Request, Response } from 'express';
import * as integrationsController from './integrations.controller';

// Mock the class-based OAuth service factory
jest.mock('../services/oauth/OAuthServiceFactory', () => ({
  getOAuthService: jest.fn((platform: string) => ({
    getAuthUrl: jest.fn(() =>
      Promise.resolve(`https://accounts.google.com/oauth?client_id=test&platform=${platform}`)
    ),
    disconnect: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../services/connection.service', () => ({
  getConnectionsByUser: jest.fn(() => Promise.resolve([
    {
      platform: 'google_analytics_4',
      status: 'connected',
      connected_at: '2026-02-01T00:00:00Z',
      last_synced_at: '2026-02-07T00:00:00Z',
      platform_account_id: 'GA-123456',
      access_token: 'secret-token-should-not-be-exposed',
    },
    {
      platform: 'meta',
      status: 'syncing',
      connected_at: '2026-02-05T00:00:00Z',
      access_token: 'another-secret-token',
    },
  ])),
  deleteConnection: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/sync.service', () => ({
  syncHistoricalData: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Stripe for API key validation
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    balance: {
      retrieve: jest.fn(() => Promise.resolve({ available: [] })),
    },
  }));
});

describe('Integrations Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));

    mockReq = {
      params: {},
      body: {},
    } as Partial<Request>;
    (mockReq as any).userId = 'user-123';

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('listConnections', () => {
    it('should return all platforms with their connection status', async () => {
      await integrationsController.listConnections(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data.length).toBe(4); // All 4 platforms
    });

    it('should include connection status for each platform', async () => {
      await integrationsController.listConnections(
        mockReq as Request,
        mockRes as Response
      );

      const response = jsonMock.mock.calls[0][0];
      const ga4 = response.data.find((p: any) => p.platform === 'google_analytics_4');
      const meta = response.data.find((p: any) => p.platform === 'meta');
      const stripe = response.data.find((p: any) => p.platform === 'stripe');

      expect(ga4.status).toBe('connected');
      expect(meta.status).toBe('syncing');
      expect(stripe.status).toBe('disconnected');
    });

    it('should NOT expose access tokens in response', async () => {
      await integrationsController.listConnections(
        mockReq as Request,
        mockRes as Response
      );

      const response = jsonMock.mock.calls[0][0];
      response.data.forEach((platform: any) => {
        expect(platform).not.toHaveProperty('access_token');
        expect(platform).not.toHaveProperty('refresh_token');
      });
    });

    it('should include connected_at and last_synced_at for connected platforms', async () => {
      await integrationsController.listConnections(
        mockReq as Request,
        mockRes as Response
      );

      const response = jsonMock.mock.calls[0][0];
      const ga4 = response.data.find((p: any) => p.platform === 'google_analytics_4');

      expect(ga4.connected_at).toBe('2026-02-01T00:00:00Z');
      expect(ga4.last_synced_at).toBe('2026-02-07T00:00:00Z');
    });
  });

  describe('initiateConnect', () => {
    it('should return OAuth auth URL for Google Analytics 4', async () => {
      mockReq.params = { platform: 'google_analytics_4' };

      await integrationsController.initiateConnect(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            type: 'oauth',
            authUrl: expect.stringContaining('accounts.google.com'),
          }),
        })
      );
    });

    it('should return api_key type for Stripe', async () => {
      mockReq.params = { platform: 'stripe' };

      await integrationsController.initiateConnect(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            type: 'api_key',
          }),
        })
      );
    });

    it('should return error for unsupported platform', async () => {
      mockReq.params = { platform: 'unsupported' };

      await integrationsController.initiateConnect(
        mockReq as Request,
        mockRes as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('disconnect', () => {
    it('should disconnect platform and return success', async () => {
      mockReq.params = { platform: 'google_analytics_4' };

      await integrationsController.disconnect(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
