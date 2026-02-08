import { useEffect, useState } from 'react';
import { getPurchaseEvents, generatePixel, trackPixelEvent, type PixelEvent } from '../services/api';

export default function PurchaseEventsTable() {
    const [events, setEvents] = useState<PixelEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pixelId, setPixelId] = useState<string | null>(null);

    useEffect(() => {
        loadPurchaseEvents();
        loadPixelId();
    }, []);

    const loadPixelId = async () => {
        try {
            const data = await generatePixel();
            setPixelId(data.pixel_id);
        } catch (err) {
            console.error('Failed to load pixel ID:', err);
        }
    };

    const handleTestEvent = async () => {
        if (!pixelId) return;

        try {
            setLoading(true);
            await trackPixelEvent({
                pixel_id: pixelId,
                session_id: crypto.randomUUID(),
                event_type: 'purchase',
                page_url: 'http://localhost:3000/test-purchase',
                timestamp: new Date().toISOString(),
                visitor_id: `test_visitor_${Math.floor(Math.random() * 1000)}`,
                visitor_email: 'test@example.com',
                visitor_name: 'Test Customer',
                value: 99.99,
                currency: 'USD',
                metadata: {
                    source: 'dashboard_test',
                    items: ['test_item_1']
                }
            });
            await loadPurchaseEvents();
        } catch (err) {
            console.error('Failed to send test event:', err);
            setError('Failed to send test event');
        } finally {
            setLoading(false);
        }
    };

    const loadPurchaseEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPurchaseEvents(20);
            setEvents(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load purchase events');
            console.error('Error loading purchase events:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const formatCurrency = (value: number | undefined, currency: string | undefined) => {
        if (value === undefined || value === null) return 'N/A';
        const currencySymbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency || '';
        return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="glass-card overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-border/50 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Purchase Events</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track customer purchases from your pixel tracking
                    </p>
                    {pixelId && (
                        <div className="mt-2 text-xs font-mono bg-muted/50 p-1.5 rounded border border-border/50 inline-block">
                            Pixel ID: <span className="text-primary select-all">{pixelId}</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleTestEvent}
                        disabled={!pixelId || loading}
                        className="px-3 py-1.5 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Send Test Purchase
                    </button>
                    <button
                        onClick={loadPurchaseEvents}
                        className="px-3 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
                {error ? (
                    <div className="h-full flex items-center justify-center flex-col gap-4">
                        <p className="text-destructive">{error}</p>
                        <button
                            onClick={loadPurchaseEvents}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                        >
                            Retry
                        </button>
                    </div>
                ) : loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🛒</div>
                            <p className="text-muted-foreground">No purchase events yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Purchase events will appear here when customers buy from your site
                            </p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs font-semibold text-muted-foreground border-b border-border/50 bg-muted/20">
                                <th className="px-6 py-4 text-left uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-right uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-right uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {events.map((event) => (
                                <tr key={event.id} className="group hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-foreground">
                                            {event.visitor_name || 'Anonymous'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-muted-foreground font-mono">
                                            {event.visitor_email || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-sm font-semibold text-green-500">
                                            {formatCurrency(event.value, event.currency)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {event.utm_source && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit">
                                                    {event.utm_source}
                                                </span>
                                            )}
                                            {event.utm_campaign && (
                                                <span className="text-xs text-muted-foreground">
                                                    {event.utm_campaign}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm text-muted-foreground">
                                            {formatDate(event.timestamp)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
