import React, { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { useGetSetPiece, useCreateRole, useUpdateRole, useDeleteRole, useUpsertAssignment, useListPlayers, useUpdateSetPieceStatus } from '@workspace/api-client-react';
import { Pitch } from '@/components/Pitch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings2, Plus, Users, ArrowLeft, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export default function SetPieceEditor() {
  const [, params] = useRoute('/teams/:teamId/set-pieces/:setPieceId/editor');
  const teamId = params?.teamId || '';
  const setPieceId = params?.setPieceId || '';

  const { data: setPiece, isLoading, refetch } = useGetSetPiece(teamId, setPieceId);
  const { data: players } = useListPlayers(teamId);
  
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const upsertAssignment = useUpsertAssignment();
  const updateStatus = useUpdateSetPieceStatus();

  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  // Quick role addition state
  const handlePitchClick = async (pos: { x: number, y: number }) => {
    if (activeRoleId) {
      // Move existing role
      await updateRole.mutateAsync({
        teamId, setPieceId, roleId: activeRoleId,
        data: { startPosition: pos }
      });
      refetch();
    } else {
      // Create new role at position
      setNewRoleName('');
      // Store pos in state to use in dialog? For speed, we just pop dialog first.
      alert("Select 'Add Role' first, then you can move it on the pitch.");
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;
    const res = await createRole.mutateAsync({
      teamId, setPieceId,
      data: { name: newRoleName, startPosition: { x: 50, y: 50 } }
    });
    setRoleFormOpen(false);
    setActiveRoleId(res.id);
    refetch();
  };

  const assignPlayer = async (roleId: string, playerId: string) => {
    await upsertAssignment.mutateAsync({
      teamId, setPieceId,
      data: { roleId, playerId }
    });
    refetch();
  };

  if (isLoading) return <CoachLayout><div className="p-8 text-center">Loading Tactical Board...</div></CoachLayout>;
  if (!setPiece) return <CoachLayout><div>Not Found</div></CoachLayout>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden">
      {/* Editor Topbar */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/teams/${teamId}`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-px bg-border" />
          <div>
            <h1 className="font-display font-bold text-lg leading-none text-white">{setPiece.title}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{setPiece.category.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-md bg-secondary text-xs font-semibold text-muted-foreground border border-border mr-2">
            Status: <span className="text-white ml-1">{setPiece.status.replace('_', ' ')}</span>
          </div>
          {setPiece.status === 'draft' && (
            <Button size="sm" onClick={async () => {
              await updateStatus.mutateAsync({ teamId, setPieceId, data: { status: 'ready' } });
              refetch();
            }} className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/50">
              <ShieldCheck className="w-4 h-4 mr-2" /> Mark as Ready
            </Button>
          )}
        </div>
      </header>

      {/* Editor Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas Area */}
        <main className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-card to-background relative overflow-auto p-4 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <Pitch 
              roles={setPiece.roles}
              activeRoleId={activeRoleId}
              onRoleClick={(id) => setActiveRoleId(id === activeRoleId ? null : id)}
              onPitchClick={handlePitchClick}
              interactive={true}
              halfPitch={setPiece.category.includes('corner') || setPiece.category.includes('freekick')}
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              {activeRoleId ? "Click anywhere on the pitch to move the selected role." : "Select a role from the sidebar to move it."}
            </p>
          </div>
        </main>

        {/* Right Sidebar - Roles & Assignments */}
        <aside className="w-96 border-l border-border bg-card/50 backdrop-blur flex flex-col h-full shrink-0 shadow-2xl">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Roles & Assignments
            </h2>
            <Button size="sm" variant="outline" onClick={() => setRoleFormOpen(true)} className="border-border">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {setPiece.roles.map(role => {
              const assignment = setPiece.assignments.find(a => a.roleId === role.id);
              const isActive = role.id === activeRoleId;
              
              return (
                <div 
                  key={role.id} 
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer",
                    isActive ? "bg-primary/10 border-primary/50 shadow-md shadow-primary/10" : "bg-background border-border hover:border-muted-foreground/50"
                  )}
                  onClick={() => setActiveRoleId(role.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                      {role.name}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => {
                      e.stopPropagation();
                      if(confirm('Delete role?')) {
                        deleteRole.mutateAsync({ teamId, setPieceId, roleId: role.id }).then(() => refetch());
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    <label className="text-xs font-semibold text-muted-foreground">Assigned Player</label>
                    <select 
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      value={assignment?.playerId || ''}
                      onChange={(e) => assignPlayer(role.id, e.target.value)}
                    >
                      <option value="">-- Unassigned --</option>
                      {players?.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
            
            {setPiece.roles.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground text-sm">No roles defined yet.</p>
                <Button variant="link" onClick={() => setRoleFormOpen(true)} className="mt-2 text-primary">Create the first role</Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add New Role</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Role Name</label>
              <input 
                autoFocus required 
                value={newRoleName} 
                onChange={e => setNewRoleName(e.target.value)} 
                placeholder="e.g. Near Post Flick"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" 
              />
            </div>
            <Button type="submit" className="w-full" disabled={createRole.isPending}>Add Role</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
