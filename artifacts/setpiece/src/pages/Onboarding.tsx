import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  useCreateTeam, useUpdateTeam, useCreatePlayer, useUpdatePlayer, useListTemplates, useCreateSetPiece, useDeleteSetPiece,
  useCreateShareLink, useCreateInvite, useUpsertAssignment, getSetPiece, getSetPieceRoleSuggestions,
} from '@workspace/api-client-react';
import type { SetPieceTemplate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Copy, LayoutTemplate, Loader2, Plus, QrCode, Share2, Shirt, Sparkles, Trash2, Trophy, UserCog, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import BrandLogo from '@/components/BrandLogo';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateDetail } from '@/components/templates/TemplateDetail';
import { TemplateMedia } from '@/components/templates/TemplateMedia';
import { STANDARD_PROFILE_TAG_OPTIONS } from '@/lib/roleSuitability';
import { KIND_LABELS, NO_FILTERS, categoryLabel, filterTemplates, recommendTemplates, sortTemplates, type Experience, type Kind } from '@/lib/templateFilters';
import {
  emptyDraft, isDraftEmpty, parsePlayers, profileDetails, suggestAssignments,
  type DraftErrors, type Foot, type PlayerDraft,
} from '@/lib/onboardingLogic';

type StepId = 'team' | 'players' | 'template' | 'roles' | 'done';
const STEPS: { id: StepId; title: string; icon: typeof Users }[] = [
  { id: 'team', title: 'Dein Team', icon: Users },
  { id: 'players', title: 'Deine Spieler', icon: Shirt },
  { id: 'template', title: 'Erster Standard', icon: LayoutTemplate },
  { id: 'roles', title: 'Rollen verteilen', icon: UserCog },
  { id: 'done', title: 'Geschafft', icon: Trophy },
];

const EXPERIENCE: { id: Experience; label: string; hint: string }[] = [
  { id: 'none', label: 'Noch keine', hint: 'Wir zeigen dir einfache Varianten.' },
  { id: 'some', label: 'Ein paar', hint: 'Einfache und mittlere Varianten.' },
  { id: 'lots', label: 'Viel', hint: 'Alle Varianten, auch anspruchsvolle.' },
];
const FOOT: { id: Foot; label: string }[] = [{ id: 'left', label: 'Links' }, { id: 'right', label: 'Rechts' }, { id: 'both', label: 'Beide' }];
const MAX_PLAYERS = 25;

const inputClass = 'min-h-11 w-full rounded-xl border border-white/[0.06] bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-primary';
const choice = (active: boolean) =>
  `min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
    active ? 'border-primary bg-primary/15 text-primary' : 'border-white/[0.08] bg-[var(--surface-2)] text-muted-foreground hover:border-white/25'
  }`;

let keyCounter = 0;
const newDraft = () => emptyDraft(`p${++keyCounter}`);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Server messages are English; coaches get what to do next. */
const LIMIT_NOUN: Record<string, string> = { players: 'Spieler', set_pieces: 'Standards (archivierte zählen mit)', share_links: 'Spielerlinks', matchdays: 'Spieltage' };

function describeError(err: unknown, fallback: string): string {
  const e = err as { status?: number; data?: { error?: string; limit?: number; entityType?: string } | null };
  if (e?.status === 403 && e.data?.error === 'Plan limit reached') {
    const noun = LIMIT_NOUN[e.data.entityType ?? ''];
    return `${noun && e.data.limit != null ? `Dein Plan erlaubt höchstens ${e.data.limit} ${noun}.` : 'Das Limit deines Plans ist erreicht.'} Du kannst später aufräumen oder auf einen grösseren Plan wechseln.`;
  }
  if (e?.status === 401) return 'Du bist abgemeldet. Bitte melde dich neu an.';
  return fallback;
}

function Rating({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold text-muted-foreground">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-pressed={value === n} aria-label={`${label} ${n} von 5`} onClick={() => onChange(value === n ? 0 : n)} className={choice(value === n)}>{n}</button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </fieldset>
  );
}

function PlayerCard({ index, draft, errors, canRemove, onChange, onRemove }: {
  index: number;
  draft: PlayerDraft;
  errors?: DraftErrors;
  canRemove: boolean;
  onChange: (patch: Partial<PlayerDraft>) => void;
  onRemove: () => void;
}) {
  const details = profileDetails(draft);
  const idp = `draft-${draft.key}`;
  return (
    <fieldset id={idp} className="space-y-3 rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] p-3.5">
      <legend className="sr-only">Spieler {index + 1}</legend>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">Spieler {index + 1}{draft.savedId && <span className="ml-2 text-xs font-medium text-primary">gespeichert</span>}</p>
        {canRemove && !draft.savedId && (
          <button type="button" onClick={onRemove} aria-label={`Spieler ${index + 1} entfernen`} className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-destructive"><Trash2 className="size-4" /></button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Vorname</span>
          <input value={draft.firstName} onChange={e => onChange({ firstName: e.target.value })} autoComplete="off" maxLength={100} className={inputClass} aria-invalid={!!errors?.name} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Nachname</span>
          <input value={draft.lastName} onChange={e => onChange({ lastName: e.target.value })} autoComplete="off" maxLength={100} className={inputClass} aria-invalid={!!errors?.name} />
        </label>
      </div>
      {errors?.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
      <div className="grid grid-cols-[5.5rem_1fr] gap-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Nummer</span>
          <input value={draft.shirtNumber} onChange={e => onChange({ shirtNumber: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" autoComplete="off" className={`${inputClass} text-center`} aria-invalid={!!errors?.shirtNumber} />
        </label>
        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold text-muted-foreground">Starker Fuss</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {FOOT.map(f => <button key={f.id} type="button" aria-pressed={draft.foot === f.id} onClick={() => onChange({ foot: draft.foot === f.id ? '' : f.id })} className={choice(draft.foot === f.id)}>{f.label}</button>)}
          </div>
        </fieldset>
      </div>
      {errors?.shirtNumber && <p role="alert" className="text-xs text-destructive">{errors.shirtNumber}</p>}

      <details className="group rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-white">
          <span className="min-w-0">
            <span className="block">Mehr Angaben</span>
            <span className={`block text-xs font-medium ${details >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              Profil {details}/5{details >= 4 ? ' · gute Rollenvorschläge möglich' : ' · Grösse, Kopfball, Tempo, Vorlieben'}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <p className="text-xs text-muted-foreground">Mit Grösse, Kopfball, Tempo und Vorlieben kann SETPIECE passende Rollen vorschlagen. Alles ist freiwillig und lässt sich später im Kader ändern.</p>
          <label className="block max-w-[10rem] space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Grösse in cm</span>
            <input value={draft.height} onChange={e => onChange({ height: e.target.value.replace(/\D/g, '').slice(0, 3) })} inputMode="numeric" autoComplete="off" placeholder="z. B. 178" className={inputClass} aria-invalid={!!errors?.height} />
          </label>
          {errors?.height && <p role="alert" className="text-xs text-destructive">{errors.height}</p>}
          <Rating label="Kopfball" hint="1 = schwach in der Luft, 5 = sehr stark" value={draft.heading} onChange={v => onChange({ heading: v })} />
          <Rating label="Tempo" hint="1 = langsam, 5 = sehr schnell" value={draft.speed} onChange={v => onChange({ speed: v })} />
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-muted-foreground">Was macht der Spieler bei Standards gern?</legend>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_PROFILE_TAG_OPTIONS.map(o => {
                const on = draft.tags.includes(o.key);
                return <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange({ tags: on ? draft.tags.filter(t => t !== o.key) : [...draft.tags, o.key] })} className={choice(on)}>{o.label}</button>;
              })}
            </div>
          </fieldset>
        </div>
      </details>
    </fieldset>
  );
}

function InviteCard({ url, loading, failed, onRetry, teamName }: { url: string; loading: boolean; failed: boolean; onRetry: () => void; teamName: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Tritt unserem Team ${teamName} in SETPIECE bei und trag deine Angaben ein (dauert eine Minute): ${url}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <section aria-labelledby="invite-title" className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15"><QrCode className="size-5 text-primary" aria-hidden="true" /></div>
        <div className="min-w-0">
          <h3 id="invite-title" className="text-sm font-bold text-white">Spieler melden sich selbst an</h3>
          <p className="mt-1 text-sm text-muted-foreground">Schick den Link in euren Teamchat oder lass den QR-Code scannen. Jeder Spieler trägt Name, Nummer, starken Fuss, Grösse, Kopfball, Tempo und seine Lieblingsaufgaben selbst ein. Du musst nichts tippen.</p>
        </div>
      </div>
      {loading && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Einladungslink wird erstellt …</p>}
      {failed && !loading && (
        <div className="mt-4 text-sm">
          <p role="alert" className="text-destructive">Der Einladungslink konnte nicht erstellt werden.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2 min-h-10" onClick={onRetry}>Nochmals versuchen</Button>
          <p className="mt-2 text-xs text-muted-foreground">Du kannst Spieler auch später unter «Spieler» einladen.</p>
        </div>
      )}
      {url && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-xl bg-white p-2.5"><QRCodeSVG value={url} size={128} aria-label="QR-Code zur Anmeldung der Spieler" /></div>
          <div className="w-full min-w-0 space-y-2">
            <p className="break-all rounded-lg bg-black/20 px-3 py-2 text-xs text-muted-foreground">{url}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={async () => { setCopied(await copyText(url)); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <><Check className="mr-1.5 size-4" /> Kopiert</> : <><Copy className="mr-1.5 size-4" /> Link kopieren</>}
              </Button>
              {canShare
                ? <Button type="button" variant="outline" className="min-h-11" onClick={() => void navigator.share({ title: 'SETPIECE', text: message, url }).catch(() => {})}><Share2 className="mr-1.5 size-4" /> Teilen</Button>
                : <Button asChild variant="outline" className="min-h-11"><a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer noopener"><Share2 className="mr-1.5 size-4" /> WhatsApp</a></Button>}
            </div>
            <p className="text-xs text-muted-foreground">Der Link gilt, bis du ihn unter «Spieler» widerrufst.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const createInvite = useCreateInvite();
  const { data: templates } = useListTemplates();
  const createSetPiece = useCreateSetPiece();
  const deleteSetPiece = useDeleteSetPiece();
  const createShareLink = useCreateShareLink();
  const upsertAssignment = useUpsertAssignment();

  const [step, setStep] = useState<StepId>('team');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [savedTeamName, setSavedTeamName] = useState('');
  const [experience, setExperience] = useState<Experience>('none');

  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFailed, setInviteFailed] = useState(false);

  const [drafts, setDrafts] = useState<PlayerDraft[]>(() => [newDraft(), newDraft()]);
  const [draftErrors, setDraftErrors] = useState<Record<string, DraftErrors>>({});
  const [players, setPlayers] = useState<{ id: string; label: string; draftKey: string }[]>([]);

  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<SetPieceTemplate | null>(null);
  const [setPieceId, setSetPieceId] = useState('');
  const [setPieceTemplateId, setSetPieceTemplateId] = useState('');
  const [roles, setRoles] = useState<{ id: string; name: string; description?: string | null }[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState('');

  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // The sticky button bar can cover a message at the end of a long step; row errors scroll to their own row instead.
  useEffect(() => {
    if (error && Object.keys(draftErrors).length === 0) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTemplate = templates?.find(t => t.id === selectedId);
  const stepIndex = STEPS.findIndex(s => s.id === step);
  const current = STEPS[stepIndex];
  const hasPlayers = players.length > 0;
  const filledRows = drafts.filter(d => !isDraftEmpty(d)).length;

  const visibleTemplates = useMemo(() => {
    const all = templates ?? [];
    return showAll ? sortTemplates(filterTemplates(all, { ...NO_FILTERS, kind })) : recommendTemplates(all, experience, kind, 6);
  }, [templates, showAll, kind, experience]);

  const goTo = (id: StepId) => {
    setError(null);
    setStep(id);
    setTimeout(() => topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
  };

  const ensureInvite = async (id: string) => {
    setInviteLoading(true);
    setInviteFailed(false);
    try {
      const invite = await createInvite.mutateAsync({ teamId: id, data: {} });
      setInviteUrl(`${window.location.origin}${import.meta.env.BASE_URL}join/${invite.token}`);
    } catch {
      setInviteFailed(true);
    } finally {
      setInviteLoading(false);
    }
  };

  const submitTeam = async () => {
    const name = teamName.trim();
    if (name.length < 2) { setError('Gib deinem Team einen Namen mit mindestens zwei Zeichen.'); return; }
    setBusy(true);
    setError(null);
    try {
      let id = teamId;
      if (!id) {
        const team = await createTeam.mutateAsync({ data: { name } });
        id = team.id;
        setTeamId(id);
        setSavedTeamName(name);
        void ensureInvite(id);
      } else if (name !== savedTeamName) {
        await updateTeam.mutateAsync({ teamId: id, data: { name } });
        setSavedTeamName(name);
      }
      goTo('players');
    } catch (err) {
      setError(describeError(err, 'Das Team konnte nicht angelegt werden. Prüfe die Verbindung und versuche es nochmals.'));
    } finally {
      setBusy(false);
    }
  };

  const submitPlayers = async () => {
    const { payloads, errors } = parsePlayers(drafts);
    setDraftErrors(errors);
    const firstBad = Object.keys(errors)[0];
    if (firstBad) {
      setError('Bitte prüfe die markierten Angaben oder lass die Zeile leer.');
      setTimeout(() => document.getElementById(`draft-${firstBad}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
      return;
    }
    setBusy(true);
    setError(null);
    const saved = [...players];
    try {
      for (const { draft, payload } of payloads) {
        const label = `${payload.firstName} ${payload.lastName}`;
        if (draft.savedId) {
          await updatePlayer.mutateAsync({ teamId, playerId: draft.savedId, data: payload });
          const at = saved.findIndex(p => p.id === draft.savedId);
          if (at >= 0) saved[at] = { ...saved[at], label };
        } else {
          const created = await createPlayer.mutateAsync({ teamId, data: payload });
          saved.push({ id: created.id, label, draftKey: draft.key });
          // From now on this row updates the stored player instead of creating a second one.
          setDrafts(prev => prev.map(d => (d.key === draft.key ? { ...d, savedId: created.id } : d)));
        }
      }
      setPlayers(saved);
      goTo('template');
    } catch (err) {
      setPlayers(saved);
      setError(describeError(err, 'Nicht alle Spieler konnten gespeichert werden. Bereits gespeicherte sind markiert. Versuche es nochmals.'));
    } finally {
      setBusy(false);
    }
  };

  const submitTemplate = async () => {
    const template = templates?.find(t => t.id === selectedId);
    if (!template) return;
    setError(null);
    if (setPieceId && setPieceTemplateId === template.id) { goTo(hasPlayers ? 'roles' : 'done'); return; }
    setBusy(true);
    try {
      // The coach changed their mind: remove the draft created a moment ago instead of leaving a second one behind.
      if (setPieceId) { await deleteSetPiece.mutateAsync({ teamId, setPieceId }); setSetPieceId(''); setAssignments({}); }
      const created = await createSetPiece.mutateAsync({ teamId, data: { title: template.title, category: template.category, templateId: template.id } });
      setSetPieceId(created.id);
      setSetPieceTemplateId(template.id);
      // The server already created the template's roles and wired the drawing to them; use those, never create them twice.
      const detailed = await getSetPiece(teamId, created.id);
      setRoles((detailed.roles ?? []).map(r => ({ id: r.id, name: r.name, description: r.description })));
      goTo(hasPlayers ? 'roles' : 'done');
    } catch (err) {
      setError(describeError(err, 'Der Standard konnte nicht angelegt werden. Bitte versuche es nochmals.'));
    } finally {
      setBusy(false);
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    setSuggestNote('');
    try {
      const res = await getSetPieceRoleSuggestions(teamId, setPieceId, {});
      const picks = suggestAssignments(res.roles.map(r => ({ roleId: r.roleId, candidates: r.candidates })));
      setAssignments(picks);
      const n = Object.keys(picks).length;
      setSuggestNote(n === 0
        ? 'Noch keine eindeutigen Vorschläge. Mit Fuss, Grösse, Kopfball und Tempo der Spieler klappt das besser. Du kannst Rollen auch von Hand verteilen.'
        : `${n} von ${roles.length} Rollen vorgeschlagen. Prüfe sie und ändere, was nicht passt.`);
    } catch {
      setSuggestNote('Der Vorschlag ist gerade nicht möglich. Verteile die Rollen von Hand.');
    } finally {
      setSuggesting(false);
    }
  };

  const submitRoles = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const [roleId, playerId] of Object.entries(assignments)) {
        if (playerId) await upsertAssignment.mutateAsync({ teamId, setPieceId, data: { roleId, playerId } });
      }
      goTo('done');
    } catch (err) {
      setError(describeError(err, 'Die Zuweisung konnte nicht gespeichert werden. Bitte versuche es nochmals.'));
    } finally {
      setBusy(false);
    }
  };

  const copyPlayerLink = async () => {
    setError(null);
    try {
      let url = shareUrl;
      if (!url) {
        const link = await createShareLink.mutateAsync({ teamId, data: {} });
        url = `${window.location.origin}${import.meta.env.BASE_URL}p/${link.token}`;
        setShareUrl(url);
      }
      setShareCopied(await copyText(url));
      setTimeout(() => setShareCopied(false), 2500);
    } catch (err) {
      setError(describeError(err, 'Der Spielerlink konnte nicht erstellt werden. Du findest ihn später beim Standard im Editor.'));
    }
  };

  const wide = step === 'template';
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
        <BrandLogo />
        {teamId && step !== 'done' && (
          <button type="button" onClick={() => navigate(`/teams/${teamId}`)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-white">Später fortsetzen</button>
        )}
      </header>

      <main className="flex flex-1 justify-center px-4 py-6 sm:py-10">
        <div ref={topRef} className={`w-full ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
          <ol className="mb-6 flex items-center justify-center gap-1.5" aria-label={`Schritt ${stepIndex + 1} von ${STEPS.length}`}>
            {STEPS.map((s, i) => {
              const skipped = s.id === 'roles' && (stepIndex > i) && !hasPlayers;
              const done = i < stepIndex && !skipped;
              return (
                <li key={s.id} className="flex items-center gap-1.5" aria-current={i === stepIndex ? 'step' : undefined}>
                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done ? 'bg-primary text-primary-foreground' : i === stepIndex ? 'border-2 border-primary bg-primary/20 text-primary' : 'border border-border bg-secondary text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="size-4" aria-label="erledigt" /> : skipped ? '–' : i + 1}
                  </span>
                  {i < STEPS.length - 1 && <span className={`h-px w-4 sm:w-6 ${done ? 'bg-primary' : 'bg-border'}`} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <Card className="rounded-2xl border-white/[0.06] bg-[var(--surface-1)]">
                <CardContent className="p-4 sm:p-7">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><current.icon className="size-5 text-primary" aria-hidden="true" /></div>
                    <h1 className="font-display text-xl font-bold text-white">{current.title}</h1>
                  </div>

                  {step === 'team' && (
                    <div className="space-y-6">
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-white">Wie heisst dein Team?</span>
                        <input autoFocus value={teamName} onChange={e => setTeamName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submitTeam(); }}
                          placeholder="z. B. FC Beispiel U15" maxLength={255} className={inputClass} />
                        <span className="block text-xs text-muted-foreground">Den Namen kannst du jederzeit ändern.</span>
                      </label>
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-white">Wie viel Erfahrung habt ihr mit einstudierten Standards?</legend>
                        <div className="grid grid-cols-3 gap-2">
                          {EXPERIENCE.map(e => <button key={e.id} type="button" aria-pressed={experience === e.id} onClick={() => setExperience(e.id)} className={choice(experience === e.id)}>{e.label}</button>)}
                        </div>
                        <p className="text-xs text-muted-foreground">{EXPERIENCE.find(e => e.id === experience)?.hint} Das hilft nur bei der Auswahl, du kannst später alles sehen.</p>
                      </fieldset>
                    </div>
                  )}

                  {step === 'players' && (
                    <div className="space-y-5">
                      <p className="text-sm text-muted-foreground">Spieler brauchst du, um ihnen Rollen zuzuweisen. <strong className="text-white">Dieser Schritt ist freiwillig.</strong> Du kannst ihn überspringen und Spieler später im Kader hinzufügen oder einladen.</p>
                      <InviteCard url={inviteUrl} loading={inviteLoading} failed={inviteFailed} teamName={savedTeamName} onRetry={() => void ensureInvite(teamId)} />
                      <section aria-labelledby="own-players" className="space-y-3">
                        <div>
                          <h2 id="own-players" className="text-sm font-bold text-white">Oder trag ein paar Schlüsselspieler selbst ein</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">Name genügt. Je mehr du ausfüllst, desto besser werden die Rollenvorschläge.</p>
                        </div>
                        {drafts.map((d, i) => (
                          <PlayerCard key={d.key} index={i} draft={d} errors={draftErrors[d.key]} canRemove={drafts.length > 1}
                            onChange={patch => setDrafts(prev => prev.map(x => (x.key === d.key ? { ...x, ...patch } : x)))}
                            onRemove={() => setDrafts(prev => prev.filter(x => x.key !== d.key))} />
                        ))}
                        <Button type="button" variant="outline" className="min-h-11 w-full border-dashed" disabled={drafts.length >= MAX_PLAYERS} onClick={() => setDrafts(prev => [...prev, newDraft()])}>
                          <Plus className="mr-2 size-4" /> Weiteren Spieler hinzufügen
                        </Button>
                      </section>
                    </div>
                  )}

                  {step === 'template' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Starte mit einer bewährten Variante. Du siehst die echte Szene und die Zeichnung. Alles lässt sich im Editor an dein Team anpassen.</p>
                      <div role="group" aria-label="Art" className="flex flex-wrap gap-1.5">
                        {(['all', ...(Object.keys(KIND_LABELS) as Kind[])] as const).map(k => (
                          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={choice(kind === k)}>{k === 'all' ? 'Alle' : KIND_LABELS[k]}</button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {showAll ? 'Alle Vorlagen, einfache zuerst.' : `Passend zu «${EXPERIENCE.find(e => e.id === experience)?.label} Erfahrung»: Varianten mit echter Szene zuerst.`}{' '}
                        <button type="button" onClick={() => setShowAll(v => !v)} className="font-semibold text-primary hover:underline">{showAll ? 'Nur Empfehlungen zeigen' : 'Alle Vorlagen zeigen'}</button>
                      </p>
                      {templates === undefined && <p role="status" className="py-6 text-center text-sm text-muted-foreground">Vorlagen werden geladen …</p>}
                      {templates && visibleTemplates.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Keine Vorlage in dieser Auswahl. <button type="button" className="font-semibold text-primary" onClick={() => { setKind('all'); setShowAll(true); }}>Alle zeigen</button></p>}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" role="group" aria-label="Vorlagen">
                        {visibleTemplates.map(t => (
                          <TemplateCard key={t.id} template={t} onOpen={setDetail} onUse={x => setSelectedId(x.id)} useLabel="Wählen" selected={selectedId === t.id} />
                        ))}
                      </div>
                      <div className="pt-1 text-center">
                        <button type="button" disabled={busy} onClick={() => goTo('done')} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-white">Ohne Vorlage fortfahren</button>
                      </div>
                    </div>
                  )}

                  {step === 'roles' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Wer übernimmt welche Rolle in «{selectedTemplate?.title}»? Du kannst das später im Editor ändern.</p>
                      <Button type="button" variant="outline" className="min-h-11 w-full border-primary/40 text-primary" onClick={() => void suggest()} disabled={suggesting}>
                        {suggesting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />} Rollen automatisch vorschlagen
                      </Button>
                      {suggestNote && <p role="status" className="rounded-lg bg-white/[0.04] p-3 text-sm text-muted-foreground">{suggestNote}</p>}
                      <ul className="space-y-2.5">
                        {roles.map(role => (
                          <li key={role.id} className="rounded-xl border border-white/[0.06] bg-[var(--surface-2)] p-3">
                            <label className="block space-y-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary">{role.name}</span>
                              {role.description && <span className="block text-xs text-muted-foreground">{role.description}</span>}
                              <select value={assignments[role.id] ?? ''} onChange={e => setAssignments(prev => ({ ...prev, [role.id]: e.target.value }))} className={`${inputClass} mt-1`}>
                                <option value="">Noch offen</option>
                                {players.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                              </select>
                            </label>
                          </li>
                        ))}
                        {roles.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Diese Vorlage hat keine Rollen. Du legst sie im Editor an.</li>}
                      </ul>
                    </div>
                  )}

                  {step === 'done' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-lg font-bold text-white">«{savedTeamName}» ist bereit</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hasPlayers ? `${players.length} Spieler` : 'Noch keine Spieler'}{selectedTemplate && setPieceId ? ` · erster Standard «${selectedTemplate.title}»` : ' · noch kein Standard'}
                        </p>
                      </div>

                      {selectedTemplate && setPieceId && (
                        <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                          <div className="aspect-video w-full"><TemplateMedia template={selectedTemplate} /></div>
                          <div className="space-y-1 p-4">
                            <p className="font-bold text-white">{selectedTemplate.title}</p>
                            <p className="text-xs text-muted-foreground">{categoryLabel(selectedTemplate.category)}</p>
                            <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Noch nicht für Spieler sichtbar. Öffne den Standard, prüfe ihn und wähle im Editor «Für Spieler veröffentlichen» (auf dem Handy im Menü).</p>
                          </div>
                        </div>
                      )}

                      {!hasPlayers && inviteUrl && (
                        <InviteCard url={inviteUrl} loading={false} failed={false} teamName={savedTeamName} onRetry={() => undefined} />
                      )}

                      <div className="grid gap-2.5">
                        {setPieceId && <Button type="button" className="min-h-12 text-base" onClick={() => navigate(`/teams/${teamId}/set-pieces/${setPieceId}/editor`)}>Standard öffnen <ArrowRight className="ml-2 size-4" /></Button>}
                        {setPieceId && <Button type="button" variant="outline" className="min-h-11" onClick={() => void copyPlayerLink()}>{shareCopied ? <><Check className="mr-2 size-4" /> Spielerlink kopiert</> : <><Copy className="mr-2 size-4" /> Spielerlink kopieren</>}</Button>}
                        <Button type="button" variant={setPieceId ? 'ghost' : 'default'} className="min-h-11" onClick={() => navigate(setPieceId ? `/teams/${teamId}` : `/teams/${teamId}/templates`)}>
                          {setPieceId ? 'Zum Team-Dashboard' : 'Vorlagen ansehen'}
                        </Button>
                      </div>
                      {setPieceId && <p className="text-xs text-muted-foreground">Der Spielerlink zeigt jedem Spieler seine Rolle, die Zeichnung und, wenn vorhanden, die echte Szene, sobald du den Standard veröffentlicht hast.</p>}
                    </div>
                  )}

                  {error && <div ref={errorRef} role="alert" className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

                  {step !== 'done' && (
                    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-2 border-t border-border bg-[var(--surface-1)]/95 px-4 pb-1 pt-4 backdrop-blur sm:-mx-7 sm:px-7">
                      <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" disabled={busy || step === 'team'}
                        onClick={() => goTo(step === 'players' ? 'team' : step === 'template' ? 'players' : 'template')}>
                        <ArrowLeft className="mr-2 size-4" /> Zurück
                      </Button>
                      <Button type="button" className="min-h-11" disabled={busy || (step === 'team' && teamName.trim().length < 2) || (step === 'template' && !selectedId)}
                        onClick={() => void (step === 'team' ? submitTeam() : step === 'players' ? submitPlayers() : step === 'template' ? submitTemplate() : submitRoles())}>
                        {busy ? <><Loader2 className="mr-2 size-4 animate-spin" /> Einen Moment …</> : (
                          <>{step === 'players' && filledRows === 0 && players.length === 0 ? 'Überspringen' : step === 'roles' ? 'Fertigstellen' : 'Weiter'}<ArrowRight className="ml-2 size-4" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <TemplateDetail template={detail} onClose={() => setDetail(null)} onUse={t => { setSelectedId(t.id); setDetail(null); }} useLabel="Diese Vorlage wählen" />
    </div>
  );
}
