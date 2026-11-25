// Deliberately fictional and read-only. Public demos never depend on a customer's
// team or on database seeding, and never submit player responses to the API.
import { FIFA_PITCH } from '../utils/pitchGeometry.ts';

// Half pitch, goal at the top: metres from the goal centre (x, positive towards the
// right corner) and from the goal line (y) become the stored 0-100 positions.
const pos = (x: number, y: number) => ({
  x: Math.round(((FIFA_PITCH.fieldWidth / 2 + x) / FIFA_PITCH.fieldWidth) * 1000) / 10,
  y: Math.round((y / (FIFA_PITCH.fieldLength / 2)) * 1000) / 10,
});

export const demoTeam = { id: 'demo-team', name: 'FC Beispiel · U19', clubName: 'Fiktives Demoteam', tier: 'solo_coach' };
export const demoPlayers = [
  { id: 'demo-7', firstName: 'Spieler', lastName: '7', shirtNumber: 7, notes: 'Ausführender Spieler', tags: ['Flanken'] },
  { id: 'demo-9', firstName: 'Spieler', lastName: '9', shirtNumber: 9, notes: 'Erster Pfosten', tags: ['Kopfball'] },
  { id: 'demo-6', firstName: 'Spieler', lastName: '6', shirtNumber: 6, notes: 'Rückraum sichern', tags: ['Absicherung'] },
  { id: 'demo-8', firstName: 'Spieler', lastName: '8', shirtNumber: 8, notes: 'Abschluss aus dem Rückraum', tags: ['Distanzschuss'] },
  { id: 'demo-10', firstName: 'Spieler', lastName: '10', shirtNumber: 10, notes: 'Ablage', tags: ['Passspiel'] },
  { id: 'demo-11', firstName: 'Spieler', lastName: '11', shirtNumber: 11, notes: 'Köder', tags: ['Laufwege'] },
  { id: 'demo-3', firstName: 'Spieler', lastName: '3', shirtNumber: 3, notes: 'Sichtschutz', tags: ['Zweikampf'] },
  { id: 'demo-4', firstName: 'Spieler', lastName: '4', shirtNumber: 4, notes: 'Sichtschutz', tags: ['Kopfball'] },
  { id: 'demo-5', firstName: 'Spieler', lastName: '5', shirtNumber: 5, notes: 'Sichtschutz', tags: ['Kopfball'] },
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
// Reel variant: short corner from the right, lay-off, flat shot from the edge of the box.
const shortRoles = [
  { id: 'short-role-7', name: 'Ecke kurz ausführen', description: 'Kurz und flach auf die 10 spielen.', coachingPoint: 'Flach und scharf spielen, damit die 10 den Ball mit dem ersten Kontakt weiterleiten kann.', startPosition: pos(32.5, 1.5) },
  { id: 'short-role-10', name: 'Ablage', description: 'Vor der Strafraumecke anbieten und den Ball mit dem ersten Kontakt quer zurücklegen.', coachingPoint: 'Körper zum Ball öffnen und direkt ablegen, ohne den Ball mitzunehmen.', startPosition: pos(18, 22) },
  { id: 'short-role-8', name: 'Abschluss aus dem Rückraum', description: 'Aus dem Rückraum starten, sobald die 10 den Ball annimmt, und flach an der Strafraumkante abschliessen.', coachingPoint: 'Nicht zu früh starten: Erst wenn die 10 den Ball annimmt. Flach abschliessen.', startPosition: pos(4, 24) },
  { id: 'short-role-11', name: 'Köder', description: 'Richtung Eckfahne laufen und den Bewacher mitziehen.', coachingPoint: 'Mit Tempo starten, damit der Gegenspieler wirklich folgt.', startPosition: pos(27, 14) },
  ...[[9, -7.5, 3.5], [3, -2.5, 4.5], [4, 2.5, 4.5], [5, 7.5, 3.5]].map(([n, x, y]) => ({
    id: `short-role-${n}`, name: 'Sichtschutz', description: 'Im Fünfer stehen und dem Torhüter die Sicht auf den Schützen nehmen.',
    coachingPoint: 'Ruhig stehen bleiben und die Sichtlinie versperren, nicht auf den Ball laufen.', startPosition: pos(x, y),
  })),
];
const shortSteps = [
  { id: 'short-1', label: 'Kurz auf die 10', sortOrder: 0 },
  { id: 'short-2', label: 'Ablage auf die 8', sortOrder: 1 },
  { id: 'short-3', label: 'Abschluss', sortOrder: 2 },
];
const line = (id: string, type: 'run_path' | 'pass_line', stepId: string, points: { x: number; y: number }[], extra: object = {}) => ({
  id, type, stepId, points, color: type === 'run_path' ? '#37d89a' : '#f4f7f6', strokeWidth: type === 'run_path' ? 3 : 2,
  dashed: type === 'run_path', arrowhead: true, layerOrder: 1, ...extra,
});
export const demoSetPieceShort = {
  id: 'demo-corner-short', teamId: demoTeam.id, title: 'Ecke · Kurz in den Rückraum', category: 'corner_offensive', status: 'ready',
  description: 'Kurz auf die 10, Ablage auf die 8 und flacher Abschluss an der Strafraumkante. Vier Spieler nehmen dem Torhüter die Sicht.', previewImageUrl: null,
  coachingNotes: 'Die 8 startet erst, wenn die 10 den Ball annimmt. Die 11 zieht ihren Bewacher Richtung Fahne. Abseits beachten: Beim Pass der 10 muss jeder Spieler im Fünfer mit mindestens zwei Gegenspielern (Torhüter eingerechnet) auf gleicher Höhe oder näher zur Torlinie stehen.',
  roles: shortRoles,
  assignments: [
    { roleId: 'short-role-7', playerId: 'demo-7' }, { roleId: 'short-role-10', playerId: 'demo-10' }, { roleId: 'short-role-8', playerId: 'demo-8' },
    { roleId: 'short-role-11', playerId: 'demo-11' }, { roleId: 'short-role-9', playerId: 'demo-9' }, { roleId: 'short-role-3', playerId: 'demo-3' },
    { roleId: 'short-role-4', playerId: 'demo-4' }, { roleId: 'short-role-5', playerId: 'demo-5' },
  ],
  boardData: {
    steps: shortSteps,
    annotations: [
      line('short-pass-7', 'pass_line', 'short-1', [pos(32.5, 1.5), pos(18, 22)], { snappedStartRef: 'ball-1' }),
      line('short-run-11', 'run_path', 'short-1', [pos(27, 14), pos(32, 8)], { linkedRoleId: 'short-role-11' }),
      line('short-run-8', 'run_path', 'short-2', [pos(4, 24), pos(11, 19.5)], { linkedRoleId: 'short-role-8' }),
      line('short-pass-10', 'pass_line', 'short-2', [pos(18, 22), pos(11, 19.5)], { snappedStartRef: 'ball-1' }),
      line('short-shot-8', 'pass_line', 'short-3', [pos(11, 19.5), pos(-3, 0)], { snappedStartRef: 'ball-1', strokeWidth: 3 }),
    ],
    entities: [
      { id: 'ball-1', type: 'ball' as const, position: pos(32.5, 1.5) },
      { id: 'gk-1', type: 'goalkeeper' as const, position: pos(0, 2) },
      { id: 'opp-1', type: 'opponent' as const, position: pos(25, 16) },
      { id: 'opp-2', type: 'opponent' as const, position: pos(21, 26) },
      { id: 'opp-3', type: 'opponent' as const, position: pos(3.5, 1.5) },
      { id: 'opp-4', type: 'opponent' as const, position: pos(-3.5, 1.5) },
      { id: 'opp-5', type: 'opponent' as const, position: pos(-6, 12) },
    ],
    entityStepPositions: {
      'short-1': { 'ball-1': pos(32.5, 1.5), 'opp-1': pos(25, 16) },
      'short-2': { 'ball-1': pos(18, 22), 'opp-1': pos(30, 10) },
      'short-3': { 'ball-1': pos(11, 19.5), 'opp-1': pos(30, 10) },
    },
  },
};
export const demoSetPieces = [demoSetPiece, demoSetPieceShort];

// One fictional quiz per demo piece; nothing is sent anywhere.
export const demoWalkthroughs = [
  {
    setPiece: demoSetPieceShort, playerId: 'demo-8', roleId: 'short-role-8', playerLabel: 'Spieler 8',
    board: 'Taktiktafel: Spieler 7 spielt kurz auf die 10, die 10 legt auf die 8 zurück, die 8 schliesst flach ab.',
    intro: 'Die 7 spielt kurz auf die 10. Die 10 legt mit dem ersten Kontakt auf die 8 zurück, die flach abschliesst. Jede Rolle bekommt eine klare Aufgabe.',
    question: 'Wann startest du aus dem Rückraum?', correct: 'Wenn die 10 den Ball annimmt', wrong: 'Sobald die 7 an den Ball geht',
    right: 'Richtig. Du startest, wenn die 10 den Ball annimmt, und schliesst flach an der Strafraumkante ab.',
    retry: 'Schau dir deine Rolle nochmals an: Du startest erst, wenn die 10 den Ball annimmt.',
    result: 'Spieler 8 · Rückraum',
  },
  {
    setPiece: demoSetPiece, playerId: 'demo-9', roleId: 'role-9', playerLabel: 'Spieler 9',
    board: 'Taktiktafel: Spieler 9 läuft zum ersten Pfosten, Spieler 6 sichert den Rückraum.',
    intro: 'Spieler 9 startet zum ersten Pfosten. Spieler 6 hält den Rückraum. Jede Rolle bekommt eine klare Aufgabe.',
    question: 'Wohin startest du mit dem Anlauf des Schützen?', correct: 'Zum ersten Pfosten', wrong: 'Im Rückraum bleiben',
    right: 'Richtig. Du startest zum ersten Pfosten. Die Absicherung übernimmt Spieler 6.',
    retry: 'Schau dir deine Rolle nochmals an: Den Rückraum sichert Spieler 6.',
    result: 'Spieler 9 · Erster Pfosten',
  },
];

export const demoMatchday = {
  id: 'demo-matchday', title: 'Nächstes Spiel · Beispiel', opponent: 'FC Gast (fiktiv)', date: '2026-11-07T13:00:00Z',
  notes: 'Dieses Spiel ist frei erfunden und dient nur der Demonstration.', setPieces: demoSetPieces,
};
export const demoReadiness = {
  summary: { notOpened: 1, opened: 0, passed: 1, needsReview: 1 },
  details: [
    ...demoPlayers.slice(0, 3).map((player, index) => ({ playerId: player.id, setPieceId: demoSetPiece.id, player, viewCount: index === 2 ? 0 : 1, status: ['passed', 'needs_review', 'not_opened'][index] })),
    { playerId: 'demo-8', setPieceId: demoSetPieceShort.id, player: demoPlayers[3], viewCount: 0, status: 'not_opened' },
  ],
};

export function demoReadinessForAnswer(correct: boolean, playerId = 'demo-9') {
  const details = demoReadiness.details.map(item => item.playerId === playerId
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
