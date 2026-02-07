import { getHistoricalDateRange, formatDateYMD, toUnixTimestamp, splitDateRange } from './date';

describe('Date Utilities', () => {
    describe('getHistoricalDateRange', () => {
        it('should return a date range of 90 days by default', () => {
            const result = getHistoricalDateRange();
            const startDate = new Date(result.startDate);
            const endDate = new Date(result.endDate);

            const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(90);
        });

        it('should return a date range of specified days', () => {
            const result = getHistoricalDateRange(30);
            const startDate = new Date(result.startDate);
            const endDate = new Date(result.endDate);

            const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(30);
        });

        it('should return ISO string format', () => {
            const result = getHistoricalDateRange();
            expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('formatDateYMD', () => {
        it('should format date as YYYY-MM-DD', () => {
            const date = new Date('2026-02-07T12:00:00Z');
            expect(formatDateYMD(date)).toBe('2026-02-07');
        });

        it('should handle different dates correctly', () => {
            const date = new Date('2025-12-25T00:00:00Z');
            expect(formatDateYMD(date)).toBe('2025-12-25');
        });
    });

    describe('toUnixTimestamp', () => {
        it('should convert Date to Unix timestamp in seconds', () => {
            const date = new Date('2026-01-01T00:00:00Z');
            const expected = Math.floor(date.getTime() / 1000);
            expect(toUnixTimestamp(date)).toBe(expected);
        });

        it('should return integer value', () => {
            const date = new Date('2026-02-07T13:45:30.123Z');
            const result = toUnixTimestamp(date);
            expect(Number.isInteger(result)).toBe(true);
        });
    });

    describe('splitDateRange', () => {
        it('should split 90-day range into chunks of 31 days', () => {
            const startDate = new Date('2025-11-09T00:00:00Z');
            const endDate = new Date('2026-02-07T00:00:00Z');

            const chunks = splitDateRange(startDate, endDate, 31);

            expect(chunks.length).toBe(3); // 90 days / 31 = ~3 chunks
        });

        it('should handle range smaller than chunk size', () => {
            const startDate = new Date('2026-02-01T00:00:00Z');
            const endDate = new Date('2026-02-07T00:00:00Z');

            const chunks = splitDateRange(startDate, endDate, 31);

            expect(chunks.length).toBe(1);
            expect(chunks[0].start.getTime()).toBe(startDate.getTime());
            expect(chunks[0].end.getTime()).toBe(endDate.getTime());
        });

        it('should not overlap chunks', () => {
            const startDate = new Date('2025-11-09T00:00:00Z');
            const endDate = new Date('2026-02-07T00:00:00Z');

            const chunks = splitDateRange(startDate, endDate, 31);

            for (let i = 1; i < chunks.length; i++) {
                expect(chunks[i].start.getTime()).toBeGreaterThanOrEqual(chunks[i - 1].end.getTime());
            }
        });
    });
});
