import express from "express";
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  listProjectsController,
  updateProjectController,
} from "./projects.controller.js";

const projectsRouter = express.Router();

// /api/projects
projectsRouter.get("/", listProjectsController);
projectsRouter.post("/", createProjectController);
projectsRouter.get("/:id", getProjectController);
projectsRouter.put("/:id", updateProjectController);
projectsRouter.delete("/:id", deleteProjectController);

export default projectsRouter;
