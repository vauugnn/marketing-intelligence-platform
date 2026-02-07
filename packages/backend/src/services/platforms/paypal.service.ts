import axios from 'axios';
import { PlatformService, RawEventInput } from './base-platform.service';
import { splitDateRange } from '../../utils/date';
import { withRetry, sleep } from '../../utils/retry';
import { logger } from '../../utils/logger';

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export class PayPalService implements PlatformService {
  platformName = 'paypal' as const;

  async fetchHistoricalData(
    accessToken: string,
    dateRange: { startDate: string; endDate: string }
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    // PayPal limits queries to 31-day windows, so split the 90-day range
    const chunks = splitDateRange(
      new Date(dateRange.startDate),
      new Date(dateRange.endDate),
      31
    );

    for (const chunk of chunks) {
      const chunkEvents = await this.fetchTransactions(accessToken, chunk.start, chunk.end);
      events.push(...chunkEvents);

      // Rate limit: pause between chunk requests
      await sleep(2000);
    }

    logger.info('PayPalService', `Fetched ${events.length} events from PayPal`);
    return events;
  }

  private async fetchTransactions(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];
    let page = 1;
    let hasMore = true;

    const startDateISO = startDate.toISOString().replace(/\.\d{3}Z$/, '-0000');
    const endDateISO = endDate.toISOString().replace(/\.\d{3}Z$/, '-0000');

    try {
      while (hasMore) {
        const response = await withRetry(() =>
          axios.get(`${PAYPAL_API_BASE}/v1/reporting/transactions`, {
            params: {
              start_date: startDateISO,
              end_date: endDateISO,
              fields: 'all',
              page_size: 500,
              page,
            },
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
        );

        const transactions = response.data.transaction_details || [];
        for (const txn of transactions) {
          const txnInfo = txn.transaction_info || {};
          const payerInfo = txn.payer_info || {};
          const cartInfo = txn.cart_info || {};

          events.push({
            event_type: 'paypal_transaction',
            event_data: {
              transaction_id: txnInfo.transaction_id,
              transaction_status: txnInfo.transaction_status,
              transaction_event_code: txnInfo.transaction_event_code,
              gross_amount: parseFloat(txnInfo.transaction_amount?.value || '0'),
              currency: txnInfo.transaction_amount?.currency_code || 'USD',
              fee_amount: parseFloat(txnInfo.fee_amount?.value || '0'),
              payer_email: payerInfo.email_address,
              payer_name: payerInfo.payer_name?.alternate_full_name,
              item_details: cartInfo.item_details || [],
            },
            timestamp: txnInfo.transaction_initiation_date || new Date().toISOString(),
          });
        }

        // Check for more pages
        const totalPages = response.data.total_pages || 1;
        hasMore = page < totalPages;
        page++;

        if (hasMore) {
          await sleep(1000);
        }
      }
    } catch (error) {
      logger.error('PayPalService', 'Failed to fetch transactions', error);
      throw error;
    }

    return events;
  }
}

export const paypalService = new PayPalService();
