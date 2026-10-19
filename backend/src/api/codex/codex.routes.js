import express from "express";
import { rateLimit } from "../../middleware/rateLimit.js";
import { runCodexController } from "./codex.controller.js";

const codexRouter = express.Router();

// /api/codex
codexRouter.post("/run", rateLimit({ max: 20 }), runCodexController);

export default codexRouter;
