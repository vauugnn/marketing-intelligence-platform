import { Request, Response } from 'express';
import { linkService } from '../services/link.service';
import { z } from 'zod';

const CreateLinkSchema = z.object({
    original_url: z.string().url(),
    metadata: z.record(z.any()).optional(),
    expires_in_days: z.number().optional()
});

export class LinkController {
    async createLink(req: Request, res: Response) {
        try {
            const { original_url, metadata, expires_in_days } = CreateLinkSchema.parse(req.body);

            const result = await linkService.createShortLink(
                original_url,
                metadata || {},
                expires_in_days
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid input',
                    details: error.errors
                });
            }

            console.error('Create link error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create short link'
            });
        }
    }

    async redirectLink(req: Request, res: Response) {
        try {
            const { code } = req.params;
            const result = await linkService.resolveShortLink(code);

            if (!result) {
                return res.status(404).send('Link not found or expired');
            }

            const { originalUrl, metadata } = result;

            // Append metadata to URL query params
            const url = new URL(originalUrl);

            // Add all metadata keys as query params
            if (metadata) {
                Object.entries(metadata).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        if (typeof value === 'object') {
                            url.searchParams.append(key, JSON.stringify(value));
                        } else {
                            url.searchParams.append(key, String(value));
                        }
                    }
                });
            }

            // Add a flag to indicate this came from a short link
            url.searchParams.append('utm_source', 'shortlink');

            res.redirect(url.toString());
        } catch (error) {
            console.error('Redirect error:', error);
            res.status(500).send('Internal server error');
        }
    }
}

export const linkController = new LinkController();
