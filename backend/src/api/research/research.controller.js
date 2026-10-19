import * as researchService from "./research.service.js";
import { cleanText, httpError, ok, parseId } from "../../utils/http.js";

export async function listReportsController(req, res) {
  return ok(res, await researchService.listReports(), "Reports fetched successfully");
}

export async function getReportController(req, res) {
  return ok(res, await researchService.getReport(parseId(req.params.id)), "Report fetched successfully");
}

// POST /api/research  { topic }  -> 202, then poll GET /api/research/:id
export async function startResearchController(req, res) {
  const topic = cleanText(req.body?.topic, { name: "Research topic", max: 500 });
  if (topic.length < 3) {
    throw httpError(400, "Please describe the topic in a few more words");
  }
  return ok(res, await researchService.startResearch(topic), "Research started", 202);
}

export async function deleteReportController(req, res) {
  await researchService.deleteReport(parseId(req.params.id));
  return ok(res, null, "Report deleted");
}
