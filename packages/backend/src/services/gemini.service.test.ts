/**
 * Gemini Service Tests
 *
 * Unit tests for AI recommendation generation logic
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock supabase to avoid env var requirement (loaded via synergy.service)
jest.mock('../config/supabase', () => ({
  supabase: { from: jest.fn() },
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../config/gemini', () => ({
  getGeminiClient: jest.fn(),
  GEMINI_MODEL: 'test-model',
  generationConfig: {},
}));

import {
    calculateROI,
    calculatePerformanceRating,
    normalizeChannelName,
    buildRecommendationPrompt,
    generateFallbackRecommendations,
    type ChannelPerformance,
    type ChannelSynergy,
} from './gemini.service';

describe('Gemini Service', () => {
    describe('calculateROI', () => {
        it('should calculate positive ROI correctly', () => {
            expect(calculateROI(35000, 5000)).toBe(600);
        });

        it('should calculate negative ROI correctly', () => {
            expect(calculateROI(2000, 4000)).toBe(-50);
        });

        it('should return Infinity for zero spend with revenue', () => {
            expect(calculateROI(12000, 0)).toBe(Infinity);
        });

        it('should return Infinity for zero spend and zero revenue', () => {
            expect(calculateROI(0, 0)).toBe(Infinity);
        });

        it('should handle break-even (100% ROI)', () => {
            expect(calculateROI(10000, 5000)).toBe(100);
        });
    });

    describe('calculatePerformanceRating', () => {
        it('should return Exceptional for 1000%+ ROI', () => {
            expect(calculatePerformanceRating(1200, 5000)).toBe('Exceptional');
        });

        it('should return Exceptional for zero spend with revenue', () => {
            expect(calculatePerformanceRating(Infinity, 0)).toBe('Exceptional');
        });

        it('should return Excellent for 500-999% ROI', () => {
            expect(calculatePerformanceRating(600, 5000)).toBe('Excellent');
        });

        it('should return Satisfactory for 200-499% ROI', () => {
            expect(calculatePerformanceRating(300, 5000)).toBe('Satisfactory');
        });

        it('should return Poor for 0-199% ROI', () => {
            expect(calculatePerformanceRating(150, 5000)).toBe('Poor');
        });

        it('should return Failing for negative ROI', () => {
            expect(calculatePerformanceRating(-50, 5000)).toBe('Failing');
        });
    });

    describe('normalizeChannelName', () => {
        it('should normalize facebook variations', () => {
            expect(normalizeChannelName('facebook')).toBe('Facebook');
            expect(normalizeChannelName('fb')).toBe('Facebook');
            expect(normalizeChannelName('meta')).toBe('Facebook');
            expect(normalizeChannelName('FACEBOOK')).toBe('Facebook');
        });

        it('should normalize google variations', () => {
            expect(normalizeChannelName('google')).toBe('Google Ads');
            expect(normalizeChannelName('google ads')).toBe('Google Ads');
            expect(normalizeChannelName('adwords')).toBe('Google Ads');
        });

        it('should normalize email platforms', () => {
            expect(normalizeChannelName('mailchimp')).toBe('Email');
            expect(normalizeChannelName('hubspot')).toBe('Email');
            expect(normalizeChannelName('email')).toBe('Email');
        });

        it('should title-case unknown channels', () => {
            expect(normalizeChannelName('TikTok')).toBe('Tiktok');
        });
    });

    describe('buildRecommendationPrompt', () => {
        const samplePerformance: ChannelPerformance[] = [
            { channel: 'Facebook', revenue: 35000, spend: 5000, roi: 600, conversions: 20, performance_rating: 'excellent' },
            { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
        ];

        const sampleSynergies: ChannelSynergy[] = [
            { channel_a: 'Facebook', channel_b: 'Email', synergy_score: 5.0, frequency: 45, confidence: 80 },
        ];

        it('should include channel performance data', () => {
            const prompt = buildRecommendationPrompt(samplePerformance, sampleSynergies);
            expect(prompt).toContain('Facebook');
            expect(prompt).toContain('Revenue');
            expect(prompt).toContain('35,000');
        });

        it('should include synergy data', () => {
            const prompt = buildRecommendationPrompt(samplePerformance, sampleSynergies);
            expect(prompt).toContain('Facebook + Email');
            expect(prompt).toContain('Synergy Score 5');
        });

        it('should request JSON format', () => {
            const prompt = buildRecommendationPrompt(samplePerformance, sampleSynergies);
            expect(prompt).toContain('JSON');
            expect(prompt).toContain('"recommendations"');
        });

        it('should include recommendation type definitions', () => {
            const prompt = buildRecommendationPrompt(samplePerformance, sampleSynergies);
            expect(prompt).toContain('scale');
            expect(prompt).toContain('optimize');
            expect(prompt).toContain('stop');
        });
    });

    describe('generateFallbackRecommendations', () => {
        const userId = 'test-user';

        it('should generate scale recommendation for exceptional channel', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);

            expect(recommendations.length).toBeGreaterThanOrEqual(1);
            expect(recommendations[0].type).toBe('scale');
            expect(recommendations[0].channel).toBe('Email');
        });

        it('should generate optimize recommendation for satisfactory channel', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Google Ads', revenue: 25000, spend: 8000, roi: 212, conversions: 15, performance_rating: 'satisfactory' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);

            expect(recommendations.some(r => r.type === 'optimize')).toBe(true);
        });

        it('should generate stop recommendation for failing channel', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'failing' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);

            expect(recommendations.some(r => r.type === 'stop')).toBe(true);
            expect(recommendations.find(r => r.type === 'stop')?.channel).toBe('Instagram Ads');
        });

        it('should include synergy recommendation when available', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Facebook', revenue: 35000, spend: 5000, roi: 600, conversions: 20, performance_rating: 'excellent' },
            ];
            const synergies: ChannelSynergy[] = [
                { channel_a: 'Facebook', channel_b: 'Email', synergy_score: 5.0, frequency: 45, confidence: 80 },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, synergies);

            expect(recommendations.some(r => r.channel.includes('+'))).toBe(true);
        });

        it('should limit channel recommendations to 3 and add synergy recs separately', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
                { channel: 'Facebook', revenue: 35000, spend: 5000, roi: 600, conversions: 20, performance_rating: 'excellent' },
                { channel: 'Google Ads', revenue: 25000, spend: 8000, roi: 212, conversions: 15, performance_rating: 'satisfactory' },
                { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'failing' },
            ];
            const synergies: ChannelSynergy[] = [
                { channel_a: 'Facebook', channel_b: 'Email', synergy_score: 5.0, frequency: 45, confidence: 80 },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, synergies);

            // 3 channel recs (exceptional, satisfactory, failing) + 1 synergy rec
            const channelRecs = recommendations.filter(r => !r.channel.includes('+'));
            expect(channelRecs.length).toBeLessThanOrEqual(3);
            expect(recommendations.length).toBe(4);
        });

        it('should set correct confidence scores', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);

            recommendations.forEach(rec => {
                expect(rec.confidence_score).toBeGreaterThanOrEqual(0);
                expect(rec.confidence_score).toBeLessThanOrEqual(100);
            });
        });

        it('should set correct priorities', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'failing' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);
            const stopRec = recommendations.find(r => r.type === 'stop');

            expect(stopRec?.priority).toBe('high');
        });

        it('should include estimated impact', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'failing' },
            ];

            const recommendations = generateFallbackRecommendations(userId, performance, []);
            const stopRec = recommendations.find(r => r.type === 'stop');

            expect(stopRec?.estimated_impact).toBe(4000); // Should equal spend
        });
    });

    describe('recommendation validation', () => {
        it('should have all required fields', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
            ];

            const recommendations = generateFallbackRecommendations('test-user', performance, []);

            recommendations.forEach(rec => {
                expect(rec.user_id).toBeDefined();
                expect(rec.type).toBeDefined();
                expect(rec.channel).toBeDefined();
                expect(rec.action).toBeDefined();
                expect(rec.reason).toBeDefined();
                expect(rec.estimated_impact).toBeDefined();
                expect(rec.confidence_score).toBeDefined();
                expect(rec.priority).toBeDefined();
                expect(rec.is_active).toBe(true);
            });
        });

        it('should have valid type values', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
                { channel: 'Google Ads', revenue: 25000, spend: 8000, roi: 212, conversions: 15, performance_rating: 'satisfactory' },
                { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'failing' },
            ];

            const recommendations = generateFallbackRecommendations('test-user', performance, []);

            recommendations.forEach(rec => {
                expect(['scale', 'optimize', 'stop']).toContain(rec.type);
            });
        });

        it('should have valid priority values', () => {
            const performance: ChannelPerformance[] = [
                { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'exceptional' },
            ];

            const recommendations = generateFallbackRecommendations('test-user', performance, []);

            recommendations.forEach(rec => {
                expect(['high', 'medium', 'low']).toContain(rec.priority);
            });
        });
    });
});
