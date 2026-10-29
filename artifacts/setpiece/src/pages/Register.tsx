import React, { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useGetCurrentAuthUser } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { clearClientSession } from '@/lib/session-cleanup';
import { safeReturnTo } from '@/lib/auth-return-to';

export default function Register() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { data: auth } = useGetCurrentAuthUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (auth?.user) {
      setLocation(returnTo);
    }
  }, [auth, setLocation, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? 'Für diese E-Mail besteht bereits ein Konto. Melde dich an oder setze das Passwort zurück.' : res.status === 400 ? 'Prüfe deine E-Mail und dein Passwort: mindestens 8 Zeichen, höchstens 72 UTF-8-Bytes.' : 'Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.');
        setLoading(false);
        return;
      }

      await clearClientSession(queryClient);
      window.location.href = returnTo;
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await clearClientSession(queryClient);
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <PublicLayout><section className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-xl font-display font-bold text-center mb-6">Kostenloses Konto erstellen</h2>

          {error && (
            <div role="alert" className="bg-destructive/10 border border-destructive/30 text-foreground text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Vorname</label>
                <input
                  type="text"
                  aria-label="Vorname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Dein Vorname"
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-base focus:border-primary outline-none transition-colors"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Nachname</label>
                <input
                  type="text"
                  aria-label="Nachname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dein Nachname"
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-base focus:border-primary outline-none transition-colors"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

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

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Passwort"
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

            <Button type="submit" className="w-full py-2.5 rounded-lg font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Konto erstellen
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">oder</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full py-2.5 rounded-lg font-medium"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Mit Google fortfahren
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Du hast bereits ein Konto?{' '}
          <Link href={`/login${returnTo !== '/dashboard' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="text-primary font-medium hover:underline">
            Anmelden
          </Link>
        </p>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            Zur Startseite
          </Link>
        </div>
      </div>
    </section></PublicLayout>
  );
}
