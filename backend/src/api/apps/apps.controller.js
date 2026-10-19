import { APPS, publicCatalog } from "./apps.catalog.js";
import { generateText } from "../../services/ai.service.js";
import { cleanText, httpError, ok } from "../../utils/http.js";

export async function listAppsController(req, res) {
  return ok(res, publicCatalog(), "Apps fetched successfully");
}

// POST /api/apps/:appId/run  { inputs: { ...fields } }
export async function runAppController(req, res) {
  const app = APPS.find((item) => item.id === req.params.appId);
  if (!app) throw httpError(404, "App not found");

  const inputs = {};
  for (const field of app.fields) {
    const value = cleanText(req.body?.inputs?.[field.name], {
      name: field.label,
      max: field.type === "textarea" ? 12000 : 500,
      required: field.required,
    });
    if (field.type === "select" && value && !field.options.includes(value)) {
      throw httpError(400, `Choose a valid option for "${field.label}"`);
    }
    inputs[field.name] = value;
  }

  const { text } = await generateText({
    contents: app.prompt(inputs),
    systemInstruction: app.system,
  });

  return ok(res, {
    appId: app.id,
    appName: app.name,
    prompt: app.prompt(inputs),
    result: text,
  });
}
