import express from "express";
import { rateLimit } from "../../middleware/rateLimit.js";
import {
  deleteReportController,
  getReportController,
  listReportsController,
  startResearchController,
} from "./research.controller.js";

const researchRouter = express.Router();

// /api/research
researchRouter.get("/", listReportsController);
researchRouter.post("/", rateLimit({ max: 5 }), startResearchController);
researchRouter.get("/:id", getReportController);
researchRouter.delete("/:id", deleteReportController);

export default researchRouter;
