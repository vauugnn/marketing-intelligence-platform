import { z } from 'zod';

export const PixelEventSchema = z.object({
  pixel_id: z.string().regex(/^pix_[a-f0-9]{32}$/),
  session_id: z.string().uuid(),
  event_type: z.enum(['page_view', 'conversion', 'custom', 'click', 'purchase']),
  page_url: z.string().url(),
  referrer: z.string().url().optional().or(z.literal('')),
  utm_source: z.string().max(255).optional(),
  utm_medium: z.string().max(255).optional(),
  utm_campaign: z.string().max(255).optional(),
  utm_term: z.string().max(255).optional(),
  utm_content: z.string().max(255).optional(),
  timestamp: z.string().datetime(),
  metadata: z.union([z.record(z.any()), z.string()]).optional(),
  // Visitor identification
  visitor_id: z.string().optional(),
  visitor_email: z.string().email().optional().or(z.literal('')),
  visitor_name: z.string().optional(),
  // Conversion data
  value: z.number().optional(),
  currency: z.string().max(3).optional()
});

export type PixelEventInput = z.infer<typeof PixelEventSchema>;
