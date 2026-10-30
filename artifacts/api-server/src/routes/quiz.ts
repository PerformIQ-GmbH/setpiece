import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  playersTable,
  quizAttemptsTable,
  playerReadinessTable,
  auditEventsTable,
} from "@workspace/db";
import { requireShareToken, isSetPieceInShareScope } from "../lib/authorization";
import { z } from "zod/v4";

const router: IRouter = Router();

const submitQuizSchema = z.object({
  playerId: z.string().min(1),
  setPieceId: z.string().min(1),
  roleId: z.string().optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.any(),
  })),
});
const quizQuerySchema = z.object({
  setPieceId: z.string().min(1),
  playerId: z.string().min(1).optional(),
});

async function findPlayerRole(
  roles: Array<typeof setPieceRolesTable.$inferSelect>,
  playerId: string,
  requestedRoleId?: string,
) {
  const candidates = requestedRoleId ? roles.filter((role) => role.id === requestedRoleId) : roles;
  if (candidates.length === 0) return null;
  const [assignment] = await db.select().from(roleAssignmentsTable).where(and(
    eq(roleAssignmentsTable.playerId, playerId),
    inArray(roleAssignmentsTable.roleId, candidates.map((role) => role.id)),
  ));
  return assignment ? candidates.find((role) => role.id === assignment.roleId) ?? null : null;
}

interface QuizQuestion {
  id: string;
  type: "tap_zone" | "yes_no";
  prompt: string;
  correctAnswer: unknown;
}

function generateQuizQuestions(
  role: { name: string; startPosition: { x: number; y: number } | null; coachingPoint: string | null; movementPath: Array<{ x: number; y: number }> | null },
  setPieceTitle: string,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  if (role.startPosition) {
    questions.push({
      id: "q1_start_zone",
      type: "tap_zone",
      prompt: `Tap your start position for "${setPieceTitle}"`,
      correctAnswer: role.startPosition,
    });
  }

  questions.push({
    id: "q3_understand",
    type: "yes_no",
    prompt: `Do you understand your role as ${role.name}?`,
    correctAnswer: true,
  });

  if (role.coachingPoint) {
    questions.push({
      id: "q4_coaching",
      type: "yes_no",
      prompt: `Key coaching point: "${role.coachingPoint}" — Got it?`,
      correctAnswer: true,
    });
  }

  return questions;
}

function scoreAnswers(
  submitted: Array<{ questionId: string; answer: unknown }>,
  canonical: QuizQuestion[],
): { score: number; correct: number; total: number; passed: boolean; gradedAnswers: Array<{ questionId: string; answer: unknown; correct: boolean }> } {
  const total = canonical.length;
  let correct = 0;
  const gradedAnswers = [];

  for (const q of canonical) {
    const submittedAnswer = submitted.find((a) => a.questionId === q.id);
    let isCorrect = false;

    if (submittedAnswer) {
      if (q.type === "yes_no") {
        const ans = submittedAnswer.answer;
        const normalised = ans === true || ans === "yes" || ans === "true";
        isCorrect = normalised === q.correctAnswer;
      } else if (q.type === "tap_zone") {
        const target = q.correctAnswer as { x: number; y: number };
        const answer = submittedAnswer.answer as { x: number; y: number };
        if (answer && typeof answer.x === "number" && typeof answer.y === "number") {
          const dist = Math.sqrt(Math.pow(target.x - answer.x, 2) + Math.pow(target.y - answer.y, 2));
          isCorrect = dist <= 15;
        }
      }
    }

    if (isCorrect) correct++;
    gradedAnswers.push({
      questionId: q.id,
      answer: submittedAnswer?.answer ?? null,
      correct: isCorrect,
    });
  }

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    score: percentage,
    correct,
    total,
    passed: correct >= Math.ceil(total * 0.7),
    gradedAnswers,
  };
}

router.get("/p/:shareToken/quiz", async (req, res): Promise<void> => {
  const link = await requireShareToken(req, res);
  if (!link) return;

  const parsed = quizQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid setPieceId and playerId query parameters are required" });
    return;
  }
  const { setPieceId, playerId } = parsed.data;
  const resolvePlayerId = playerId || (link.playerScope?.length ? link.playerScope[0] : null);
  if (resolvePlayerId && link.playerScope?.length && !link.playerScope.includes(resolvePlayerId)) {
    res.status(403).json({ error: "Player not in scope for this link" });
    return;
  }

  if (!(await isSetPieceInShareScope(link, setPieceId))) {
    res.status(403).json({ error: "Set piece not in scope for this link" });
    return;
  }

  const [setPiece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, link.teamId)));

  if (!setPiece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  let playerRole: typeof roles[0] | null = null;
  if (resolvePlayerId) {
    const [player] = await db.select({ id: playersTable.id }).from(playersTable).where(and(
      eq(playersTable.id, resolvePlayerId), eq(playersTable.teamId, link.teamId),
    ));
    if (!player) {
      res.status(403).json({ error: "Player does not belong to this team" });
      return;
    }
    playerRole = await findPlayerRole(roles, resolvePlayerId);
  }

  const questions = playerRole
    ? generateQuizQuestions(playerRole, setPiece.title)
    : [];

  const safeQuestions = questions.map(({ correctAnswer, ...q }) => q);

  res.json({
    setPieceId,
    roleId: playerRole?.id ?? null,
    questions: safeQuestions,
  });
});

router.post("/p/:shareToken/quiz", async (req, res): Promise<void> => {
  const link = await requireShareToken(req, res);
  if (!link) return;

  const parsed = submitQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { playerId, setPieceId, roleId, answers } = parsed.data;

  if (link.playerScope && link.playerScope.length > 0 && !link.playerScope.includes(playerId)) {
    res.status(403).json({ error: "Player not in scope for this link" });
    return;
  }

  if (!(await isSetPieceInShareScope(link, setPieceId))) {
    res.status(403).json({ error: "Set piece not in scope for this link" });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.id, playerId), eq(playersTable.teamId, link.teamId)));
  if (!player) {
    res.status(403).json({ error: "Player does not belong to this team" });
    return;
  }

  const [setPiece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, link.teamId)));

  if (!setPiece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  const playerRole = await findPlayerRole(roles, playerId, roleId);

  if (!playerRole) {
    res.status(400).json({ error: "No role assignment found for this player on this set piece" });
    return;
  }

  const canonicalQuestions = generateQuizQuestions(playerRole, setPiece.title);

  const { score, correct, total, passed, gradedAnswers } = scoreAnswers(answers, canonicalQuestions);

  const [attempt] = await db
    .insert(quizAttemptsTable)
    .values({
      playerId,
      setPieceId,
      roleId: playerRole.id,
      completedAt: new Date(),
      passed,
      score,
      answers: gradedAnswers,
    })
    .returning();

  await db.insert(playerReadinessTable).values({
      playerId,
      setPieceId,
      roleId: playerRole.id,
      status: passed ? "passed" : "needs_review",
      quizCompletedAt: new Date(),
      viewCount: 0,
    }).onConflictDoUpdate({
      target: [playerReadinessTable.playerId, playerReadinessTable.setPieceId],
      set: { roleId: playerRole.id, status: passed ? "passed" : "needs_review", quizCompletedAt: new Date() },
    });

  await db.insert(auditEventsTable).values({
    teamId: link.teamId,
    eventType: "quiz_submitted",
    entityType: "quiz_attempt",
    entityId: attempt.id,
    metadata: { playerId, setPieceId, passed, score },
  });

  res.json({ passed, score, correct, total });
});

export default router;
