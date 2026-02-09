import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Mail } from 'lucide-react';

type Step = 'credentials' | 'otp';

export default function Signup() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { signup, loginWithGoogle, isSigningUp, signupError } = useAuth();
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
      navigate('/dashboard', { replace: true });
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

  // --- Step 1: Credentials ---
  if (step === 'credentials') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-foreground">Create an account</CardTitle>
              <CardDescription>
                Enter your email below to create your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signupError && (
                <div className="mb-4 rounded-lg bg-destructive/20 border border-destructive/30 px-4 py-3 text-sm text-destructive">
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
                    className="border-input bg-background/50 text-foreground placeholder:text-muted-foreground"
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
                    className="border-input bg-background/50 text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full"
                >
                  {isSigningUp ? 'Creating account...' : 'Sign up'}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground uppercase">Or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                onClick={loginWithGoogle}
                className="w-full border-input bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground"
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

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Step 2: OTP verification ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otpError && (
              <div className="mb-4 rounded-lg bg-destructive/20 border border-destructive/30 px-4 py-3 text-sm text-destructive">
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
                  className="w-10 h-12 text-center text-lg font-mono font-semibold rounded-lg border border-input bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all"
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerifyOtp()}
              disabled={verifying || otpDigits.join('').length !== 6}
              className="w-full"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Didn't receive a code?{' '}
              <button
                onClick={handleResendOtp}
                className="text-primary hover:underline font-medium"
              >
                Resend
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}