import { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetJoinInfo, useJoinTeam, getGetJoinInfoQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react';

const FOOT_OPTIONS = ['right', 'left', 'both'] as const;

export default function JoinTeam() {
  const [, params] = useRoute('/join/:token');
  const token = params?.token || '';

  const { data: teamInfo, isLoading, error } = useGetJoinInfo(token, { query: { queryKey: getGetJoinInfoQueryKey(token), enabled: !!token, retry: false } });
  const joinTeam = useJoinTeam();

  const [form, setForm] = useState({
    firstName: '', lastName: '', shirtNumber: '', dominantFoot: 'right' as string,
  });
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinTeam.mutateAsync({
        token,
        data: {
          firstName: form.firstName,
          lastName: form.lastName,
          shirtNumber: form.shirtNumber ? parseInt(form.shirtNumber) : undefined,
          dominantFoot: (form.dominantFoot as 'left' | 'right' | 'both') || undefined,
        },
      });
      setSubmitted(true);
    } catch {
    }
  };

  const errorStatus = (error as { status?: number })?.status;
  const isGone = errorStatus === 410;
  const isNotFound = errorStatus === 404;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isNotFound || isGone) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {isGone ? 'Einladung abgelaufen' : 'Einladung ungültig'}
          </h1>
          <p className="text-sm text-gray-400">
            {isGone
              ? 'Dieser Einladungslink ist nicht mehr gültig. Bitte frage deinen Trainer nach einem neuen Link.'
              : 'Dieser Link existiert nicht. Bitte prüfe den Link oder frage deinen Trainer.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Erfolgreich beigetreten!</h1>
          <p className="text-sm text-gray-400">
            Du wurdest zum Kader von <span className="text-emerald-400 font-semibold">{teamInfo?.teamName}</span> hinzugefügt.
            Dein Trainer kann dich jetzt den Standardsituationen zuweisen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Team beitreten</p>
          <h1 className="text-2xl font-bold text-white font-display">{teamInfo?.teamName}</h1>
          {teamInfo?.clubName && (
            <p className="text-sm text-gray-400 mt-1">{teamInfo.clubName}</p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Vorname</label>
              <input
                required autoFocus
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Max"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Nachname</label>
              <input
                required
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Muster"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Trikotnummer</label>
              <input
                type="number" min={1} max={99}
                value={form.shirtNumber}
                onChange={e => setForm({ ...form, shirtNumber: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Starker Fuss</label>
              <select
                value={form.dominantFoot}
                onChange={e => setForm({ ...form, dominantFoot: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
              >
                {FOOT_OPTIONS.map(f => (
                  <option key={f} value={f}>
                    {f === 'right' ? 'Rechts' : f === 'left' ? 'Links' : 'Beide'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {joinTeam.isError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              Fehler beim Beitreten. Bitte versuche es nochmal.
            </div>
          )}

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={joinTeam.isPending}>
            {joinTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Dem Kader beitreten
          </Button>

          <p className="text-[10px] text-gray-500 text-center leading-relaxed">
            Deine Daten werden nur für die Kaderverwaltung deines Teams verwendet.
          </p>
        </form>
      </div>
    </div>
  );
}
