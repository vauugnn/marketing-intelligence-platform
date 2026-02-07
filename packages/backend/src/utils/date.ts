/**
 * Returns a date range from N days ago until now.
 */
export function getHistoricalDateRange(daysBack: number = 90): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Returns date in YYYY-MM-DD format for GA4 and Meta APIs.
 */
export function formatDateYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Converts a Date to Unix timestamp (seconds) for Stripe API.
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Splits a date range into chunks of maxDays each.
 * Used for PayPal API which limits queries to 31-day windows.
 */
export function splitDateRange(
  startDate: Date,
  endDate: Date,
  maxDays: number = 31
): Array<{ start: Date; end: Date }> {
  const chunks: Array<{ start: Date; end: Date }> = [];
  let current = new Date(startDate);

  while (current < endDate) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays);

    chunks.push({
      start: new Date(current),
      end: chunkEnd > endDate ? new Date(endDate) : chunkEnd,
    });

    current = new Date(chunkEnd);
  }

  return chunks;
}
