import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const { signup, loginWithGoogle, isSigningUp, signupError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = await signup({ email, password });
      if (user) {
        // If email confirmation is disabled, user is logged in immediately
        navigate('/');
      } else {
        // Email confirmation required
        setConfirmSent(true);
      }
    } catch {
      // Error is captured in signupError
    }
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
        <div className="w-full max-w-sm">
          <Card className="border-gray-800 bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-white">Check your email</CardTitle>
              <CardDescription>
                We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                Please check your inbox to verify your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/login">
                <Button variant="outline" className="w-full border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700/50">
                  Back to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-sm">
        <Card className="border-gray-800 bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Create an account</CardTitle>
            <CardDescription>
              Enter your email below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupError && (
              <div className="mb-4 rounded-lg bg-red-950/50 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {signupError.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
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
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
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
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-xs text-gray-500 uppercase">Or continue with</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>

            <Button
              variant="outline"
              onClick={loginWithGoogle}
              className="w-full border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700/50"
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

            <p className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:underline font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
