import React, { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Move, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Move className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-white">SETPIECE</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <h2 className="text-xl font-display font-bold mb-4">Invalid Reset Link</h2>
            <p className="text-sm text-muted-foreground mb-6">This reset link is invalid or has expired.</p>
            <Link href="/forgot-password">
              <Button className="w-full rounded-lg">Request New Link</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Password Reset</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been reset successfully. You can now sign in.
              </p>
              <Link href="/login">
                <Button className="w-full rounded-lg">Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-center mb-2">Set new password</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your new password below.
              </p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:border-primary outline-none transition-colors pr-10"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:border-primary outline-none transition-colors"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 rounded-lg font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
