import { supabase, supabaseAdmin } from '../config/supabase';
import crypto from 'crypto';

export class LinkService {
    /**
     * Generate a readable random string of length n
     */
    private generateRandomCode(length: number = 6): string {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'; // Removed confusing chars like I, l, 1, O, 0
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Create a shortened link with associated metadata
     */
    async createShortLink(originalUrl: string, metadata: any, expiresInDays: number = 30): Promise<{ code: string; shortUrl: string }> {
        let code = this.generateRandomCode();
        let isUnique = false;
        let attempts = 0;

        // Ensure uniqueness
        while (!isUnique && attempts < 5) {
            const { data } = await supabaseAdmin
                .from('short_links')
                .select('id')
                .eq('code', code)
                .single();

            if (!data) {
                isUnique = true;
            } else {
                code = this.generateRandomCode();
                attempts++;
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate unique code');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const { error } = await supabaseAdmin
            .from('short_links')
            .insert({
                code,
                original_url: originalUrl,
                metadata: metadata,
                expires_at: expiresAt.toISOString()
            });

        if (error) {
            throw new Error(`Failed to create short link: ${error.message}`);
        }

        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        return {
            code,
            shortUrl: `${baseUrl}/s/${code}` // Short URL format
        };
    }

    /**
     * Resolve a short link code to the original URL and metadata
     */
    async resolveShortLink(code: string): Promise<{ originalUrl: string; metadata: any } | null> {
        const { data, error } = await supabase
            .from('short_links')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !data) {
            return null;
        }

        // Increment click count asynchronously
        // We don't await this to keep response fast
        (async () => {
            try {
                const { error } = await supabaseAdmin.rpc('increment_clicks', { row_id: data.id });
                if (error) throw error;
            } catch (err) {
                // Fallback if RPC doesn't exist
                const { data: current } = await supabaseAdmin.from('short_links').select('clicks').eq('id', data.id).single();
                if (current) {
                    await supabaseAdmin.from('short_links').update({ clicks: current.clicks + 1 }).eq('id', data.id);
                }
            }
        })();

        return {
            originalUrl: data.original_url,
            metadata: data.metadata
        };
    }
}

export const linkService = new LinkService();
