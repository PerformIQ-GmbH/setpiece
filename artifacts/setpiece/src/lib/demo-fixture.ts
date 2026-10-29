// Deliberately fictional and read-only. Public demos never depend on a customer's
// team or on database seeding, and never submit player responses to the API.
export const demoTeam = { id: 'demo-team', name: 'FC Beispiel · U19', clubName: 'Fiktives Demoteam', tier: 'solo_coach' };
export const demoPlayers = [
  { id: 'demo-7', firstName: 'Spieler', lastName: '7', shirtNumber: 7, notes: 'Ausführender Spieler', tags: ['Flanken'] },
  { id: 'demo-9', firstName: 'Spieler', lastName: '9', shirtNumber: 9, notes: 'Erster Pfosten', tags: ['Kopfball'] },
  { id: 'demo-6', firstName: 'Spieler', lastName: '6', shirtNumber: 6, notes: 'Rückraum sichern', tags: ['Absicherung'] },
];
export const demoSetPiece = {
  id: 'demo-corner', teamId: demoTeam.id, title: 'Ecke · Erster Pfosten', category: 'corner_offensive', status: 'ready',
  description: 'Ein klarer Laufweg zum ersten Pfosten, mit Absicherung im Rückraum.', previewImageUrl: null,
  coachingNotes: 'Erst mit dem Anlauf des Schützen starten. Der Rückraum bleibt besetzt.',
  roles: [
    { id: 'role-7', name: 'Ecke ausführen', description: 'Gezielt an den ersten Pfosten flanken.', coachingPoint: 'Signal geben, Blickkontakt aufnehmen.', startPosition: { x: 94, y: 10 } },
    { id: 'role-9', name: 'Erster Pfosten', description: 'Mit dem Anlauf in den Raum am ersten Pfosten starten.', coachingPoint: 'Laufweg im richtigen Moment beginnen.', startPosition: { x: 60, y: 48 } },
    { id: 'role-6', name: 'Rückraum sichern', description: 'Vor dem Strafraum bleiben und zweite Bälle sichern.', coachingPoint: 'Absicherung vor dem Abschluss nicht aufgeben.', startPosition: { x: 42, y: 67 } },
  ],
  assignments: [{ roleId: 'role-7', playerId: 'demo-7' }, { roleId: 'role-9', playerId: 'demo-9' }, { roleId: 'role-6', playerId: 'demo-6' }],
  boardData: {
    annotations: [
      { id: 'run-9', type: 'run_path' as const, linkedRoleId: 'role-9', points: [{ x: 60, y: 48 }, { x: 65, y: 24 }], color: '#37d89a', strokeWidth: 3, dashed: true, arrowhead: true, layerOrder: 1 },
      { id: 'pass-7', type: 'pass_line' as const, points: [{ x: 94, y: 10 }, { x: 65, y: 24 }], color: '#f4f7f6', strokeWidth: 2, dashed: false, arrowhead: true, layerOrder: 2 },
    ],
    entities: [],
  },
};
export const demoMatchday = {
  id: 'demo-matchday', title: 'Nächstes Spiel · Beispiel', opponent: 'FC Gast (fiktiv)', date: '2026-11-07T13:00:00Z',
  notes: 'Dieses Spiel ist frei erfunden und dient nur der Demonstration.', setPieces: [demoSetPiece],
};
export const demoReadiness = {
  summary: { notOpened: 1, opened: 0, passed: 1, needsReview: 1 },
  details: demoPlayers.map((player, index) => ({ playerId: player.id, setPieceId: demoSetPiece.id, player, viewCount: index === 2 ? 0 : 1, status: ['passed', 'needs_review', 'not_opened'][index] })),
};

export function demoReadinessForAnswer(correct: boolean) {
  const details = demoReadiness.details.map(item => item.playerId === 'demo-9'
    ? { ...item, status: correct ? 'passed' : 'needs_review', viewCount: 1 }
    : { ...item });
  return {
    summary: {
      notOpened: details.filter(item => item.status === 'not_opened').length,
      opened: details.filter(item => item.status === 'opened').length,
      passed: details.filter(item => item.status === 'passed').length,
      needsReview: details.filter(item => item.status === 'needs_review').length,
    },
    details,
  };
}
