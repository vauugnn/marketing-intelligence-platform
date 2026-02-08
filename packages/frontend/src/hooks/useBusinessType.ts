import { useAuth } from './useAuth';
import type { BusinessType } from '@shared/types';

export type { BusinessType };

export interface CopyMap {
  siteLabel: string;
  siteDescription: string;
  pixelDescription: string;
  conversionVerb: string;
  stepOneLabel: string;
  metaDescription: string;
  pipelineSubtitle: string;
  dashboardMetric1Label: string;
  dashboardMetric1Prefix: string;
  dashboardMetric3Label: string;
  dashboardMetric3Prefix: string;
  dashboardMetric3Suffix: string;
  channelCol2Label: string;
  channelSubtitle: string;
}

const salesCopy: CopyMap = {
  siteLabel: 'Your Store',
  siteDescription: 'A visitor makes a purchase — the starting point of all attribution data',
  pixelDescription: 'Captures purchase details, session data, UTM parameters, and page interactions in real time',
  conversionVerb: 'Customer purchases',
  stepOneLabel: 'Customer purchases',
  metaDescription: 'Checks if the user interacted with Facebook or Instagram ads before purchasing',
  pipelineSubtitle: 'End-to-end: purchase capture → platform verification → attribution insights',
  dashboardMetric1Label: 'Total Revenue',
  dashboardMetric1Prefix: '₱',
  dashboardMetric3Label: 'Average ROI',
  dashboardMetric3Prefix: '',
  dashboardMetric3Suffix: '%',
  channelCol2Label: 'Revenue',
  channelSubtitle: 'Track revenue, spend, and ROI across platforms',
};

const leadsCopy: CopyMap = {
  siteLabel: 'Your Website',
  siteDescription: 'A visitor takes action on your site — the starting point of all attribution data',
  pixelDescription: 'Captures visitor activity, session data, UTM parameters, and page interactions in real time',
  conversionVerb: 'Visitor converts',
  stepOneLabel: 'Visitor converts',
  metaDescription: 'Checks if the visitor interacted with Facebook or Instagram ads before converting',
  pipelineSubtitle: 'End-to-end: activity capture → platform verification → attribution insights',
  dashboardMetric1Label: 'Total Conversions',
  dashboardMetric1Prefix: '',
  dashboardMetric3Label: 'Cost Per Lead',
  dashboardMetric3Prefix: '₱',
  dashboardMetric3Suffix: '',
  channelCol2Label: 'Conversions',
  channelSubtitle: 'Track conversions, spend, and cost per lead across platforms',
};

export function useBusinessType(): { type: BusinessType; copy: CopyMap } {
  const { user } = useAuth();
  const type: BusinessType = user?.user_metadata?.business_type === 'leads' ? 'leads' : 'sales';
  return { type, copy: type === 'leads' ? leadsCopy : salesCopy };
}
