import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { ShoppingCart, Globe, ArrowRight, CheckCircle, Mail } from 'lucide-react';
import type { BusinessType } from '@shared/types';
import { Network } from 'lucide-react';

type Step = 'credentials' | 'otp' | 'business-type';

export default function Signup() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { signup, loginWithGoogle, isSigningUp, signupError } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Step 1: Create account
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signup({ email, password });
      setStep('otp');
    } catch {
      // Error captured in signupError
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (code?: string) => {
    const token = code ?? otpDigits.join('');
    if (token.length !== 6) return;
    setVerifying(true);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      setStep('business-type');
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setOtpError(null);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend code.');
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value.slice(-1);
    setOtpDigits(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    const code = next.join('');
    if (code.length === 6) {
      handleVerifyOtp(code);
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  // Step 3: Select business type
  const handleSelectType = async (type: BusinessType) => {
    setSavingType(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { business_type: type },
      });
      if (error) throw error;
      // Refresh auth cache
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        queryClient.setQueryData(['auth', 'user'], {
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at ?? '',
          user_metadata: session.user.user_metadata,
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to save business type:', err);
      setSavingType(false);
    }
  };

  // --- Step 1: Credentials ---
  if (step === 'credentials') {
    return (
      <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex flex-col justify-between bg-zinc-900 text-white p-12 relative overflow-hidden">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-secondary/20 blur-[100px]" />
            <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc763f] to-[#e05a2b] flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Network className="w-5 h-5 text-white" />
              </div>
              Neuralys
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-3xl font-medium leading-tight text-white mb-4">
                "The insights we get from this platform are invaluable. It's the competitive edge we needed."
              </p>
              <footer className="text-lg text-zinc-400">
                Alex Chen, VP of Growth at StartupX
              </footer>
            </blockquote>
          </div>

          <div className="relative z-10 text-sm text-zinc-500">
            © {new Date().getFullYear()} Neuralys. All rights reserved.
          </div>
        </div>

        {/* Right Panel - Signup Form */}
        <div className="flex items-center justify-center bg-background px-4 py-8 h-full overflow-auto">
          <div className="w-full max-w-[400px] flex flex-col justify-center space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                {signupError && (
                  <div className="mb-4 rounded-lg bg-destructive/15 text-destructive border border-destructive/20 px-4 py-3 text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    {signupError.message}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 bg-background"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full h-11 font-medium text-base shadow-sm bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    {isSigningUp ? 'Creating account...' : 'Sign up'}
                  </Button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={loginWithGoogle}
                  className="w-full h-11 bg-background hover:bg-muted font-normal text-muted-foreground hover:text-foreground"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </Button>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-secondary hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 2: OTP verification ---
  if (step === 'otp') {
    return (
      <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
        {/* Left Panel - Branding (Reuse) */}
        <div className="hidden lg:flex flex-col justify-between bg-zinc-900 text-white p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-secondary/20 blur-[100px]" />
            <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[100px]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground">M</span>
              </div>
              Marketing Intelligence Platform
            </div>
          </div>
          <div className="relative z-10 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-3xl font-medium leading-tight text-white mb-4">
                "The insights we get from this platform are invaluable."
              </p>
              <footer className="text-lg text-zinc-400">
                Alex Chen, VP of Growth at StartupX
              </footer>
            </blockquote>
          </div>
          <div className="relative z-10 text-sm text-zinc-500">
            © {new Date().getFullYear()} Marketing Intelligence Platform.
          </div>
        </div>

        {/* Right Panel - OTP Form */}
        <div className="flex items-center justify-center bg-background px-4 py-8 h-full overflow-auto">
          <div className="w-full max-w-[400px] flex flex-col justify-center space-y-6">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                <Mail className="w-6 h-6 text-secondary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                {otpError && (
                  <div className="mb-4 rounded-lg bg-destructive/15 text-destructive border border-destructive/20 px-4 py-3 text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    {otpError}
                  </div>
                )}

                <div className="flex justify-center gap-2 mb-6">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      disabled={verifying}
                      autoFocus={i === 0}
                      className="w-10 h-12 text-center text-lg font-mono font-semibold rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-50 transition-all shadow-sm"
                    />
                  ))}
                </div>

                <Button
                  onClick={() => handleVerifyOtp()}
                  disabled={verifying || otpDigits.join('').length !== 6}
                  className="w-full h-11 font-medium text-base shadow-sm bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </Button>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Didn't receive a code?{' '}
                  <button
                    onClick={handleResendOtp}
                    className="text-secondary hover:underline font-medium"
                  >
                    Resend
                  </button>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3: Business type selection ---
  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-secondary/20 blur-[100px]" />
          <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[100px]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <span className="text-secondary-foreground">M</span>
            </div>
            Marketing Intelligence Platform
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-2">
            <p className="text-3xl font-medium leading-tight text-white mb-4">
              "The insights we get from this platform are invaluable."
            </p>
            <footer className="text-lg text-zinc-400">
              Alex Chen, VP of Growth at StartupX
            </footer>
          </blockquote>
        </div>
        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} Marketing Intelligence Platform.
        </div>
      </div>

      {/* Right Panel - Business Type */}
      <div className="flex items-center justify-center bg-background px-4 py-8 h-full overflow-auto">
        <div className="w-full max-w-xl text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-4">
            Welcome! One last thing...
          </h1>
          <p className="text-muted-foreground text-base mb-10 max-w-md mx-auto">
            How do you use your website? This helps us show you the right metrics.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <button
              onClick={() => handleSelectType('sales')}
              disabled={savingType}
              className="group relative rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                I sell products or services online
              </h3>
              <p className="text-sm text-muted-foreground">
                Track purchases, revenue, and ROI across your marketing channels
              </p>
              <ArrowRight className="absolute top-6 right-5 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => handleSelectType('leads')}
              disabled={savingType}
              className="group relative rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-500" />
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

          {savingType && (
            <div className="mt-8 flex items-center justify-center gap-3 text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              Setting up your dashboard...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
