import express from "express";
import { rateLimit } from "../../middleware/rateLimit.js";
import { listAppsController, runAppController } from "./apps.controller.js";

const appsRouter = express.Router();

// /api/apps
appsRouter.get("/", listAppsController);
appsRouter.post("/:appId/run", rateLimit({ max: 20 }), runAppController);

export default appsRouter;
