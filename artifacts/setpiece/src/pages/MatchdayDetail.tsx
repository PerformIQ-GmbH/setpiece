import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, Link } from 'wouter';
import { useGetTeam, useGetMatchday, useListSetPieces, useAddSetPieceToMatchday, useRemoveSetPieceFromMatchday, useCreateShareLink } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Share2, QrCode, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function MatchdayDetail() {
  const [, params] = useRoute('/teams/:teamId/matchdays/:matchdayId');
  const teamId = params?.teamId || '';
  const matchdayId = params?.matchdayId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: matchday, refetch } = useGetMatchday(teamId, matchdayId);
  const { data: allSetPieces } = useListSetPieces(teamId);
  const addToMatchday = useAddSetPieceToMatchday();
  const removeFromMatchday = useRemoveSetPieceFromMatchday();
  const createShareLink = useCreateShareLink();

  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

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

  const handleShare = async () => {
    const link = await createShareLink.mutateAsync({ teamId, data: { matchdayScope: matchdayId } });
    const url = `${window.location.origin}${import.meta.env.BASE_URL}p/${link.token}`;
    setShareLink(url);
    setShareOpen(true);
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
        <Button size="sm" variant="outline" onClick={handleShare} className="border-primary/30 text-primary">
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
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /> Share Match Pack</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="bg-white p-4 rounded-2xl mb-4">
              <QRCodeSVG value={shareLink} size={200} />
            </div>
            <p className="text-xs text-muted-foreground mb-4 text-center">Scan this QR code or share the link below</p>
            <div className="flex gap-2 w-full">
              <input readOnly value={shareLink} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareLink); }}>Copy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
