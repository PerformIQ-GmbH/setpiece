import { useEffect, useState } from 'react';
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
import type { jsPDF as JsPDFType } from 'jspdf';
import { MatchdayAssistant } from '@/components/MatchdayAssistant';
import { MatchdaySquadSection } from '@/components/MatchdaySquadSection';

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

  // Squad selection lifted to the page so the Squad section and the
  // Matchday Assistant share one source of truth. We hydrate it from the
  // matchday's persisted squad whenever it changes (e.g. after a save).
  const [starterIds, setStarterIds] = useState<Set<string>>(new Set());
  const [benchIds, setBenchIds] = useState<Set<string>>(new Set());
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!matchday) return;
    // Reload squad state when we navigate to a different matchday or when
    // the persisted squad changes (e.g. just after we saved it).
    const persistedKey = JSON.stringify({
      id: matchday.id,
      squad: matchday.squad ?? null,
    });
    if (persistedKey === hydratedFor) return;
    setStarterIds(new Set(matchday.squad?.starters ?? []));
    setBenchIds(new Set(matchday.squad?.bench ?? []));
    setHydratedFor(persistedKey);
  }, [matchday, hydratedFor]);

  const handleExportMatchPack = async () => {
    if (!matchday) return;
    setExportingPDF(true);
    try {
      const [jsPDFMod, { renderSetPieceSteps }, QRCodeMod] = await Promise.all([
        import('jspdf'),
        import('@/utils/offscreenPitchRenderer'),
        import('qrcode'),
      ]);
      const jsPDF = jsPDFMod.default;
      const QRCode = QRCodeMod.default ?? QRCodeMod;

      // A4 portrait dimensions (mm).
      const PW_P = 210;
      const PH_P = 297;
      // A4 landscape dimensions (mm).
      const PW_L = 297;
      const PH_L = 210;
      const MARGIN = 14;
      const FOOTER_H = 10;

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const teamName = team?.name || 'Team';
      const matchTitle = matchday.title || 'Match Pack';
      const matchDate = matchday.date
        ? new Date(matchday.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      const generatedStamp = new Date().toLocaleString();
      const brandGreen: [number, number, number] = [16, 185, 129];
      const inkDark: [number, number, number] = [20, 28, 22];

      // Generated metadata for the footer/header that we add at the end of the
      // build once the total page count is known.
      type PageMeta = { orientation: 'p' | 'l' };
      const pageMeta: PageMeta[] = [{ orientation: 'p' }];

      const currentPage = () => pdf.getNumberOfPages();
      const pageDims = (orientation: 'p' | 'l') =>
        orientation === 'l' ? { w: PW_L, h: PH_L } : { w: PW_P, h: PH_P };

      const fillPageBackground = (orientation: 'p' | 'l') => {
        const { w, h } = pageDims(orientation);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, w, h, 'F');
        // Brand stripe at top.
        pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.rect(0, 0, w, 3, 'F');
      };

      const addPage = (orientation: 'p' | 'l') => {
        pdf.addPage('a4', orientation);
        pageMeta.push({ orientation });
        fillPageBackground(orientation);
      };

      fillPageBackground('p');

      // Generate a real share link for the QR code on the cover.
      let shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
      try {
        const link = await createShareLink.mutateAsync({
          teamId,
          data: { matchdayScope: matchdayId },
        });
        shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}p/${link.token}`;
      } catch (err) {
        console.warn('Could not create share link for QR, falling back to base URL.', err);
      }

      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 600,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b1f12', light: '#ffffff' },
      });

      // ─── COVER PAGE ────────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.setFontSize(11);
      pdf.text('SETPIECE  ·  by PerformIQ', MARGIN, 18);

      pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      pdf.setFontSize(40);
      const teamLines = pdf.splitTextToSize(teamName, PW_P - MARGIN * 2);
      pdf.text(teamLines, MARGIN, 50);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(13);
      pdf.setTextColor(110, 110, 110);
      pdf.text('MATCH PACK', MARGIN, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(26);
      pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      const titleLines = pdf.splitTextToSize(matchTitle, PW_P - MARGIN * 2);
      pdf.text(titleLines, MARGIN, 76);
      let coverY = 76 + titleLines.length * 10;

      if (matchday.opponent) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(16);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`vs ${matchday.opponent}`, MARGIN, coverY);
        coverY += 8;
      }
      if (matchDate) {
        pdf.setFontSize(12);
        pdf.setTextColor(120, 120, 120);
        pdf.text(matchDate, MARGIN, coverY);
        coverY += 8;
      }

      // QR card on the right side of the cover page.
      const qrSize = 70;
      const qrX = PW_P - MARGIN - qrSize;
      const qrY = 120;
      pdf.setDrawColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.setLineWidth(0.6);
      pdf.setFillColor(247, 250, 247);
      pdf.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 26, 3, 3, 'FD');
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
      pdf.text('Scan for player view', qrX + qrSize / 2, qrY + qrSize + 8, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      const urlLine = shareUrl.length > 36 ? shareUrl.slice(0, 36) + '…' : shareUrl;
      pdf.text(urlLine, qrX + qrSize / 2, qrY + qrSize + 13, { align: 'center' });

      // Cover-page coaching notes block.
      let coverNotesY = 140;
      if (matchday.notes) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.text('COACHING NOTES', MARGIN, coverNotesY);
        coverNotesY += 6;
        pdf.setDrawColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.setLineWidth(0.4);
        pdf.line(MARGIN, coverNotesY, MARGIN + 80, coverNotesY);
        coverNotesY += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(50, 50, 50);
        const wrapWidth = qrX - MARGIN - 8;
        const noteLines = pdf.splitTextToSize(matchday.notes, wrapWidth);
        const maxLines = Math.floor((PH_P - coverNotesY - 30) / 5.5);
        const shown = noteLines.slice(0, maxLines);
        pdf.text(shown, MARGIN, coverNotesY);
      }

      const pieces = matchday.setPieces || [];
      const detailResults = await Promise.allSettled(
        pieces.map(sp => getSetPiece(teamId, sp.id))
      );
      const detailMap = new Map<string, Awaited<ReturnType<typeof getSetPiece>>>();
      detailResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          detailMap.set(pieces[idx].id, result.value);
        }
      });

      const playerList = (players || []).map((p: Player) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        shirtNumber: p.shirtNumber,
      }));

      // Table of contents on the cover (bottom).
      if (pieces.length > 0) {
        let tocY = PH_P - 30 - Math.min(pieces.length, 6) * 5;
        if (tocY < coverNotesY + 30) tocY = PH_P - 50;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.text('IN THIS PACK', MARGIN, tocY);
        tocY += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pieces.slice(0, 8).forEach((sp, i) => {
          pdf.text(`${i + 1}.  ${sp.title}  ·  ${sp.category.replace(/_/g, ' ')}`, MARGIN, tocY);
          tocY += 5;
        });
      }

      // ─── PER-SET-PIECE SECTIONS ────────────────────────────────────────
      for (let pi = 0; pi < pieces.length; pi++) {
        const sp = pieces[pi];
        const spDetail = detailMap.get(sp.id) || null;

        // Section starts on a new portrait page.
        addPage('p');

        // Section header.
        pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.roundedRect(MARGIN, 18, 26, 7, 1.5, 1.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text(sp.category.replace(/_/g, ' ').toUpperCase(), MARGIN + 13, 23, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`SET PIECE ${pi + 1} OF ${pieces.length}`, PW_P - MARGIN, 23, { align: 'right' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(26);
        pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
        const titleW = PW_P - MARGIN * 2;
        const spTitleLines = pdf.splitTextToSize(sp.title, titleW);
        pdf.text(spTitleLines, MARGIN, 38);
        let yOff = 38 + spTitleLines.length * 9;

        pdf.setDrawColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.setLineWidth(0.6);
        pdf.line(MARGIN, yOff, MARGIN + 30, yOff);
        yOff += 8;

        if (sp.description) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          pdf.setTextColor(45, 45, 45);
          const descLines = pdf.splitTextToSize(sp.description, titleW);
          pdf.text(descLines, MARGIN, yOff);
          yOff += descLines.length * 5.5 + 3;
        }

        if (sp.coachingNotes) {
          pdf.setFillColor(245, 250, 245);
          const noteLines = pdf.splitTextToSize(sp.coachingNotes, titleW - 10);
          const noteBlockH = noteLines.length * 5 + 12;
          pdf.roundedRect(MARGIN, yOff, titleW, noteBlockH, 2, 2, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
          pdf.text('COACHING NOTES', MARGIN + 5, yOff + 6);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(60, 60, 60);
          pdf.text(noteLines, MARGIN + 5, yOff + 11);
          yOff += noteBlockH + 6;
        }

        // Roles & assignments table.
        const roles = (spDetail?.roles || []).map((r: SetPieceRole) => ({
          id: r.id,
          name: r.name,
          startPosition: r.startPosition,
        }));
        const assignments = (spDetail?.assignments || []).map((a: RoleAssignment) => ({
          roleId: a.roleId,
          playerId: a.playerId,
        }));

        if (roles.length > 0) {
          // Make sure the table fits on the section page; otherwise let it
          // start at the top of a fresh portrait page so it never breaks.
          const tableRowH = 8;
          const tableHeaderH = 10;
          const tableTotalH = tableHeaderH + roles.length * tableRowH + 10;
          if (yOff + tableTotalH > PH_P - 25) {
            addPage('p');
            yOff = 22;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
          pdf.text('Roles & Assignments', MARGIN, yOff);
          yOff += 4;

          // Header row.
          pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
          pdf.rect(MARGIN, yOff, titleW, tableHeaderH, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.text('ROLE', MARGIN + 4, yOff + 6.5);
          pdf.text('PLAYER', MARGIN + 70, yOff + 6.5);
          pdf.text('#', MARGIN + titleW - 12, yOff + 6.5);
          yOff += tableHeaderH;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          for (let ri = 0; ri < (spDetail?.roles || []).length; ri++) {
            const role = (spDetail?.roles || [])[ri];
            const assignment = spDetail?.assignments?.find((a: RoleAssignment) => a.roleId === role.id);
            const player = assignment ? players?.find((p: Player) => p.id === assignment.playerId) : null;
            const playerName = player ? `${player.firstName} ${player.lastName}` : 'Unassigned';
            const shirt = player?.shirtNumber != null ? `#${player.shirtNumber}` : '—';

            if (ri % 2 === 0) {
              pdf.setFillColor(248, 250, 248);
              pdf.rect(MARGIN, yOff, titleW, tableRowH, 'F');
            }
            pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
            pdf.text(role.name, MARGIN + 4, yOff + 5.5);
            pdf.setTextColor(player ? 40 : 150, player ? 40 : 150, player ? 40 : 150);
            pdf.text(playerName, MARGIN + 70, yOff + 5.5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(player ? brandGreen[0] : 150, player ? brandGreen[1] : 150, player ? brandGreen[2] : 150);
            pdf.text(shirt, MARGIN + titleW - 12, yOff + 5.5);
            pdf.setFont('helvetica', 'normal');
            yOff += tableRowH;
          }
          // Table border.
          pdf.setDrawColor(220, 230, 220);
          pdf.setLineWidth(0.3);
          pdf.rect(MARGIN, yOff - roles.length * tableRowH - tableHeaderH, titleW, roles.length * tableRowH + tableHeaderH);
        }

        // ─── DIAGRAM PAGES (landscape) ─────────────────────────────────
        const boardData = (spDetail?.boardData || sp.boardData || {}) as Record<string, unknown>;
        const hasBoard = boardData && Object.keys(boardData).length > 0;

        if (hasBoard) {
          const stepImages = renderSetPieceSteps({
            boardData,
            roles,
            assignments,
            players: playerList,
            category: sp.category,
          });

          for (const stepImage of stepImages) {
            addPage('l');

            // Diagram-page header.
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
            pdf.text(sp.title.toUpperCase(), MARGIN, 14);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(120, 120, 120);
            pdf.text(sp.category.replace(/_/g, ' ').toUpperCase(), PW_L - MARGIN, 14, { align: 'right' });

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18);
            pdf.setTextColor(inkDark[0], inkDark[1], inkDark[2]);
            pdf.text(stepImage.stepLabel, MARGIN, 23);

            // Diagram fills the rest of the page above the legend/footer.
            const legendH = 14;
            const topPad = 26;
            const availW = PW_L - MARGIN * 2;
            const availH = PH_L - topPad - FOOTER_H - legendH - 4;
            const aspect = stepImage.aspect || (1400 / 990);
            let imgW = availW;
            let imgH = imgW / aspect;
            if (imgH > availH) {
              imgH = availH;
              imgW = imgH * aspect;
            }
            const imgX = (PW_L - imgW) / 2;
            const imgY = topPad;
            pdf.addImage(stepImage.dataUrl, 'PNG', imgX, imgY, imgW, imgH);

            // Legend strip beneath the diagram.
            const legendY = imgY + imgH + 3;
            drawLegend(pdf, MARGIN, legendY, availW);
          }
        }
      }

      // ─── FOOTERS (added after total page count is known) ───────────────
      const total = currentPage();
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p);
        const meta = pageMeta[p - 1] || { orientation: 'p' };
        const { w, h } = pageDims(meta.orientation);
        pdf.setDrawColor(220, 230, 220);
        pdf.setLineWidth(0.3);
        pdf.line(MARGIN, h - FOOTER_H, w - MARGIN, h - FOOTER_H);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`${teamName}  ·  ${matchTitle}`, MARGIN, h - 5);
        pdf.text(`Page ${p} / ${total}`, w / 2, h - 5, { align: 'center' });
        pdf.text(`Generated ${generatedStamp}`, w - MARGIN, h - 5, { align: 'right' });
      }

      pdf.save(`${team?.name || 'team'}_${matchday.title}_matchpack.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  // Compact legend for diagram pages: arrow styles + marker styles.
  const drawLegend = (pdf: JsPDFType, x: number, y: number, w: number) => {
    const h = 12;
    pdf.setFillColor(247, 250, 247);
    pdf.setDrawColor(200, 215, 200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 80);
    pdf.text('LEGEND', x + 3, y + 4.5);

    let cx = x + 22;
    const drawArrow = (sx: number, sy: number, ex: number, ey: number, dashed: boolean) => {
      pdf.setLineWidth(1.4);
      pdf.setDrawColor(11, 31, 18);
      if (dashed) pdf.setLineDashPattern([1.2, 1], 0);
      else pdf.setLineDashPattern([], 0);
      pdf.line(sx, sy, ex, ey);
      pdf.setLineDashPattern([], 0);
      // Arrowhead triangle.
      pdf.setFillColor(11, 31, 18);
      pdf.triangle(ex, ey, ex - 1.6, ey - 1, ex - 1.6, ey + 1, 'F');
    };
    const drawCircle = (px: number, py: number, fill: [number, number, number], label: string) => {
      pdf.setFillColor(fill[0], fill[1], fill[2]);
      pdf.setDrawColor(11, 31, 18);
      pdf.setLineWidth(0.4);
      pdf.circle(px, py, 1.8, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(60, 60, 60);
      pdf.text(label, px + 3, py + 1);
    };

    const midY = y + h / 2;

    // Pass (solid)
    drawArrow(cx, midY, cx + 10, midY, false);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    pdf.text('Pass', cx + 12, midY + 1);
    cx += 28;

    // Run (dashed)
    drawArrow(cx, midY, cx + 10, midY, true);
    pdf.text('Run', cx + 12, midY + 1);
    cx += 28;

    // Player
    drawCircle(cx, midY, [6, 95, 70], 'Player');
    cx += 22;

    // Opponent
    drawCircle(cx, midY, [127, 29, 29], 'Opponent');
    cx += 28;

    // Goalkeeper
    drawCircle(cx, midY, [180, 83, 9], 'Goalkeeper');
    cx += 30;

    // Ball
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(11, 31, 18);
    pdf.setLineWidth(0.5);
    pdf.circle(cx, midY, 1.6, 'FD');
    pdf.setFillColor(11, 31, 18);
    pdf.circle(cx, midY, 0.5, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    pdf.text('Ball', cx + 3, midY + 1);
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
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/teams/${teamId}/matchdays`}>
          <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 bg-white/[0.04] hover:bg-white/[0.08]"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-white truncate">{matchday?.title}</h1>
          <p className="text-muted-foreground text-sm">
            {matchday?.opponent ? `vs ${matchday.opponent}` : ''}
            {matchday?.date && ` · ${new Date(matchday.date).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleExportMatchPack} disabled={exportingPDF} className="rounded-xl">
            {exportingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            {exportingPDF ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShareLink(''); setShareScope('all'); setSelectedPlayers([]); setExpiryHours(''); setShareOpen(true); }} className="border-primary/30 text-primary rounded-xl">
            <QrCode className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Add Set Piece
          </Button>
        </div>
      </div>

      {matchday && players && (
        <>
          <MatchdaySquadSection
            teamId={teamId}
            matchdayId={matchdayId}
            players={players}
            starterIds={starterIds}
            benchIds={benchIds}
            onChange={({ starters, bench }) => {
              setStarterIds(starters);
              setBenchIds(bench);
            }}
            persistedSquad={matchday.squad ?? null}
            onSaved={() => refetch()}
          />
          <MatchdayAssistant
            teamId={teamId}
            matchdayId={matchdayId}
            players={players}
            setPieces={(matchday.setPieces ?? []).map(sp => ({ id: sp.id, title: sp.title }))}
            starterIds={starterIds}
            benchIds={benchIds}
            squadIsDirty={(() => {
              const persisted = matchday.squad;
              const persistedStarters = new Set(persisted?.starters ?? []);
              const persistedBench = new Set(persisted?.bench ?? []);
              if (persistedStarters.size !== starterIds.size || persistedBench.size !== benchIds.size) return true;
              for (const id of starterIds) if (!persistedStarters.has(id)) return true;
              for (const id of benchIds) if (!persistedBench.has(id)) return true;
              return false;
            })()}
            onApplied={() => refetch()}
          />
        </>
      )}

      <div className="mb-5">
        <p className="section-label mb-3">Match Pack ({matchday?.setPieces?.length || 0} set pieces)</p>
      </div>

      {matchday?.setPieces?.length === 0 ? (
        <Card className="border-dashed border-white/10">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">No set pieces in this match pack yet.</p>
            <p className="text-muted-foreground/60 text-xs mb-5">Add set pieces to build your matchday preparation pack.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" /> Add Set Piece</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchday?.setPieces?.map((sp, idx) => (
            <motion.div key={sp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="overflow-hidden group hover:border-white/[0.12] transition-all">
                <div className="aspect-[16/9] bg-emerald-950/30 border-b border-white/[0.06] relative flex items-center justify-center">
                  {sp.previewImageUrl ? (
                    <img src={sp.previewImageUrl} alt={sp.title} className="w-full h-full object-cover" />
                  ) : (
                    <LayoutDashboard className="h-8 w-8 text-muted-foreground/20" />
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-white group-hover:text-primary/90 transition-colors">{sp.title}</h3>
                    <StatusBadge status={sp.status} />
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mb-4">{sp.category.replace(/_/g, ' ')}</p>
                  <div className="flex gap-2">
                    <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs rounded-xl">Edit</Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(sp.id)}>
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
        <DialogContent className="bg-card border-white/[0.08] sm:max-w-md max-h-[70vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>Add Set Piece to Match Pack</DialogTitle></DialogHeader>
          {availablePieces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All set pieces are already in this match pack.</p>
          ) : (
            <div className="space-y-2 pt-2">
              {availablePieces.map(sp => (
                <button key={sp.id} onClick={() => handleAdd(sp.id)} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/30 hover:bg-white/[0.05] transition-all text-left active:scale-[0.99]">
                  <div>
                    <p className="font-semibold text-sm text-white">{sp.title}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{sp.category.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={sp.status} />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="bg-card border-white/[0.08] sm:max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /> Share Match Pack</DialogTitle></DialogHeader>

          {!shareLink ? (
            <div className="space-y-5 pt-2">
              <div className="space-y-2.5">
                <label className="section-label flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Player Scope
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShareScope('all')}
                    className={`flex-1 p-4 rounded-2xl border-2 text-sm text-left transition-all ${shareScope === 'all' ? 'bg-primary/[0.08] border-primary/40 text-white' : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.15]'}`}
                  >
                    <p className="font-semibold">Team Link</p>
                    <p className="text-xs opacity-70 mt-1">Players identify themselves when they open</p>
                  </button>
                  <button
                    onClick={() => setShareScope('selected')}
                    className={`flex-1 p-4 rounded-2xl border-2 text-sm text-left transition-all ${shareScope === 'selected' ? 'bg-primary/[0.08] border-primary/40 text-white' : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.15]'}`}
                  >
                    <p className="font-semibold">Selected Players</p>
                    <p className="text-xs opacity-70 mt-1">Restrict to specific players only</p>
                  </button>
                </div>
              </div>

              {shareScope === 'selected' && players && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
                  {players.map((p: Player) => (
                    <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.includes(p.id)}
                        onChange={() => togglePlayer(p.id)}
                        className="rounded border-white/20 accent-primary"
                      />
                      <span className="text-sm text-white">{p.firstName} {p.lastName}</span>
                      {p.shirtNumber && <span className="text-xs text-muted-foreground ml-auto">#{p.shirtNumber}</span>}
                    </label>
                  ))}
                </div>
              )}

              <div className="space-y-2.5">
                <label className="section-label flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Expiry (optional)
                </label>
                <select
                  value={expiryHours}
                  onChange={e => setExpiryHours(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {shareError}
                </div>
              )}
              <Button className="w-full rounded-xl py-3" onClick={handleShare} disabled={createShareLink.isPending}>
                {createShareLink.isPending ? 'Generating...' : 'Generate Share Link'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <div className="bg-white p-5 rounded-2xl mb-5 shadow-lg">
                <QRCodeSVG value={shareLink} size={180} />
              </div>
              <p className="text-xs text-muted-foreground mb-5 text-center max-w-xs">
                {shareScope === 'all' ? 'Shared team access link — players will identify themselves when they open it' : 'Player-specific link — only the selected player can access'}
              </p>
              <div className="flex gap-2 w-full">
                <input readOnly value={shareLink} className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-foreground" />
                <Button size="sm" variant="outline" onClick={handleCopy} className="min-w-[70px] rounded-xl">
                  {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-4 text-xs text-muted-foreground" onClick={() => { setShareLink(''); }}>
                Generate New Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
