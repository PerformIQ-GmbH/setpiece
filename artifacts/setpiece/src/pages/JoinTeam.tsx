import { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetJoinInfo, useJoinTeam, getGetJoinInfoQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react';
import { STANDARD_PROFILE_TAG_OPTIONS } from '@/lib/roleSuitability';

const FOOT_OPTIONS = [
  { value: 'left', label: 'Links' }, { value: 'right', label: 'Rechts' }, { value: 'both', label: 'Beide' },
] as const;
type Foot = (typeof FOOT_OPTIONS)[number]['value'];
type ProfileTag = (typeof STANDARD_PROFILE_TAG_OPTIONS)[number]['key'];

const choiceClass = (active: boolean) =>
  `min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
    active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200' : 'bg-[#141b2d] border-gray-700 text-gray-300 hover:border-gray-500'
  }`;

function Rating({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs text-gray-400 uppercase font-bold tracking-wider">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-pressed={value === n} aria-label={`${label} ${n} von 5`} onClick={() => onChange(n)} className={choiceClass(value === n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-500">{hint}</p>
    </fieldset>
  );
}

export default function JoinTeam() {
  const [, params] = useRoute('/join/:token');
  const token = params?.token || '';

  const { data: teamInfo, isLoading, error } = useGetJoinInfo(token, { query: { queryKey: getGetJoinInfoQueryKey(token), enabled: !!token, retry: false } });
  const joinTeam = useJoinTeam();

  const [form, setForm] = useState({
    firstName: '', lastName: '', shirtNumber: '', height: '',
    dominantFoot: '' as Foot | '', heading: 0, speed: 0, tags: [] as ProfileTag[],
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const profileComplete = !!form.dominantFoot && !!form.height && form.heading > 0 && form.speed > 0 && form.tags.length > 0;
  const toggleTag = (tag: ProfileTag) =>
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (!profileComplete || !form.dominantFoot) return;
    try {
      await joinTeam.mutateAsync({
        token,
        data: {
          firstName: form.firstName,
          lastName: form.lastName,
          shirtNumber: form.shirtNumber ? parseInt(form.shirtNumber) : undefined,
          dominantFoot: form.dominantFoot,
          height: parseInt(form.height),
          // Spieler wählen 1-5, das Profil rechnet mit 1-10 wie bei den Trainerwerten.
          headingStrength: form.heading * 2,
          speed: form.speed * 2,
          tags: form.tags,
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
          <p className="text-xs text-gray-500 text-center">Schritt {step} von 2</p>
          {step === 1 ? (<>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="join-first" className="text-xs text-gray-400 uppercase font-bold tracking-wider">Vorname</label>
              <input
                id="join-first" required autoFocus
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Max"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="join-last" className="text-xs text-gray-400 uppercase font-bold tracking-wider">Nachname</label>
              <input
                id="join-last" required
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Muster"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="join-number" className="text-xs text-gray-400 uppercase font-bold tracking-wider">Trikotnummer</label>
            <input
              id="join-number" type="number" inputMode="numeric" min={1} max={99}
              value={form.shirtNumber}
              onChange={e => setForm({ ...form, shirtNumber: e.target.value })}
              className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
              placeholder="10"
            />
          </div>
          </>) : (<>
          <div>
            <h2 className="text-base font-bold text-white">Dein Standard-Profil</h2>
            <p className="text-xs text-gray-400">Damit dein Trainer dir die passende Rolle bei Ecken und Freistössen geben kann. Dauert etwa 30 Sekunden.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="join-height" className="text-xs text-gray-400 uppercase font-bold tracking-wider">Grösse (cm)</label>
              <input
                id="join-height" required type="number" inputMode="numeric" min={100} max={230} autoFocus
                value={form.height}
                onChange={e => setForm({ ...form, height: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="178"
              />
            </div>
            <fieldset className="space-y-1">
              <legend className="text-xs text-gray-400 uppercase font-bold tracking-wider">Starker Fuss</legend>
              <div className="grid grid-cols-3 gap-1">
                {FOOT_OPTIONS.map(f => (
                  <button key={f.value} type="button" aria-pressed={form.dominantFoot === f.value} onClick={() => setForm({ ...form, dominantFoot: f.value })} className={`${choiceClass(form.dominantFoot === f.value)} px-1 text-xs`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <Rating label="Kopfball" hint="1 = schwach, 5 = sehr stark" value={form.heading} onChange={v => setForm({ ...form, heading: v })} />
          <Rating label="Tempo" hint="1 = langsam, 5 = sehr schnell" value={form.speed} onChange={v => setForm({ ...form, speed: v })} />

          <fieldset className="space-y-1">
            <legend className="text-xs text-gray-400 uppercase font-bold tracking-wider">Was machst du bei Standards gern?</legend>
            <p className="text-[11px] text-gray-500">Mindestens eine Rolle wählen, mehrere möglich.</p>
            <div className="flex flex-wrap gap-2">
              {STANDARD_PROFILE_TAG_OPTIONS.map(o => (
                <button key={o.key} type="button" aria-pressed={form.tags.includes(o.key)} onClick={() => toggleTag(o.key)} className={choiceClass(form.tags.includes(o.key))}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
          </>)}

          {joinTeam.isError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              Fehler beim Beitreten. Bitte versuche es nochmal.
            </div>
          )}

          <Button type="submit" className="w-full min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={joinTeam.isPending || (step === 2 && !profileComplete)}>
            {joinTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {step === 1 ? 'Weiter' : 'Dem Kader beitreten'}
          </Button>
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="w-full min-h-11 text-sm text-gray-400 hover:text-white">
              Zurück
            </button>
          )}

          <p className="text-[10px] text-gray-500 text-center leading-relaxed">
            Deine Daten werden nur für die Kaderverwaltung deines Teams verwendet.
          </p>
        </form>
      </div>
    </div>
  );
}
