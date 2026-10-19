import * as projectService from "./projects.service.js";
import { cleanText, ok, parseId } from "../../utils/http.js";

const readFields = (body) => ({
  name: cleanText(body?.name, { name: "Project name", max: 100 }),
  instructions: cleanText(body?.instructions, { name: "Instructions", max: 4000, required: false }),
});

export async function listProjectsController(req, res) {
  return ok(res, await projectService.listProjects(), "Projects fetched successfully");
}

export async function getProjectController(req, res) {
  return ok(res, await projectService.getProject(parseId(req.params.id)), "Project fetched successfully");
}

export async function createProjectController(req, res) {
  return ok(res, await projectService.createProject(readFields(req.body)), "Project created successfully", 201);
}

export async function updateProjectController(req, res) {
  return ok(res, await projectService.updateProject(parseId(req.params.id), readFields(req.body)), "Project updated");
}

export async function deleteProjectController(req, res) {
  await projectService.deleteProject(parseId(req.params.id));
  return ok(res, null, "Project deleted");
}
