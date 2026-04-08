import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, Link } from 'wouter';
import { useGetTeam, useGetMatchday, useListSetPieces, useListPlayers, useAddSetPieceToMatchday, useRemoveSetPieceFromMatchday, useCreateShareLink, getSetPiece } from '@workspace/api-client-react';
import type { Player, CreateShareLinkBody, SetPieceRole, RoleAssignment } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Share2, QrCode, ArrowLeft, LayoutDashboard, Copy, Check, Clock, Users, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function MatchdayDetail() {
  const [, params] = useRoute('/teams/:teamId/matchdays/:matchdayId');
  const teamId = params?.teamId || '';
  const matchdayId = params?.matchdayId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: matchday, refetch } = useGetMatchday(teamId, matchdayId);
  const { data: allSetPieces } = useListSetPieces(teamId);
  const { data: players } = useListPlayers(teamId);
  const addToMatchday = useAddSetPieceToMatchday();
  const removeFromMatchday = useRemoveSetPieceFromMatchday();
  const createShareLink = useCreateShareLink();

  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportMatchPack = async () => {
    if (!matchday) return;
    setExportingPDF(true);
    try {
      const [jsPDFMod, { renderSetPieceSteps }] = await Promise.all([
        import('jspdf'),
        import('@/utils/offscreenPitchRenderer'),
      ]);
      const jsPDF = jsPDFMod.default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = 210;
      const ph = 297;

      const addPageBg = () => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pw, ph, 'F');
      };

      addPageBg();

      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, pw, 4, 'F');

      pdf.setTextColor(16, 185, 129);
      pdf.setFontSize(10);
      pdf.text('SETPIECE by PerformIQ', 15, 18);

      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(22);
      pdf.text(team?.name || 'Team', 15, 30);

      pdf.setFontSize(16);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Match Pack: ${matchday.title}`, 15, 40);

      if (matchday.opponent) {
        pdf.setFontSize(11);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`vs ${matchday.opponent}`, 15, 48);
      }
      if (matchday.date) {
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        pdf.text(new Date(matchday.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 15, 55);
      }

      let yOff = 65;

      if (matchday.notes) {
        pdf.setFontSize(9);
        pdf.setTextColor(16, 185, 129);
        pdf.text('COACHING NOTES', 15, yOff);
        yOff += 6;
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const noteLines = pdf.splitTextToSize(matchday.notes, 180);
        pdf.text(noteLines, 15, yOff);
        yOff += noteLines.length * 4.5 + 6;
      }

      const pieces = matchday.setPieces || [];
      const imgWidth = 170;
      const imgAspect = 560 / 800;
      const imgHeight = imgWidth * imgAspect;

      const detailResults = await Promise.allSettled(
        pieces.map(sp => getSetPiece(teamId, sp.id))
      );
      const detailMap = new Map<string, Awaited<ReturnType<typeof getSetPiece>>>();
      detailResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          detailMap.set(pieces[idx].id, result.value);
        }
      });

      const ensureSpace = (needed: number) => {
        if (yOff + needed > ph - 15) {
          pdf.addPage();
          addPageBg();
          yOff = 15;
        }
      };

      const playerList = (players || []).map((p: Player) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        shirtNumber: p.shirtNumber,
      }));

      for (const sp of pieces) {
        const spDetail = detailMap.get(sp.id) || null;

        ensureSpace(20);

        pdf.setDrawColor(200, 210, 200);
        pdf.line(15, yOff, 195, yOff);
        yOff += 6;

        pdf.setTextColor(16, 185, 129);
        pdf.setFontSize(13);
        pdf.text(sp.title, 15, yOff);
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(sp.category.replace(/_/g, ' ').toUpperCase(), 15, yOff + 5);
        yOff += 12;

        pdf.setTextColor(60, 60, 60);
        if (sp.description) {
          ensureSpace(10);
          const descLines = pdf.splitTextToSize(sp.description, 170);
          pdf.text(descLines, 15, yOff);
          yOff += descLines.length * 4 + 2;
        }
        if (sp.coachingNotes) {
          ensureSpace(10);
          pdf.setTextColor(16, 185, 129);
          pdf.setFontSize(8);
          pdf.text('NOTES:', 15, yOff);
          pdf.setTextColor(80, 80, 80);
          const noteLines = pdf.splitTextToSize(sp.coachingNotes, 160);
          pdf.text(noteLines, 35, yOff);
          yOff += noteLines.length * 3.5 + 2;
          pdf.setFontSize(9);
        }

        const boardData = (spDetail?.boardData || sp.boardData || {}) as Record<string, unknown>;
        const roles = (spDetail?.roles || []).map((r: SetPieceRole) => ({
          id: r.id,
          name: r.name,
          startPosition: r.startPosition,
        }));
        const assignments = (spDetail?.assignments || []).map((a: RoleAssignment) => ({
          roleId: a.roleId,
          playerId: a.playerId,
        }));

        const hasBoard = boardData && Object.keys(boardData).length > 0;

        if (hasBoard) {
          const stepImages = renderSetPieceSteps({
            boardData,
            roles,
            assignments,
            players: playerList,
            category: sp.category,
          });

          for (let si = 0; si < stepImages.length; si++) {
            ensureSpace(10 + imgHeight + 4);

            pdf.setTextColor(16, 185, 129);
            pdf.setFontSize(9);
            pdf.text(stepImages[si].stepLabel, 20, yOff);
            yOff += 4;

            pdf.addImage(stepImages[si].dataUrl, 'PNG', 20, yOff, imgWidth, imgHeight);
            yOff += imgHeight + 4;
          }
        }

        if (roles.length > 0) {
          ensureSpace(12);
          pdf.setTextColor(30, 30, 30);
          pdf.setFontSize(10);
          pdf.text('Roles & Assignments', 15, yOff);
          yOff += 6;
          pdf.setFontSize(8);
          for (const role of spDetail?.roles || []) {
            ensureSpace(7);
            const assignment = spDetail?.assignments?.find((a: RoleAssignment) => a.roleId === role.id);
            const player = assignment ? players?.find((p: Player) => p.id === assignment.playerId) : null;
            const playerName = player ? `${player.firstName} ${player.lastName} (#${player.shirtNumber || '?'})` : 'Unassigned';
            pdf.setTextColor(16, 185, 129);
            pdf.text(role.name, 15, yOff);
            pdf.setTextColor(80, 80, 80);
            pdf.text(playerName, 75, yOff);
            yOff += 5;
          }
          yOff += 4;
        }

        ensureSpace(10);
        pdf.setTextColor(120, 120, 120);
        pdf.setFontSize(8);
        pdf.text(`Status: ${sp.status} · Version: ${sp.versionNumber}`, 15, yOff);
        yOff += 8;
      }

      ensureSpace(45);
      const qrSize = 25;
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text('Scan to access player view', pw - 15 - qrSize, yOff - 3);

      pdf.setFillColor(240, 240, 240);
      pdf.rect(pw - 15 - qrSize, yOff, qrSize, qrSize, 'F');
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(6);
      pdf.text('SETPIECE QR', pw - 15 - qrSize + 3, yOff + qrSize / 2 + 2);

      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.text(`Generated ${new Date().toLocaleString()} · SETPIECE by PerformIQ`, 15, ph - 8);

      pdf.save(`${team?.name || 'team'}_${matchday.title}_matchpack.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPDF(false);
    }
  };
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareScope, setShareScope] = useState<'all' | 'selected'>('all');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [expiryHours, setExpiryHours] = useState<string>('');

  const matchdayPieceIds = matchday?.setPieces?.map(sp => sp.id) || [];
  const availablePieces = allSetPieces?.filter(sp => !matchdayPieceIds.includes(sp.id) && sp.status !== 'archived') || [];

  const handleAdd = async (spId: string) => {
    await addToMatchday.mutateAsync({ teamId, matchdayId, data: { setPieceId: spId } });
    setAddOpen(false);
    refetch();
  };

  const handleRemove = async (spId: string) => {
    await removeFromMatchday.mutateAsync({ teamId, matchdayId, data: { setPieceId: spId } });
    refetch();
  };

  const [shareError, setShareError] = useState('');

  const handleShare = async () => {
    setShareError('');
    if (shareScope === 'selected' && selectedPlayers.length === 0) {
      setShareError('Please select at least one player, or choose "All Players".');
      return;
    }
    const body: CreateShareLinkBody = {
      matchdayScope: matchdayId,
    };
    if (shareScope === 'selected') {
      body.playerScope = selectedPlayers;
    }
    if (expiryHours && parseInt(expiryHours) > 0) {
      const expiry = new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000);
      body.expiresAt = expiry.toISOString();
    }
    try {
      const link = await createShareLink.mutateAsync({ teamId, data: body });
      const url = `${window.location.origin}${import.meta.env.BASE_URL}p/${link.token}`;
      setShareLink(url);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to create share link.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/teams/${teamId}/matchdays`}>
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white">{matchday?.title}</h1>
          <p className="text-muted-foreground text-sm">
            {matchday?.opponent ? `vs ${matchday.opponent}` : ''}
            {matchday?.date && ` · ${new Date(matchday.date).toLocaleDateString()}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportMatchPack} disabled={exportingPDF} className="border-border text-muted-foreground">
          {exportingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          {exportingPDF ? 'Exporting...' : 'Export PDF'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setShareLink(''); setShareScope('all'); setSelectedPlayers([]); setExpiryHours(''); setShareOpen(true); }} className="border-primary/30 text-primary">
          <QrCode className="h-4 w-4 mr-2" /> Share
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Set Piece
        </Button>
      </div>

      <div className="mb-4">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Match Pack ({matchday?.setPieces?.length || 0} set pieces)</h2>
      </div>

      {matchday?.setPieces?.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No set pieces in this match pack yet.</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Set Piece</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchday?.setPieces?.map((sp, idx) => (
            <motion.div key={sp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="bg-card border-border overflow-hidden group">
                <div className="aspect-[16/9] bg-emerald-950/40 border-b border-border/50 relative flex items-center justify-center">
                  {sp.previewImageUrl ? (
                    <img src={sp.previewImageUrl} alt={sp.title} className="w-full h-full object-cover" />
                  ) : (
                    <LayoutDashboard className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-white">{sp.title}</h3>
                    <StatusBadge status={sp.status} />
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mb-3">{sp.category.replace(/_/g, ' ')}</p>
                  <div className="flex gap-2">
                    <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">Edit</Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(sp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Set Piece to Match Pack</DialogTitle></DialogHeader>
          {availablePieces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">All set pieces are already in this match pack.</p>
          ) : (
            <div className="space-y-2 pt-2">
              {availablePieces.map(sp => (
                <button key={sp.id} onClick={() => handleAdd(sp.id)} className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all text-left">
                  <div>
                    <p className="font-semibold text-sm text-white">{sp.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{sp.category.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={sp.status} />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /> Share Match Pack</DialogTitle></DialogHeader>

          {!shareLink ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Player Scope
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShareScope('all')}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${shareScope === 'all' ? 'bg-primary/10 border-primary/30 text-white' : 'bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    <p className="font-semibold">All Players</p>
                    <p className="text-xs opacity-70">Anyone with the link can view</p>
                  </button>
                  <button
                    onClick={() => setShareScope('selected')}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${shareScope === 'selected' ? 'bg-primary/10 border-primary/30 text-white' : 'bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    <p className="font-semibold">Selected Players</p>
                    <p className="text-xs opacity-70">Restrict to specific players</p>
                  </button>
                </div>
              </div>

              {shareScope === 'selected' && players && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {players.map((p: Player) => (
                    <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.includes(p.id)}
                        onChange={() => togglePlayer(p.id)}
                        className="rounded border-border accent-primary"
                      />
                      <span className="text-sm text-white">{p.firstName} {p.lastName}</span>
                      {p.shirtNumber && <span className="text-xs text-muted-foreground ml-auto">#{p.shirtNumber}</span>}
                    </label>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Expiry (optional)
                </label>
                <select
                  value={expiryHours}
                  onChange={e => setExpiryHours(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                >
                  <option value="">No expiry</option>
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="168">1 week</option>
                </select>
              </div>

              {shareError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {shareError}
                </div>
              )}
              <Button className="w-full" onClick={handleShare} disabled={createShareLink.isPending}>
                {createShareLink.isPending ? 'Generating...' : 'Generate Share Link'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-4 rounded-2xl mb-4">
                <QRCodeSVG value={shareLink} size={180} />
              </div>
              <p className="text-xs text-muted-foreground mb-4 text-center">Scan this QR code or share the link below</p>
              <div className="flex gap-2 w-full">
                <input readOnly value={shareLink} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
                <Button size="sm" variant="outline" onClick={handleCopy} className="min-w-[60px]">
                  {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" onClick={() => { setShareLink(''); }}>
                Generate New Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
