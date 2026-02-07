/**
 * Attribution Service Tests
 *
 * Unit tests for attribution matching logic and confidence scoring
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as attributionService from './attribution.service';
import type { AttributionMatch, PixelSession } from '../types/attribution.types';

describe('Attribution Service', () => {
  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(attributionService.normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(attributionService.normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should handle mixed case and whitespace', () => {
      expect(attributionService.normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return high confidence for dual verification with channel match', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.9,
        pixelHasConversion: true,
        pixelUtmCompleteness: 1.0,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4HasTraffic: true,
        ga4Channel: 'facebook',
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.level).toBe('high');
      expect(result.method).toBe('dual_verified');
    });

    it('should return medium confidence for pixel match without GA4', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.8,
        pixelHasConversion: true,
        pixelUtmCompleteness: 0.8,
        pixelChannel: 'facebook',
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(85);
      expect(result.level).toBe('medium');
      expect(result.method).toBe('single_source');
    });

    it('should return low confidence for weak pixel match', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.3,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.2,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeLessThan(60);
      expect(result.level).toBe('low');
    });

    it('should return low confidence for no pixel match', () => {
      const match: AttributionMatch = {
        pixelMatch: false,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBe(0);
      expect(result.level).toBe('low');
      expect(result.method).toBe('uncertain');
    });

    it('should cap score at 50 for conflicting sources', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.9,
        pixelHasConversion: true,
        pixelUtmCompleteness: 1.0,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4Channel: 'google',
        conflictReason: 'channel_mismatch',
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeLessThanOrEqual(50);
      expect(result.level).toBe('low');
    });

    it('should give bonus for GA4 traffic alignment', () => {
      const matchWithGA4: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.8,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.6,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4HasTraffic: true,
        ga4Channel: 'facebook',
      };

      const matchWithoutGA4: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.8,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.6,
        pixelChannel: 'facebook',
        ga4Match: false,
      };

      const resultWith = attributionService.calculateConfidenceScore(matchWithGA4);
      const resultWithout = attributionService.calculateConfidenceScore(matchWithoutGA4);

      expect(resultWith.score).toBeGreaterThan(resultWithout.score);
    });

    it('should score conversion events higher', () => {
      const withConversion: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: true,
        pixelUtmCompleteness: 0.6,
        ga4Match: false,
      };

      const withoutConversion: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.6,
        ga4Match: false,
      };

      const resultWith = attributionService.calculateConfidenceScore(withConversion);
      const resultWithout = attributionService.calculateConfidenceScore(withoutConversion);

      expect(resultWith.score).toBe(resultWithout.score + 10);
    });

    it('should give points for complete UTM parameters', () => {
      const completeUtm: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: false,
        pixelUtmCompleteness: 1.0, // All 5 UTM params
        ga4Match: false,
      };

      const partialUtm: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.4, // Only 2 of 5 UTM params
        ga4Match: false,
      };

      const resultComplete = attributionService.calculateConfidenceScore(completeUtm);
      const resultPartial = attributionService.calculateConfidenceScore(partialUtm);

      expect(resultComplete.score).toBeGreaterThan(resultPartial.score);
      expect(resultComplete.score - resultPartial.score).toBeCloseTo(6, 0); // 10 * (1.0 - 0.4)
    });

    it('should handle edge case with all zeros', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBe(30); // Only base match score
      expect(result.level).toBe('low');
    });
  });

  describe('confidence level thresholds', () => {
    it('should classify 95+ as high dual_verified', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 1.0,
        pixelHasConversion: true,
        pixelUtmCompleteness: 1.0,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4HasTraffic: true,
        ga4Channel: 'facebook',
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.level).toBe('high');
      expect(result.method).toBe('dual_verified');
    });

    it('should classify 70-84 as medium', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: true,
        pixelUtmCompleteness: 0.6,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4HasTraffic: true,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(85);
      expect(result.level).toBe('medium');
    });

    it('should classify <40 as low uncertain', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.1,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('low');
      expect(result.method).toBe('uncertain');
    });
  });

  describe('attribution method classification', () => {
    it('should return dual_verified when both pixel and GA4 match', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.9,
        pixelHasConversion: true,
        pixelUtmCompleteness: 0.8,
        ga4Match: true,
        ga4HasTraffic: true,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.method).toBe('dual_verified');
    });

    it('should return single_source when only pixel matches', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.7,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.6,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.method).toBe('single_source');
    });

    it('should return uncertain when score is very low', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.1,
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.1,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.method).toBe('uncertain');
    });
  });

  describe('edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBe(30); // Only base pixel match
      expect(result.level).toBe('low');
    });

    it('should handle partial GA4 data', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.8,
        pixelUtmCompleteness: 0.8,
        ga4Match: true,
        ga4HasTraffic: true,
        // No ga4Channel provided
      };

      const result = attributionService.calculateConfidenceScore(match);

      expect(result.score).toBeGreaterThan(30);
      expect(result.score).toBeLessThan(100);
    });

    it('should round score to nearest integer', () => {
      const match: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 0.85, // Would give 17 points
        pixelHasConversion: false,
        pixelUtmCompleteness: 0.5, // Would give 5 points
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(match);

      // 30 (base) + 17 (time) + 5 (utm) = 52
      expect(result.score).toBe(52);
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('scoring component weights', () => {
    it('should weight pixel matching at 0-70 points total', () => {
      const maxPixel: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 1.0,
        pixelHasConversion: true,
        pixelUtmCompleteness: 1.0,
        ga4Match: false,
      };

      const result = attributionService.calculateConfidenceScore(maxPixel);

      // 30 + 20 + 10 + 10 = 70
      expect(result.score).toBe(70);
    });

    it('should weight GA4 validation at 0-30 points total', () => {
      const match: AttributionMatch = {
        pixelMatch: false,
        ga4Match: true,
        ga4HasTraffic: true,
        pixelChannel: 'facebook',
        ga4Channel: 'facebook',
      };

      const result = attributionService.calculateConfidenceScore(match);

      // 0 (no pixel) + 15 (GA4 base) + 15 (channel match) = 30
      expect(result.score).toBe(30);
    });

    it('should allow maximum score of 100', () => {
      const perfect: AttributionMatch = {
        pixelMatch: true,
        pixelTimeProximity: 1.0,
        pixelHasConversion: true,
        pixelUtmCompleteness: 1.0,
        pixelChannel: 'facebook',
        ga4Match: true,
        ga4HasTraffic: true,
        ga4Channel: 'facebook',
      };

      const result = attributionService.calculateConfidenceScore(perfect);

      // 70 (pixel) + 30 (GA4) = 100
      expect(result.score).toBe(100);
      expect(result.level).toBe('high');
      expect(result.method).toBe('dual_verified');
    });
  });
});

describe('Integration scenarios', () => {
  it('should handle typical successful attribution scenario', () => {
    const match: AttributionMatch = {
      pixelMatch: true,
      pixelSessionId: 'session-123',
      pixelChannel: 'facebook',
      pixelTimeProximity: 0.85, // Transaction 3.6 hours after pixel event
      pixelHasConversion: true,
      pixelUtmCompleteness: 0.8, // 4 of 5 UTM params
      ga4Match: true,
      ga4HasTraffic: true,
      ga4Channel: 'facebook',
      ga4ConversionCount: 5,
    };

    const result = attributionService.calculateConfidenceScore(match);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe('high');
    expect(result.method).toBe('dual_verified');
  });

  it('should handle transaction without pixel match', () => {
    const match: AttributionMatch = {
      pixelMatch: false,
      ga4Match: false,
    };

    const result = attributionService.calculateConfidenceScore(match);

    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
    expect(result.method).toBe('uncertain');
  });

  it('should handle conflicting channel attribution', () => {
    const match: AttributionMatch = {
      pixelMatch: true,
      pixelChannel: 'facebook',
      pixelTimeProximity: 0.9,
      pixelHasConversion: true,
      pixelUtmCompleteness: 1.0,
      ga4Match: true,
      ga4Channel: 'google',
      ga4HasTraffic: true,
      conflictReason: 'channel_mismatch',
    };

    const result = attributionService.calculateConfidenceScore(match);

    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.level).toBe('low');
  });

  it('should handle multiple pixel sessions with best match selection', () => {
    // This would be tested at integration level
    // Here we just verify that the scoring would pick the right one
    const closeSession: AttributionMatch = {
      pixelMatch: true,
      pixelTimeProximity: 0.95,
      pixelHasConversion: true,
      pixelUtmCompleteness: 0.8,
      ga4Match: false,
    };

    const farSession: AttributionMatch = {
      pixelMatch: true,
      pixelTimeProximity: 0.3,
      pixelHasConversion: false,
      pixelUtmCompleteness: 1.0,
      ga4Match: false,
    };

    const closeScore = attributionService.calculateConfidenceScore(closeSession);
    const farScore = attributionService.calculateConfidenceScore(farSession);

    expect(closeScore.score).toBeGreaterThan(farScore.score);
  });
});
