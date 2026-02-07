// Utility functions

export function calculateROI(revenue: number, spend: number): number {
  if (spend === 0) return Infinity;
  return ((revenue - spend) / spend) * 100;
}

export function getPerformanceRating(roi: number): string {
  if (roi >= 1000) return 'exceptional';
  if (roi >= 500) return 'excellent';
  if (roi >= 200) return 'satisfactory';
  if (roi >= 0) return 'poor';
  return 'failing';
}

export function calculateConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 95) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

export function formatCurrency(amount: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function parseUTMParams(url: string): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} {
  const urlObj = new URL(url);
  return {
    utm_source: urlObj.searchParams.get('utm_source') || undefined,
    utm_medium: urlObj.searchParams.get('utm_medium') || undefined,
    utm_campaign: urlObj.searchParams.get('utm_campaign') || undefined,
    utm_term: urlObj.searchParams.get('utm_term') || undefined,
    utm_content: urlObj.searchParams.get('utm_content') || undefined
  };
}
