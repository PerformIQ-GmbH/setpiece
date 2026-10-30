import React, { useState } from 'react';
import { Link } from 'wouter';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

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
        setError('Der Link konnte nicht angefordert werden. Prüfe deine E-Mail und versuche es erneut.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout><section className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Prüfe dein E-Mail-Postfach</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Falls für {email} ein Konto besteht, erhältst du einen Link zum Zurücksetzen.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-lg">
                  Zur Anmeldung
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-center mb-2">Passwort zurücksetzen</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
              </p>

              {error && (
                <div role="alert" className="bg-destructive/10 border border-destructive/30 text-foreground text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">E-Mail</label>
                  <input
                    type="email"
                    aria-label="E-Mail"
                  value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coach@example.com"
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-base focus:border-primary outline-none transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 rounded-lg font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Link anfordern
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Zur Anmeldung
          </Link>
        </div>
      </div>
    </section></PublicLayout>
  );
}
