import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { BusinessType } from '@shared/types';
import { ShoppingCart, Globe, CheckCircle, ArrowRight } from 'lucide-react';

type Step = 'select' | 'confirm';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSelect = async (type: BusinessType) => {
    setSelected(type);
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { business_type: type },
      });
      if (error) throw error;
      // Refresh the auth cache so ProtectedRoute sees the new metadata
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        queryClient.setQueryData(['auth', 'user'], {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at ?? '',
          user_metadata: session.user.user_metadata,
        });
      }
      setStep('confirm');
    } catch (err) {
      console.error('Failed to save business type:', err);
      setSaving(false);
    }
  };

  // Auto-redirect after confirmation
  useEffect(() => {
    if (step !== 'confirm') return;
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [step, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        {step === 'select' && (
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              How do you use your website?
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              This helps us show you the right metrics and labels.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sales card */}
              <button
                onClick={() => handleSelect('sales')}
                disabled={saving}
                className="group relative rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  I sell products or services online
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track purchases, revenue, and ROI across your marketing channels
                </p>
                <ArrowRight className="absolute top-6 right-5 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Leads card */}
              <button
                onClick={() => handleSelect('leads')}
                disabled={saving}
                className="group relative rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  I drive leads and traffic
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track signups, campaign performance, and visitor attribution
                </p>
                <ArrowRight className="absolute top-6 right-5 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {saving && (
              <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">You're all set!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {selected === 'sales'
                ? 'Your dashboard is configured for e-commerce — tracking purchases, revenue, and ROI.'
                : 'Your dashboard is configured for lead generation — tracking signups, conversions, and campaign performance.'}
            </p>
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="text-sm text-primary hover:underline"
            >
              Go to dashboard now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
