import { Platform } from '@shared/types';
import { BaseOAuthService } from './BaseOAuthService';
import { GoogleAnalyticsService } from './GoogleAnalyticsService';
import { MetaService } from './MetaService';
import { StripeService } from './StripeService';

/**
 * Factory to get the appropriate OAuth service for a platform
 */
export function getOAuthService(platform: Platform): BaseOAuthService {
  switch (platform) {
    case 'google_analytics_4':
      return new GoogleAnalyticsService();

    case 'meta':
      return new MetaService();

    case 'stripe':
      return new StripeService();

    case 'paypal':
    case 'google_ads':
    case 'hubspot':
    case 'mailchimp':
      throw new Error(`OAuth for ${platform} not yet implemented`);

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
