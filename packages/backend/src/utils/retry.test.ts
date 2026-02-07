import { withRetry, sleep } from './retry';

// Mock the logger to avoid console output during tests
jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Retry Utilities', () => {
    describe('sleep', () => {
        it('should wait for the specified duration', async () => {
            const start = Date.now();
            await sleep(100);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some timing variance
            expect(elapsed).toBeLessThan(200);
        });
    });

    describe('withRetry', () => {
        it('should return result on first successful call', async () => {
            const fn = jest.fn().mockResolvedValue('success');

            const result = await withRetry(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on 429 status and eventually succeed', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce({ response: { status: 429 } })
                .mockResolvedValueOnce('success');

            const result = await withRetry(fn, { baseDelayMs: 10, maxRetries: 2 });

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should retry on 500 status', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce({ response: { status: 500 } })
                .mockResolvedValueOnce('success');

            const result = await withRetry(fn, { baseDelayMs: 10, maxRetries: 2 });

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should throw after max retries exceeded', async () => {
            const error = { response: { status: 429 } };
            const fn = jest.fn().mockRejectedValue(error);

            await expect(
                withRetry(fn, { baseDelayMs: 10, maxRetries: 2 })
            ).rejects.toEqual(error);

            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should not retry on non-retryable status codes', async () => {
            const error = { response: { status: 400 } };
            const fn = jest.fn().mockRejectedValue(error);

            await expect(withRetry(fn)).rejects.toEqual(error);

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should not retry on 401 unauthorized', async () => {
            const error = { response: { status: 401 } };
            const fn = jest.fn().mockRejectedValue(error);

            await expect(withRetry(fn)).rejects.toEqual(error);

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should respect Retry-After header', async () => {
            const error = {
                response: {
                    status: 429,
                    headers: { 'retry-after': '1' }, // 1 second
                },
            };
            const fn = jest.fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce('success');

            const start = Date.now();
            await withRetry(fn, { maxRetries: 1 });
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(900); // ~1 second
        });

        it('should use custom retryable status codes', async () => {
            const error = { response: { status: 503 } };
            const fn = jest.fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce('success');

            const result = await withRetry(fn, {
                baseDelayMs: 10,
                retryableStatusCodes: [503],
            });

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });
});
