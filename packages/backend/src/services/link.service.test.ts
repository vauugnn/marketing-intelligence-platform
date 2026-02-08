import { LinkService } from './link.service';

// Mock Supabase
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockRpc = jest.fn();

const mockSupabaseAdmin = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: mockSelect }))
        })),
        insert: mockInsert,
        update: jest.fn(() => ({ eq: mockUpdate })),
    })),
    rpc: mockRpc
};

const mockSupabase = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: mockSelect }))
        }))
    }))
};

jest.mock('../config/supabase', () => ({
    supabaseAdmin: mockSupabaseAdmin,
    supabase: mockSupabase
}));

describe('LinkService', () => {
    let linkService: LinkService;

    beforeEach(() => {
        linkService = new LinkService();
        jest.clearAllMocks();
    });

    it('should generate a unique code and create short link', async () => {
        // Mock code uniqueness check (first call returns null meaning unique)
        mockSelect.mockResolvedValue({ data: null, error: null });

        // Mock insert success
        mockInsert.mockResolvedValue({ error: null });

        const result = await linkService.createShortLink('http://example.com', { foo: 'bar' });

        expect(result.code).toHaveLength(6);
        expect(result.shortUrl).toContain('/s/');
        expect(mockInsert).toHaveBeenCalled();
    });

    it('should resolve a short link', async () => {
        const mockData = {
            id: 'uuid',
            original_url: 'http://example.com',
            metadata: { foo: 'bar' }
        };

        mockSelect.mockResolvedValue({ data: mockData, error: null });

        // Mock RPC resolving successfully
        mockRpc.mockResolvedValue({ error: null });

        const result = await linkService.resolveShortLink('AbCdEf');

        expect(result).toEqual({
            originalUrl: mockData.original_url,
            metadata: mockData.metadata
        });

        // Wait for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockRpc).toHaveBeenCalledWith('increment_clicks', { row_id: 'uuid' });
    });
});
