import { createHash } from "node:crypto";

type Json = Record<string, any>;
export interface ContentRole {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint: string | null;
  startPosition: { x: number; y: number } | null;
  movementPath: Array<{ x: number; y: number }> | null;
}
type Piece = { id: string; title: string; boardData?: Json | null; status?: string; description?: string | null; coachingNotes?: string | null };
export interface PublishedContent {
  version: string;
  requiredVariantIds: string[];
  boardData: Json;
  roles: ContentRole[];
  title: string;
  description?: string | null;
  coachingNotes?: string | null;
}

export class PublicationValidationError extends RangeError {}

function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const isVariantBoard = (board: Json | null | undefined): boolean => board?.schemaVersion === 2;
export function withoutPublication(board: Json | null | undefined): Json {
  const { publishedContent: _published, ...draft } = board ?? {};
  return structuredClone(draft);
}
export function preservePublication(board: Json, previous?: Json | null): Json {
  return { ...withoutPublication(board), ...(previous?.publishedContent ? { publishedContent: previous.publishedContent } : {}) };
}

/** A format-only autosave must not withdraw an already shared legacy routine. */
export function preserveLegacyPublication(piece: Piece, roles: ContentRole[]): PublishedContent {
  const content = { boardData: withoutPublication(piece.boardData), roles: structuredClone(roles), title: piece.title,
    description: piece.description, coachingNotes: piece.coachingNotes, requiredVariantIds: [] as string[] };
  return { ...content, version: hash(content) };
}

/** Cloning a set piece creates new DB role IDs, unlike copying a variant. */
export function remapBoardRoleIds(board: Json, roleIds: Map<string, string>): Json {
  const copy = withoutPublication(board);
  const remap = (id: string) => roleIds.get(id) ?? id;
  function remapVariant(value: Json) {
    if (Array.isArray(value.annotations)) for (const annotation of value.annotations) {
      for (const key of ["linkedRoleId", "snappedStartRef", "snappedEndRef"]) if (typeof annotation[key] === "string") annotation[key] = remap(annotation[key]);
    }
    if (value.roleTasks) value.roleTasks = Object.fromEntries(Object.entries(value.roleTasks).map(([id, task]) => [remap(id), task]));
    if (value.stepPositions) value.stepPositions = Object.fromEntries(Object.entries(value.stepPositions as Record<string, Json>).map(([stepId, positions]) => [stepId, Object.fromEntries(Object.entries(positions).map(([id, point]) => [remap(id), point]))]));
  }
  remapVariant(copy);
  if (Array.isArray(copy.variants)) for (const variant of copy.variants) remapVariant(variant);
  return copy;
}

/** Only the status publication route calls this; never accept a client snapshot. */
export function publishContent(piece: Piece, roles: ContentRole[], requestedIds?: string[]): PublishedContent {
  const boardData = withoutPublication(piece.boardData);
  const variants: Json[] = Array.isArray(boardData.variants) ? boardData.variants : [];
  if (!variants.length || variants.some(v => !v || typeof v.id !== "string" || !v.id || typeof v.name !== "string" || !v.name.trim()) || new Set(variants.map(v => v.id)).size !== variants.length) {
    throw new PublicationValidationError("Valid, unique variants are required for publication");
  }
  for (const variant of variants) {
    const steps = variant.steps ?? [];
    if (!Array.isArray(steps) || steps.some(step => !step || typeof step.id !== "string" || !step.id || !Number.isFinite(step.sortOrder)) ||
      new Set(steps.map(step => step.id)).size !== steps.length) {
      throw new PublicationValidationError("Each variant requires valid, unique animation steps");
    }
    if (variant.annotations != null && (!Array.isArray(variant.annotations) ||
      variant.annotations.some(annotation => !annotation || !Array.isArray(annotation.points) ||
        annotation.points.some((point: Json | null) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))))) {
      throw new PublicationValidationError("Variant annotations require valid points");
    }
    if (variant.entities != null && (!Array.isArray(variant.entities) ||
      variant.entities.some(entity => !entity?.position || !Number.isFinite(entity.position.x) || !Number.isFinite(entity.position.y)))) {
      throw new PublicationValidationError("Variant markers require valid positions");
    }
  }
  if (boardData.defaultVariantId != null && !variants.some(v => v.id === boardData.defaultVariantId)) throw new PublicationValidationError("Unknown default variant");
  const requiredVariantIds = requestedIds ?? variants.map(v => v.id);
  if (!Array.isArray(requiredVariantIds) || !requiredVariantIds.length || new Set(requiredVariantIds).size !== requiredVariantIds.length || requiredVariantIds.some(id => !variants.some(v => v.id === id))) {
    throw new PublicationValidationError("Required variants must belong to this set piece");
  }
  const content = { boardData, roles: structuredClone(roles), title: piece.title, description: piece.description, coachingNotes: piece.coachingNotes, requiredVariantIds };
  return { ...content, version: hash(content) };
}

export function playerContent(piece: Piece, roles: ContentRole[]): { piece: Piece; roles: ContentRole[]; publication?: PublishedContent } | null {
  if (piece.status !== "ready" && piece.status !== "active_matchday") return null;
  const publication = piece.boardData?.publishedContent as PublishedContent | undefined;
  if (publication) {
    // Deleted/reassigned roles cannot be resurrected by a publication snapshot.
    return { publication, piece: { ...piece, ...publication, boardData: publication.boardData }, roles: publication.roles.filter(role => roles.some(current => current.id === role.id)) };
  }
  if (isVariantBoard(piece.boardData)) return null;
  return { piece, roles };
}

export function variantTask(piece: Piece, role: ContentRole, variantId?: string) {
  const board = piece.boardData ?? {};
  if (!isVariantBoard(board)) {
    if (variantId) throw new RangeError("Unknown variant");
    return { variantId: undefined, variantName: undefined, contentVersion: undefined, role, boardData: board };
  }
  const variants: Json[] = board.variants ?? [];
  const selectedId = variantId ?? board.defaultVariantId ?? variants[0]?.id;
  const variant = variants.find(item => item.id === selectedId);
  if (!variant) throw new RangeError("Unknown variant");
  const steps: Json[] = [...(variant.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const task = variant.roleTasks?.[role.id] ?? {};
  const projectedRole = {
    ...role,
    description: typeof task.description === "string" ? task.description : role.description,
    coachingPoint: typeof task.coachingPoint === "string" ? task.coachingPoint : role.coachingPoint,
    startPosition: variant.stepPositions?.[steps[0]?.id]?.[role.id] ?? role.startPosition,
  };
  const { roleTasks: _otherRoleTasks, ...geometry } = variant;
  // Other roles' written instructions and editor selection do not invalidate this role.
  const contentVersion = hash({ setPieceId: piece.id, title: piece.title, description: piece.description, coachingNotes: piece.coachingNotes,
    variant: geometry, role: { id: role.id, name: role.name, description: projectedRole.description, coachingPoint: projectedRole.coachingPoint, startPosition: projectedRole.startPosition, movementPath: role.movementPath } });
  return { variantId: variant.id as string, variantName: variant.name as string, contentVersion, role: projectedRole,
    boardData: { id: variant.id, name: variant.name, activeVariantId: variant.id,
      recognitionCue: variant.recognitionCue, teamSignal: variant.teamSignal,
      annotations: variant.annotations, entities: variant.entities, steps: variant.steps,
      stepPositions: variant.stepPositions, entityStepPositions: variant.entityStepPositions } };
}

export type Task = ReturnType<typeof variantTask>;
export function taskScopeAnswer(task: Task, status: "passed" | "needs_review" | "opened", kind: "quiz" | "confirmation" = "quiz") {
  return { questionId: "__setpiece_task_scope_v2", answer: { variantId: task.variantId, contentVersion: task.contentVersion, status, kind }, correct: false };
}
type Attempt = { playerId: string; setPieceId: string; roleId: string | null; completedAt?: Date | null; createdAt?: Date; passed?: boolean | null; answers?: Array<{ questionId: string; answer: unknown }> | null };
export function taskReadiness(task: Task, attempts: Attempt[], playerId: string, setPieceId: string) {
  const matches = attempts.filter(a => a.playerId === playerId && a.setPieceId === setPieceId && a.roleId === task.role.id).flatMap(attempt => {
    const scope = attempt.answers?.find(a => a.questionId === "__setpiece_task_scope_v2")?.answer as Json | undefined;
    return scope && scope.variantId === task.variantId && scope.contentVersion === task.contentVersion ? [{ attempt, scope }] : [];
  }).sort((a, b) => new Date(b.attempt.completedAt ?? b.attempt.createdAt ?? 0).getTime() - new Date(a.attempt.completedAt ?? a.attempt.createdAt ?? 0).getTime()
    // A simultaneous request for help must never be hidden behind a passing answer.
    || Number(b.scope.status === "needs_review") - Number(a.scope.status === "needs_review"));
  const latest = matches[0];
  const status = latest?.scope.status === "needs_review" ? "needs_review" : latest?.scope.kind === "quiz" && latest.attempt.passed === true ? "passed" : latest ? "opened" : "not_opened";
  return { id: `task:${playerId}:${setPieceId}:${task.role.id}:${task.variantId}`, playerId, setPieceId, roleId: task.role.id, roleName: task.role.name, variantId: task.variantId, variantName: task.variantName,
    contentVersion: task.contentVersion, status, quizCompletedAt: latest?.scope.kind === "quiz" ? latest.attempt.completedAt ?? null : null };
}
export function aggregateTaskStatus(tasks: Array<{ status: string }>): "passed" | "needs_review" | "opened" | "not_opened" {
  if (!tasks.length || tasks.some(t => t.status === "not_opened")) return "not_opened";
  if (tasks.some(t => t.status === "needs_review")) return "needs_review";
  return tasks.every(t => t.status === "passed") ? "passed" : "opened";
}
