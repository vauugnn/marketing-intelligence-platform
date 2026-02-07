import Stripe from 'stripe';
import { PlatformService, RawEventInput } from './base-platform.service';
import { toUnixTimestamp } from '../../utils/date';
import { logger } from '../../utils/logger';

export class StripeService implements PlatformService {
  platformName = 'stripe' as const;

  async fetchHistoricalData(
    apiKey: string,
    dateRange: { startDate: string; endDate: string }
  ): Promise<RawEventInput[]> {
    const stripe = new Stripe(apiKey);
    const events: RawEventInput[] = [];

    const createdFilter = {
      gte: toUnixTimestamp(new Date(dateRange.startDate)),
      lte: toUnixTimestamp(new Date(dateRange.endDate)),
    };

    // Fetch charges
    const charges = await this.fetchCharges(stripe, createdFilter);
    events.push(...charges);

    // Fetch payment intents
    const paymentIntents = await this.fetchPaymentIntents(stripe, createdFilter);
    events.push(...paymentIntents);

    // Fetch customers
    const customers = await this.fetchCustomers(stripe, createdFilter);
    events.push(...customers);

    logger.info('StripeService', `Fetched ${events.length} events from Stripe`);
    return events;
  }

  private async fetchCharges(
    stripe: Stripe,
    created: { gte: number; lte: number }
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    try {
      for await (const charge of stripe.charges.list({ created, limit: 100 })) {
        events.push({
          event_type: 'stripe_charge',
          event_data: {
            id: charge.id,
            amount: charge.amount / 100, // Convert from cents
            currency: charge.currency,
            status: charge.status,
            description: charge.description,
            customer: charge.customer,
            payment_method: charge.payment_method,
            receipt_email: charge.receipt_email,
            metadata: charge.metadata,
          },
          timestamp: new Date(charge.created * 1000).toISOString(),
        });
      }
    } catch (error) {
      logger.error('StripeService', 'Failed to fetch charges', error);
      throw error;
    }

    return events;
  }

  private async fetchPaymentIntents(
    stripe: Stripe,
    created: { gte: number; lte: number }
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    try {
      for await (const intent of stripe.paymentIntents.list({ created, limit: 100 })) {
        events.push({
          event_type: 'stripe_payment_intent',
          event_data: {
            id: intent.id,
            amount: intent.amount / 100,
            currency: intent.currency,
            status: intent.status,
            description: intent.description,
            customer: intent.customer,
            payment_method: intent.payment_method,
            metadata: intent.metadata,
          },
          timestamp: new Date(intent.created * 1000).toISOString(),
        });
      }
    } catch (error) {
      logger.error('StripeService', 'Failed to fetch payment intents', error);
      throw error;
    }

    return events;
  }

  private async fetchCustomers(
    stripe: Stripe,
    created: { gte: number; lte: number }
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    try {
      for await (const customer of stripe.customers.list({ created, limit: 100 })) {
        events.push({
          event_type: 'stripe_customer',
          event_data: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            metadata: customer.metadata,
          },
          timestamp: new Date(customer.created * 1000).toISOString(),
        });
      }
    } catch (error) {
      logger.error('StripeService', 'Failed to fetch customers', error);
      throw error;
    }

    return events;
  }
}

export const stripeService = new StripeService();
