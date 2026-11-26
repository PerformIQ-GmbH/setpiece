import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListTemplatesQueryKey, useListTemplates, useSaveSetPieceAsTemplate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** Admin only: publishes the open set piece as a template (new or replacing one) for every team. */
export function SaveAsTemplateDialog({ open, onOpenChange, teamId, setPieceId, title, beforeSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  setPieceId: string;
  title: string;
  /** Flushes unsaved board edits; false aborts. */
  beforeSave: () => Promise<boolean>;
}) {
  const { data: templates } = useListTemplates(undefined, { query: { enabled: open, queryKey: getListTemplatesQueryKey() } });
  const save = useSaveSetPieceAsTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [target, setTarget] = useState('new');

  useEffect(() => {
    if (!open) return;
    setTarget(templates?.find(t => t.title === title)?.id ?? 'new');
  }, [open, templates, title]);

  const submit = async () => {
    if (!await beforeSave()) return;
    try {
      await save.mutateAsync({ teamId, setPieceId, data: target === 'new' ? {} : { templateId: target } });
      await queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      toast({ title: 'Vorlage gespeichert', description: 'Alle Teams sehen sie jetzt in der Vorlagenbibliothek.' });
      onOpenChange(false);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast({ title: 'Vorlage nicht gespeichert', description: status === 403 ? 'Dein Konto ist kein Admin-Konto.' : 'Bitte nochmals versuchen.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader><DialogTitle>Als Vorlage für alle speichern</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Zeichnung, Rollen, Texte und Videoszenen dieses Standards werden zur Vorlage. Alle Teams sehen sie in der Bibliothek.
          Bereits angelegte Standards der Teams ändern sich nicht.
        </p>
        <label htmlFor="template-target" className="text-xs font-medium text-white">Wohin?</label>
        <select id="template-target" value={target} onChange={e => setTarget(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-white">
          <option value="new">Neue Vorlage anlegen</option>
          {(templates ?? []).map(t => <option key={t.id} value={t.id}>Ersetzen: {t.title}</option>)}
        </select>
        {target !== 'new' && <p className="text-xs text-amber-400">Die bisherige Zeichnung dieser Vorlage wird überschrieben.</p>}
        <Button onClick={submit} disabled={save.isPending} className="w-full">
          {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Speichern
        </Button>
      </DialogContent>
    </Dialog>
  );
}
