import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { useGetTeam, useGetReadinessDashboard, useListMatchdays, useListSetPieces, useGetMatchday } from '@workspace/api-client-react';
import type { ReadinessDashboardPlayersItem, PlayerReadinessStatus } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Users, Filter, BellRing, Printer, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function computeWorstStatus(readiness: PlayerReadinessStatus[]): string {
  if (readiness.length === 0) return 'not_opened';
  const leastReadyFirst = ['not_opened', 'needs_review', 'opened', 'passed'];
  for (const status of leastReadyFirst) {
    if (readiness.some(r => r.status === status)) return status;
  }
  return 'not_opened';
}

export default function Readiness() {
  const [, params] = useRoute('/teams/:teamId/readiness');
  const teamId = params?.teamId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: readiness, isLoading } = useGetReadinessDashboard(teamId);
  const { data: matchdays } = useListMatchdays(teamId);
  const { data: setPieces } = useListSetPieces(teamId);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [setPieceFilter, setSetPieceFilter] = useState<string>('all');
  const [matchdayFilter, setMatchdayFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<ReadinessDashboardPlayersItem | null>(null);

  const setPieceTitleById = (id: string) => setPieces?.find(sp => sp.id === id)?.title || 'Untitled set piece';

  const { data: selectedMatchday } = useGetMatchday(teamId, matchdayFilter !== 'all' ? matchdayFilter : '__none__');

  const summary = readiness?.summary;
  const allPlayers = readiness?.players || [];

  const filteredPlayers = allPlayers.filter((entry: ReadinessDashboardPlayersItem) => {
    const p = entry.player;
    const r = entry.readiness || [];

    if (statusFilter !== 'all' && !r.some(rd => rd.status === statusFilter)) return false;

    if (setPieceFilter !== 'all') {
      const hasMatch = r.some(rd => rd.setPieceId === setPieceFilter);
      if (!hasMatch && setPieceFilter !== 'none') return false;
    }

    if (matchdayFilter !== 'all' && selectedMatchday) {
      const mdSetPieceIds = selectedMatchday.setPieces?.map((sp: { id: string }) => sp.id) || [];
      const hasMatchday = r.some(rd => mdSetPieceIds.includes(rd.setPieceId));
      if (!hasMatchday) return false;
    }

    if (searchTerm) {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      if (!fullName.includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const jsPDFMod = await import('jspdf');
      const jsPDF = jsPDFMod.default;

      // A4 landscape dimensions (mm).
      const PW = 297;
      const PH = 210;
      const MARGIN = 14;
      const FOOTER_H = 10;
      const brandGreen: [number, number, number] = [16, 185, 129];
      const inkDark: [number, number, number] = [20, 28, 22];

      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

      const teamName = team?.name || 'Team';
      const generatedStamp = new Date().toLocaleString();
      const dateLabel = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });

      // White background + brand stripe at top (mirrors MatchdayDetail).
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PW, PH, 'F');
      pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.rect(0, 0, PW, 3, 'F');

      // Header.
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.setFontSize(11);
      pdf.text('SETPIECE  ·  by PerformIQ', MARGIN, 16);

      pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      pdf.setFontSize(24);
      pdf.text(teamName, MARGIN, 30);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(110, 110, 110);
      pdf.text('Readiness Overview', MARGIN, 38);
      pdf.setFontSize(10);
      pdf.text(dateLabel, MARGIN, 45);

      // Table columns.
      const cols = [
        { label: 'Player', x: MARGIN, w: 90 },
        { label: 'Status', x: MARGIN + 90, w: 45 },
        { label: 'Ready', x: MARGIN + 135, w: 35 },
        { label: 'Last Opened', x: MARGIN + 170, w: 45 },
        { label: 'Views', x: MARGIN + 215, w: 30 },
      ];

      let y = 56;
      pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.rect(MARGIN, y - 6, PW - MARGIN * 2, 9, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      cols.forEach(c => pdf.text(c.label, c.x + 2, y));
      y += 9;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      filteredPlayers.forEach((entry: ReadinessDashboardPlayersItem, idx: number) => {
        const p = entry.player;
        const r = entry.readiness || [];
        const worstStatus = computeWorstStatus(r);
        const readyCount = r.filter(rd => rd.status === 'opened' || rd.status === 'passed').length;
        const totalViews = r.reduce((sum, rd) => sum + (rd.viewCount || 0), 0);
        const lastOpened = r.reduce((latest: string | null, rd) => {
          if (!rd.lastOpenedAt) return latest;
          if (!latest) return rd.lastOpenedAt;
          return rd.lastOpenedAt > latest ? rd.lastOpenedAt : latest;
        }, null);

        if (y > PH - FOOTER_H - 8) {
          pdf.addPage('a4', 'l');
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, PW, PH, 'F');
          pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
          pdf.rect(0, 0, PW, 3, 'F');
          y = 24;
        }

        if (idx % 2 === 1) {
          pdf.setFillColor(244, 247, 245);
          pdf.rect(MARGIN, y - 5, PW - MARGIN * 2, 8, 'F');
        }

        const name = `${p.shirtNumber ? `#${p.shirtNumber}  ` : ''}${p.firstName} ${p.lastName}`;
        pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
        pdf.text(pdf.splitTextToSize(name, cols[0].w - 4)[0], cols[0].x + 2, y);
        pdf.setTextColor(60, 60, 60);
        pdf.text(worstStatus.replace(/_/g, ' '), cols[1].x + 2, y);
        pdf.text(`${readyCount}/${r.length} ready`, cols[2].x + 2, y);
        pdf.text(lastOpened ? new Date(lastOpened).toLocaleDateString() : 'Never', cols[3].x + 2, y);
        pdf.text(String(totalViews), cols[4].x + 2, y);
        y += 8;
      });

      if (filteredPlayers.length === 0) {
        pdf.setTextColor(120, 120, 120);
        pdf.text('No readiness data available.', MARGIN + 2, y);
      }

      // Footer on every page.
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(MARGIN, PH - FOOTER_H, PW - MARGIN, PH - FOOTER_H);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`Generated ${generatedStamp}`, MARGIN, PH - FOOTER_H + 5);
        pdf.text(`Page ${i} of ${pageCount}`, PW - MARGIN, PH - FOOTER_H + 5, { align: 'right' });
      }

      pdf.save(`${teamName.replace(/\s+/g, '-')}-readiness.pdf`);
    } catch (err) {
      console.error('Failed to export readiness PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Readiness Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Track player preparation across set pieces</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: summary.total, icon: Users, color: 'text-foreground', bg: 'bg-secondary/30', filter: 'all' },
            { label: 'Not Opened', value: summary.notOpened, icon: EyeOff, color: 'text-zinc-400', bg: 'bg-zinc-500/10', filter: 'not_opened' },
            { label: 'Opened', value: summary.opened, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', filter: 'opened' },
            { label: 'Passed', value: summary.passed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filter: 'passed' },
            { label: 'Needs Review', value: summary.needsReview, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', filter: 'needs_review' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button
                onClick={() => setStatusFilter(s.filter === statusFilter ? 'all' : s.filter)}
                className="w-full text-left"
              >
                <Card className={`border-border ${s.bg} ${statusFilter === s.filter && s.filter !== 'all' ? 'ring-1 ring-primary' : ''} transition-all cursor-pointer hover:ring-1 hover:ring-primary/50`}>
                  <CardContent className="p-4 text-center">
                    <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-white/[0.06] rounded-xl text-sm focus:border-primary outline-none"
          />
        </div>
        {setPieces && setPieces.length > 0 && (
          <select
            value={setPieceFilter}
            onChange={e => setSetPieceFilter(e.target.value)}
            className="bg-[var(--surface-2)] border border-white/[0.06] rounded-xl px-3 py-2 text-sm focus:border-primary outline-none text-muted-foreground"
          >
            <option value="all">All Set Pieces</option>
            {setPieces.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.title}</option>
            ))}
          </select>
        )}
        {matchdays && matchdays.length > 0 && (
          <select
            value={matchdayFilter}
            onChange={e => setMatchdayFilter(e.target.value)}
            className="bg-[var(--surface-2)] border border-white/[0.06] rounded-xl px-3 py-2 text-sm focus:border-primary outline-none text-muted-foreground"
          >
            <option value="all">All Matchdays</option>
            {matchdays.map(md => (
              <option key={md.id} value={md.id}>{md.title}</option>
            ))}
          </select>
        )}
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="border-white/[0.06] bg-[var(--surface-2)] rounded-xl"
        >
          {isExporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
          ) : (
            <><Printer className="w-4 h-4 mr-2" /> Print / Export</>
          )}
        </Button>
      </div>

      {/* Mobile: card list (below md) */}
      <div className="md:hidden space-y-3">
        {filteredPlayers.map((entry: ReadinessDashboardPlayersItem, idx: number) => {
          const p = entry.player;
          const r = entry.readiness || [];
          const worstStatus = computeWorstStatus(r);
          const readyCount = r.filter(rd => rd.status === 'opened' || rd.status === 'passed').length;
          const lastOpened = r.reduce((latest: string | null, rd) => {
            if (!rd.lastOpenedAt) return latest;
            if (!latest) return rd.lastOpenedAt;
            return rd.lastOpenedAt > latest ? rd.lastOpenedAt : latest;
          }, null);

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-xs font-bold text-primary shrink-0">{p.shirtNumber || '?'}</div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white block truncate">{p.firstName} {p.lastName}</span>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {p.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[8px] px-1 py-0 rounded bg-primary/10 text-primary/70">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <StatusBadge status={worstStatus} />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>{readyCount}/{r.length} ready</span>
                <span>{lastOpened ? new Date(lastOpened).toLocaleDateString() : 'Never opened'}</span>
              </div>
            </motion.div>
          );
        })}
        {filteredPlayers.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] px-4 py-8 text-center text-muted-foreground text-sm">
            {allPlayers.length === 0 ? 'No readiness data available.' : 'No players match your filters.'}
          </div>
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <div className="hidden md:block rounded-2xl border border-white/[0.06] bg-[var(--surface-1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--surface-2)] text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Set Pieces</th>
                <th className="px-4 py-3">Last Opened</th>
                <th className="px-4 py-3">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredPlayers.map((entry: ReadinessDashboardPlayersItem, idx: number) => {
                const p = entry.player;
                const r = entry.readiness || [];
                const total = r.length;
                const readyCount = r.filter(rd => rd.status === 'opened' || rd.status === 'passed').length;
                const worstStatus = computeWorstStatus(r);
                const totalViews = r.reduce((sum, rd) => sum + (rd.viewCount || 0), 0);
                const lastOpened = r.reduce((latest: string | null, rd) => {
                  if (!rd.lastOpenedAt) return latest;
                  if (!latest) return rd.lastOpenedAt;
                  return rd.lastOpenedAt > latest ? rd.lastOpenedAt : latest;
                }, null);

                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => setSelectedPlayer(entry)}
                    className="hover:bg-white/[0.03] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-xs font-bold text-primary">{p.shirtNumber || '?'}</div>
                        <div>
                          <span className="font-semibold text-white block">{p.firstName} {p.lastName}</span>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {p.tags.slice(0, 2).map(t => (
                                <span key={t} className="text-[8px] px-1 py-0 rounded bg-primary/10 text-primary/70">{t.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {total > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{readyCount}/{total} ready</span>
                          <StatusBadge status={worstStatus} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{r.length} piece{r.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {lastOpened ? new Date(lastOpened).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{totalViews}</span>
                    </td>
                  </motion.tr>
                );
              })}
              {filteredPlayers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {allPlayers.length === 0 ? 'No readiness data available.' : 'No players match your filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedPlayer && (() => {
            const p = selectedPlayer.player;
            const rows = selectedPlayer.readiness || [];
            const sortedRows = [...rows].sort((a, b) =>
              setPieceTitleById(a.setPieceId).localeCompare(setPieceTitleById(b.setPieceId))
            );
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {p.shirtNumber || '?'}
                    </div>
                    <div>
                      <SheetTitle>{p.firstName} {p.lastName}</SheetTitle>
                      <SheetDescription>Per-set-piece readiness</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-3">
                  {sortedRows.length === 0 && (
                    <div className="rounded-2xl border border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                      No set-piece activity yet.
                    </div>
                  )}
                  {sortedRows.map((rd) => (
                    <div key={rd.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="font-semibold text-white text-sm leading-snug">{setPieceTitleById(rd.setPieceId)}</span>
                        <StatusBadge status={rd.status} className="shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          {rd.viewCount || 0} view{(rd.viewCount || 0) !== 1 ? 's' : ''}
                        </span>
                        <span>
                          {rd.lastOpenedAt ? `Last opened ${new Date(rd.lastOpenedAt).toLocaleDateString()}` : 'Never opened'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* TODO: needs reminder endpoint in api-spec */}
                        <span className="inline-block w-full">
                          <Button disabled className="w-full" variant="outline">
                            <BellRing className="h-4 w-4 mr-2" />
                            Remind player
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </CoachLayout>
  );
}
