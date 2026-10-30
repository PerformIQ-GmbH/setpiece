import React, { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';

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
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
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
        setError('Das Passwort konnte nicht zurückgesetzt werden. Prüfe die Passwortlänge oder fordere einen neuen Link an.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <PublicLayout><section className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <h2 className="text-xl font-display font-bold mb-4">Link ungültig</h2>
            <p className="text-sm text-muted-foreground mb-6">Dieser Link ist ungültig oder abgelaufen.</p>
            <Link href="/forgot-password">
              <Button className="w-full rounded-lg">Neuen Link anfordern</Button>
            </Link>
          </div>
        </div>
      </section></PublicLayout>
    );
  }

  return (
    <PublicLayout><section className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10 sm:py-16">
      <div className="w-full max-w-sm">

        <div className="bg-card border border-border rounded-2xl p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Passwort zurückgesetzt</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Dein Passwort wurde zurückgesetzt. Du kannst dich jetzt anmelden.
              </p>
              <Link href="/login">
                <Button className="w-full rounded-lg">Anmelden</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-center mb-2">Neues Passwort festlegen</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Gib dein neues Passwort ein.
              </p>

              {error && (
                <div role="alert" className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Neues Passwort</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      aria-label="Neues Passwort"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-base focus:border-primary outline-none transition-colors pr-10"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Passwort bestätigen</label>
                  <input
                    type="password"
                    aria-label="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort wiederholen"
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-base focus:border-primary outline-none transition-colors"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 rounded-lg font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Passwort speichern
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section></PublicLayout>
  );
}
