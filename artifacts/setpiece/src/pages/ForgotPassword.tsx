import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Move, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Move className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">SETPIECE</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for {email}, we've sent a password reset link.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-lg">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-center mb-2">Reset password</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coach@example.com"
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:border-primary outline-none transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 rounded-lg font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
