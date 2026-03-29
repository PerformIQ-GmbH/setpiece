import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import teamsRouter from "./teams";
import playersRouter from "./players";
import templatesRouter from "./templates";
import setPiecesRouter from "./setPieces";
import rolesRouter from "./roles";
import matchdaysRouter from "./matchdays";
import sharingRouter from "./sharing";
import quizRouter from "./quiz";
import readinessRouter from "./readiness";
import ghostRouter from "./ghost";
import auditRouter from "./audit";
import pricingRouter from "./pricing";
import membershipsRouter from "./memberships";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(teamsRouter);
router.use(membershipsRouter);
router.use(playersRouter);
router.use(templatesRouter);
router.use(setPiecesRouter);
router.use(rolesRouter);
router.use(matchdaysRouter);
router.use(sharingRouter);
router.use(quizRouter);
router.use(readinessRouter);
router.use(ghostRouter);
router.use(auditRouter);
router.use(pricingRouter);

export default router;
