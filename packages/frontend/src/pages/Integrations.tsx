import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useToastStore } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart3,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  ChevronDown,
  ChevronRight,
  Code,
  HelpCircle,
  Loader2,
  Zap,
  Globe,
  ShoppingBag,
  FileCode,
} from 'lucide-react';
import {
  GoogleAnalyticsLogo,
  MetaLogo,
  GoogleAdsLogo,
  StripeLogo,
  PayPalLogo,
  HubSpotLogo,
  MailchimpLogo,
} from '../components/icons/PlatformLogos';

// ---------------------------------------------------------------------------
// Platform configuration
// ---------------------------------------------------------------------------

type PlatformConfig = {
  name: string;
  description: string;
  logo: React.FC<{ className?: string }>;
  color: string;
  category: 'analytics' | 'advertising' | 'payments' | 'crm' | 'email';
};

const platformConfig: Record<string, PlatformConfig> = {
  google_analytics_4: {
    name: 'Google Analytics 4',
    description: 'Website traffic & conversions',
    logo: GoogleAnalyticsLogo,
    color: 'bg-gray-800',
    category: 'analytics',
  },
  meta: {
    name: 'Meta',
    description: 'Ad spend, reach & conversions',
    logo: MetaLogo,
    color: 'bg-gray-800',
    category: 'advertising',
  },
  google_ads: {
    name: 'Google Ads',
    description: 'Ad performance & spend',
    logo: GoogleAdsLogo,
    color: 'bg-gray-800',
    category: 'advertising',
  },
  stripe: {
    name: 'Stripe',
    description: 'Payments & revenue',
    logo: StripeLogo,
    color: 'bg-gray-800',
    category: 'payments',
  },
  paypal: {
    name: 'PayPal',
    description: 'Payment history',
    logo: PayPalLogo,
    color: 'bg-gray-800',
    category: 'payments',
  },
  hubspot: {
    name: 'HubSpot',
    description: 'CRM & pipeline data',
    logo: HubSpotLogo,
    color: 'bg-gray-800',
    category: 'crm',
  },
  mailchimp: {
    name: 'Mailchimp',
    description: 'Email campaigns',
    logo: MailchimpLogo,
    color: 'bg-gray-800',
    category: 'email',
  },
};

// ---------------------------------------------------------------------------
// Troubleshooting data
// ---------------------------------------------------------------------------

const troubleshootingItems = [
  {
    question: 'My platform shows "Error" status',
    answer:
      'This usually means your access token has expired. Click "Reconnect" to re-authorize. If the issue persists, disconnect and reconnect the platform.',
    icon: AlertCircle,
  },
  {
    question: 'Data sync seems stuck',
    answer:
      'Initial syncs can take up to 24 hours depending on your data volume. If the progress bar has not moved in over an hour, try disconnecting and reconnecting.',
    icon: Clock,
  },
  {
    question: 'My tracking pixel is not collecting data',
    answer:
      "Verify the snippet is in your site's <head> tag. Open your browser's Network tab and look for requests to the pixel endpoint. Ensure no ad blockers are interfering.",
    icon: Code,
  },
  {
    question: "Revenue data doesn't match my payment platform",
    answer:
      'We sync data every 6 hours. Recent transactions may not appear immediately. Currency conversions may also cause small discrepancies.',
    icon: CreditCard,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; label: string; text: string; bg: string }> = {
    connected: { dot: 'bg-green-400', label: 'Connected', text: 'text-green-300', bg: 'bg-green-500/10' },
    disconnected: { dot: 'bg-gray-500', label: 'Not connected', text: 'text-gray-400', bg: 'bg-gray-500/10' },
    error: { dot: 'bg-red-400', label: 'Error', text: 'text-red-300', bg: 'bg-red-500/10' },
    pending: { dot: 'bg-yellow-400', label: 'Pending', text: 'text-yellow-300', bg: 'bg-yellow-500/10' },
  };
  const s = config[status] || config.disconnected;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot, status === 'pending' && 'animate-pulse')} />
      {s.label}
    </span>
  );
}

function SyncProgressBar({ progress }: { progress: number }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Syncing...
        </span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function GettingStartedWalkthrough({
  hasPixel,
  connectedCount,
}: {
  hasPixel: boolean;
  connectedCount: number;
}) {
  const steps = [
    {
      title: 'Install your tracking pixel',
      description: 'Add the JavaScript snippet to your website.',
      icon: Code,
      completed: hasPixel,
    },
    {
      title: 'Connect an analytics platform',
      description: 'Link GA4 to cross-verify attribution data.',
      icon: BarChart3,
      completed: connectedCount >= 1,
    },
    {
      title: 'Connect a payment platform',
      description: 'Link Stripe or PayPal to match revenue.',
      icon: CreditCard,
      completed: connectedCount >= 2,
    },
  ];

  return (
    <div className="mb-6 integration-section rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-blue-400" />
        <h3 className="text-base font-bold text-blue-300">Getting Started</h3>
      </div>
      <p className="text-blue-400/70 text-xs mb-4">Complete these steps to unlock marketing intelligence</p>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {step.completed ? (
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border border-gray-600 bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400">
                    {index + 1}
                  </div>
                )}
                {index < steps.length - 1 && (
                  <div className={cn('w-px h-4 mt-1', step.completed ? 'bg-green-500/30' : 'bg-gray-700')} />
                )}
              </div>
              <div className={cn('flex-1', step.completed && 'opacity-50')}>
                <div className="flex items-center gap-1.5">
                  <StepIcon className="w-3.5 h-3.5 text-gray-500" />
                  <h4 className={cn('font-medium text-xs', step.completed ? 'line-through text-gray-500' : 'text-gray-200')}>
                    {step.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TroubleshootingSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-300">Troubleshooting</h3>
      </div>
      <div className="integration-section rounded-xl divide-y divide-gray-800/50">
        {troubleshootingItems.map((item, index) => {
          const isOpen = openIndex === index;
          const ItemIcon = item.icon;
          return (
            <div key={index}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                )}
                <ItemIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-400">{item.question}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pl-14">
                  <p className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3">{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformCardSkeleton() {
  return (
    <div className="integration-card p-4 rounded-xl animate-pulse flex flex-col">
      <div className="w-10 h-10 bg-white/5 rounded-lg mb-3" />
      <div className="h-4 bg-white/5 rounded w-24 mb-2" />
      <div className="h-3 bg-white/5 rounded w-32" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Integrations() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixelData, setPixelData] = useState<any>(null);
  const [showPixelCode, setShowPixelCode] = useState(false);
  const [installTab, setInstallTab] = useState<'wordpress' | 'shopify' | 'manual'>('wordpress');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    loadIntegrations();
    loadOrGeneratePixel();
  }, []);

  const loadIntegrations = async () => {
    try {
      const result = await api.getIntegrations();
      if (Array.isArray(result)) {
        setPlatforms(result);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrGeneratePixel = async () => {
    try {
      const result = await api.generatePixel();
      if (result) {
        setPixelData(result);
      }
    } catch (error) {
      console.error('Failed to generate pixel:', error);
    }
  };

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    // Log user intent to connect a platform (helpful for debugging & analytics)
    console.info('User initiated connect for platform:', platformId);

    try {
      const result = await api.connectPlatform(platformId);

      // API returns the platform-specific payload in `data` (not a wrapper with `success`)
      // For OAuth flows we expect: { type: 'oauth', authUrl }
      // For API-key flows we expect: { type: 'api_key', message }
      if (!result || !result.type) {
        console.error('Unexpected connect response for', platformId, result);
        addToast('Unexpected response from server. See console for details.', 'error');
        return;
      }

      if (result.type === 'oauth' && result.authUrl) {
        addToast(`Redirecting to ${platformConfig[platformId]?.name || platformId} for authorization...`, 'info');
        // open the provider's OAuth URL (this will redirect the whole app)
        console.info('Redirecting user to OAuth URL:', result.authUrl);
        window.location.href = result.authUrl;
        return; // navigation will occur
      }

      if (result.type === 'api_key') {
        addToast(result.message || `Provide API key for ${platformId}`, 'info');
      }
    } catch (error: any) {
      console.error('Connect failed for', platformId, error);
      const msg = error?.message || 'Failed to connect. Please try again.';
      addToast(msg, 'error');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      const result = await api.disconnectPlatform(platformId);
      if (result.success) {
        addToast(`Disconnected from ${platformConfig[platformId]?.name || platformId}`, 'info');
        setPlatforms((prev) => prev.map((p) => (p.platform === platformId ? { ...p, ...result.data } : p)));
      }
    } catch (error) {
      addToast('Failed to disconnect. Please try again.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  const connectedCount = platforms.filter((p) => p.status === 'connected').length;
  const hasPixel = !!pixelData;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <style>{`
        .integration-card {
          background-color: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .integration-card:hover {
          transform: translateY(-2px);
          border-color: hsl(var(--primary) / 0.5);
          box-shadow: 0 10px 20px -10px hsl(var(--primary) / 0.2);
        }

        .integration-card-error {
          border-color: hsl(var(--destructive) / 0.3);
        }

        .integration-card-error:hover {
          border-color: hsl(var(--destructive) / 0.5);
        }

        .integration-section {
          background-color: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
        }
      `}</style>

      <div className="p-4 md:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Integrations
          </h2>
          <p className="text-muted-foreground text-sm">Connect your marketing tools to get started</p>
        </div>

        {/* Getting Started Walkthrough */}
        {!loading && connectedCount === 0 && (
          <GettingStartedWalkthrough hasPixel={hasPixel} connectedCount={connectedCount} />
        )}

        {/* Tracking Pixel - Critical First Step */}
        <div className="mb-6 integration-section rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Your Tracking Pixel</h3>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">Install this on your website to track customer journeys</p>
            </div>
            <span className="bg-primary/20 text-primary text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0">
              Required
            </span>
          </div>

          {pixelData && (
            <div className="mt-3">
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Pixel ID</span>
                  <code className="bg-primary/10 px-2.5 py-0.5 rounded text-primary font-mono text-xs break-all">
                    {pixelData.pixel_id}
                  </code>
                </div>

                <button
                  onClick={() => setShowPixelCode(!showPixelCode)}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium"
                >
                  {showPixelCode ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {showPixelCode ? 'Hide' : 'Show'} installation guide
                </button>

                {showPixelCode && (
                  <div className="mt-3 space-y-3">
                    {/* Platform tabs */}
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { key: 'wordpress' as const, label: 'WordPress', icon: Globe },
                        { key: 'shopify' as const, label: 'Shopify', icon: ShoppingBag },
                        { key: 'manual' as const, label: 'Manual', icon: FileCode },
                      ]).map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setInstallTab(tab.key)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${installTab === tab.key
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                            }`}
                          >
                            <TabIcon className="w-3.5 h-3.5" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Wrapped snippet used by all tabs */}
                    {(() => {
                      const wrappedSnippet = `<!-- Intelligence Platform Pixel -->\n${pixelData.snippet}\n<!-- End Intelligence Platform Pixel -->`;
                      const snippetBlock = (
                        <div className="relative">
                          <pre className="bg-muted text-muted-foreground p-3 rounded-lg overflow-x-auto text-xs border border-border">
                            <code>{wrappedSnippet}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(wrappedSnippet)}
                            className="absolute top-1.5 right-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-0.5 rounded text-xs flex items-center gap-1"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            Copy
                          </button>
                        </div>
                      );

                      return (
                        <>
                    {/* WordPress tab */}
                    {installTab === 'wordpress' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">1</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-1.5">Copy the code snippet</h4>
                            {snippetBlock}
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">2</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Open your header scripts</h4>
                            <p className="text-xs text-muted-foreground">
                              If you have a header scripts plugin (like <strong className="text-foreground">Insert Headers and Footers</strong> or <strong className="text-foreground">WPCode</strong>), go to <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">Settings &gt; Insert Headers and Footers</code>. This is the same place where you added your Google Analytics or Meta Pixel code.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">3</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Paste next to your existing tracking codes</h4>
                            <p className="text-xs text-muted-foreground">
                              Paste the snippet in the <strong className="text-foreground">Scripts in Header</strong> section, right below your existing GA4 or Meta Pixel code, and click <strong className="text-foreground">Save</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">4</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Verify installation</h4>
                            <p className="text-xs text-muted-foreground">
                              Visit your website, open the browser <strong className="text-foreground">Network</strong> tab (F12), and look for pixel requests. Data appears within minutes.
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted/50 border border-border rounded-lg p-2.5 ml-8">
                          <p className="text-xs text-muted-foreground">
                            No plugin? You can also paste the snippet in <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">Appearance &gt; Theme Editor &gt; header.php</code> — find your GA4/Meta code and paste it right below, before the <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">&lt;/head&gt;</code> tag.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shopify tab */}
                    {installTab === 'shopify' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">1</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-1.5">Copy the code snippet</h4>
                            {snippetBlock}
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">2</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Open theme.liquid</h4>
                            <p className="text-xs text-muted-foreground">
                              Go to <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">Online Store &gt; Themes &gt; ... &gt; Edit code</code>, then open <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">theme.liquid</code> from the Layout section. This is the same file where your Google Analytics or Meta Pixel code lives.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">3</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Paste next to your existing tracking codes</h4>
                            <p className="text-xs text-muted-foreground">
                              Find your GA4 or Meta Pixel code (look for <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">&lt;!-- Facebook Pixel Code --&gt;</code> or similar comments), and paste the snippet right below it, before <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">&lt;/head&gt;</code>. Click <strong className="text-foreground">Save</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">4</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Verify installation</h4>
                            <p className="text-xs text-muted-foreground">
                              Visit your storefront, open the browser <strong className="text-foreground">Network</strong> tab (F12), and look for pixel requests. Data appears within minutes.
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted/50 border border-border rounded-lg p-2.5 ml-8">
                          <p className="text-xs text-muted-foreground">
                            Lightweight script (&lt;5KB) — sits alongside your existing tracking codes. No impact on store performance.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Manual tab */}
                    {installTab === 'manual' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">1</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-1.5">Copy the code snippet</h4>
                            {snippetBlock}
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">2</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Add to your website</h4>
                            <p className="text-xs text-muted-foreground">
                              Paste the snippet in your site's{' '}
                              <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">&lt;head&gt;</code>{' '}
                              tag, before the closing <code className="bg-primary/10 px-1 py-0.5 rounded text-primary text-xs">&lt;/head&gt;</code>.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">3</div>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-foreground mb-0.5">Verify installation</h4>
                            <p className="text-xs text-muted-foreground">
                              Check browser Network tab for pixel requests. Data appears within minutes.
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted/50 border border-border rounded-lg p-2.5 ml-8">
                          <p className="text-xs text-muted-foreground">
                            Lightweight script (&lt;5KB) — tracks page views, UTM parameters, and customer journeys.
                          </p>
                        </div>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Platform Integrations */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Platform Connections</h3>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {connectedCount}/{platforms.length} connected
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlatformCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {platforms.map((platform) => {
              const config = platformConfig[platform.platform] || {
                name: platform.platform,
                description: '',
                logo: BarChart3,
                color: 'bg-muted',
                category: 'analytics' as const,
              };
              const Logo = config.logo;
              const isConnected = platform.status === 'connected';
              const isError = platform.status === 'error';
              const isPending = platform.status === 'pending';
              const isConnecting = connectingPlatform === platform.platform;

              return (
                <div
                  key={platform.platform}
                  className={cn(
                    'integration-card p-4 rounded-xl flex flex-col',
                    isError && 'integration-card-error'
                  )}
                >
                  {/* Icon + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center p-1.5', 'bg-muted')}>
                      <Logo className="w-full h-full text-foreground" />
                    </div>
                    <StatusBadge status={platform.status} />
                  </div>

                  {/* Name + Description */}
                  <h3 className="font-semibold text-sm text-foreground mb-0.5">{config.name}</h3>
                  <p className="text-muted-foreground text-xs mb-2">{config.description}</p>

                  {/* Last synced / Error */}
                  <div className="flex-1">
                    {platform.last_synced_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(platform.last_synced_at), { addSuffix: true })}
                      </p>
                    )}
                    {isError && (
                      <p className="text-xs text-destructive/80 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Try reconnecting
                      </p>
                    )}
                    {platform.sync_progress != null && <SyncProgressBar progress={platform.sync_progress} />}
                  </div>

                  {/* Action button */}
                  <div className="mt-3 pt-2 border-t border-border">
                    {isConnected || isError ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleConnect(platform.platform)}
                          disabled={isConnecting}
                          className="flex-1 px-2 py-2 sm:py-1.5 rounded-lg font-medium text-xs bg-muted text-foreground hover:bg-muted/80 active:bg-muted/60 transition-colors disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <span className="flex items-center justify-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                            </span>
                          ) : (
                            'Reconnect'
                          )}
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform.platform)}
                          className="px-2 py-2 sm:py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : isPending ? (
                      <button
                        disabled
                        className="w-full px-2 py-2 sm:py-1.5 rounded-lg font-medium text-xs bg-yellow-500/10 text-yellow-500 cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Setting up...
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.platform)}
                        disabled={isConnecting}
                        className="w-full px-2 py-2 sm:py-1.5 rounded-lg font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <span className="flex items-center justify-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </span>
                        ) : (
                          'Connect'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Troubleshooting */}
        <TroubleshootingSection />
      </div>
    </div>
  );
}