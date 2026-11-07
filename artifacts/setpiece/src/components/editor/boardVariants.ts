import type { BoardData, BoardVariant, Point, RolePositionSource, StepPositions, VariantBoardData } from './types';
import { findRoleRun } from './editorInteraction.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function normalizeVariant(raw: Partial<BoardVariant>, roles: RolePositionSource[], name: string): BoardVariant {
  const variant = structuredClone(raw);
  const steps = Array.isArray(variant.steps) && variant.steps.length
    ? variant.steps.sort((a, b) => a.sortOrder - b.sortOrder)
    : [{ id: crypto.randomUUID(), label: 'Step 1', sortOrder: 0 }];
  const validIds = new Set(steps.map(step => step.id));
  const annotations = (Array.isArray(variant.annotations) ? variant.annotations : []).map(annotation =>
    validIds.has(annotation.stepId ?? '') ? annotation : { ...annotation, stepId: steps[0].id });
  const entities = Array.isArray(variant.entities) ? variant.entities : [];
  const stepPositions: StepPositions = isRecord(variant.stepPositions) ? variant.stepPositions : {};
  const entityStepPositions: StepPositions = isRecord(variant.entityStepPositions) ? variant.entityStepPositions : {};
  for (const role of roles) {
    let position: Point = {
      x: role.startPosition?.x ?? role.position?.x ?? 50,
      y: role.startPosition?.y ?? role.position?.y ?? 50,
    };
    for (const step of steps) {
      const positions = stepPositions[step.id] ??= {};
      position = positions[role.id] ?? position;
      positions[role.id] = { ...position };
      const run = findRoleRun(role.id, annotations.filter(annotation => annotation.stepId === step.id));
      if (run) position = run.points[run.points.length - 1];
    }
  }
  for (const step of steps) {
    const positions = entityStepPositions[step.id] ??= {};
    for (const entity of entities) positions[entity.id] ??= { ...entity.position };
  }
  return {
    ...variant, id: typeof variant.id === 'string' ? variant.id : crypto.randomUUID(),
    name: typeof variant.name === 'string' ? variant.name : name,
    recognitionCue: typeof variant.recognitionCue === 'string' ? variant.recognitionCue : '',
    teamSignal: typeof variant.teamSignal === 'string' ? variant.teamSignal : '',
    roleTasks: isRecord(variant.roleTasks) ? variant.roleTasks : {},
    annotations, entities, steps, stepPositions, entityStepPositions,
  };
}

/** Migrate without changing the caller's data or dropping extension fields. */
export function loadBoardData(input: Partial<BoardData> | null | undefined, roles: RolePositionSource[] = []): VariantBoardData {
  const board = structuredClone(input ?? {});
  const variants = Array.isArray(board.variants) && board.variants.length
    ? board.variants.map((variant, index) => normalizeVariant(variant, roles, `Variante ${index + 1}`))
    : [normalizeVariant({ annotations: board.annotations, entities: board.entities, steps: board.steps,
      stepPositions: board.stepPositions, entityStepPositions: board.entityStepPositions }, roles, 'Variante A')];
  const defaultVariantId = variants.some(variant => variant.id === board.defaultVariantId)
    ? board.defaultVariantId! : variants[0].id;
  const activeVariantId = variants.some(variant => variant.id === board.activeVariantId)
    ? board.activeVariantId! : defaultVariantId;
  const requiredVariantIds = Array.isArray(board.requiredVariantIds)
    ? [...new Set(board.requiredVariantIds.filter(id => variants.some(variant => variant.id === id)))]
    : variants.map(variant => variant.id);
  if (!requiredVariantIds.length) requiredVariantIds.push(defaultVariantId);
  const migrated = { ...board, schemaVersion: 2 as const, variants, defaultVariantId, activeVariantId, requiredVariantIds };
  return projectBoardVariant(migrated, activeVariantId);
}

/** Explicit unknown IDs fail closed; the player default is independent of editor selection. */
export function projectBoardVariant(board: Partial<BoardData>, variantId?: string): VariantBoardData {
  if (!board.variants?.length) {
    const migrated = loadBoardData(board);
    if (variantId) throw new RangeError('Unbekannte Variante');
    return migrated;
  }
  const id = variantId ?? board.defaultVariantId ?? board.variants[0].id;
  const variant = board.variants.find(candidate => candidate.id === id);
  if (!variant) throw new RangeError('Unbekannte Variante');
  return {
    ...structuredClone(board), schemaVersion: 2,
    variants: structuredClone(board.variants),
    requiredVariantIds: structuredClone(board.requiredVariantIds ?? board.variants.map(candidate => candidate.id)),
    defaultVariantId: board.defaultVariantId ?? board.variants[0].id,
    activeVariantId: variant.id,
    annotations: structuredClone(variant.annotations), entities: structuredClone(variant.entities),
    steps: structuredClone(variant.steps), stepPositions: structuredClone(variant.stepPositions),
    entityStepPositions: structuredClone(variant.entityStepPositions),
  };
}

/** Flush the editor's active working fields before persistence. */
export function serializeBoardData(board: VariantBoardData): VariantBoardData {
  const variant = board.variants.find(candidate => candidate.id === board.activeVariantId);
  if (!variant) throw new RangeError('Unbekannte aktive Variante');
  const variants = board.variants.map(candidate => candidate.id !== board.activeVariantId ? candidate : {
    ...candidate, annotations: board.annotations, entities: board.entities, steps: board.steps,
    stepPositions: board.stepPositions, entityStepPositions: board.entityStepPositions,
  });
  return projectBoardVariant({ ...board, variants }, board.activeVariantId);
}

export function duplicateBoardVariant(source: BoardVariant, name = `${source.name} Kopie`): BoardVariant {
  const copy = structuredClone(source);
  const stepIds = new Map(copy.steps.map(step => [step.id, crypto.randomUUID()]));
  const remap = (positions: StepPositions): StepPositions => Object.fromEntries(
    Object.entries(positions).map(([id, points]) => [stepIds.get(id) ?? id, points]));
  return {
    ...copy, id: crypto.randomUUID(), name,
    steps: copy.steps.map(step => ({ ...step, id: stepIds.get(step.id)! })),
    annotations: copy.annotations.map(annotation => ({ ...annotation, id: crypto.randomUUID(),
      stepId: annotation.stepId ? stepIds.get(annotation.stepId) ?? annotation.stepId : undefined })),
    stepPositions: remap(copy.stepPositions), entityStepPositions: remap(copy.entityStepPositions),
  };
}
