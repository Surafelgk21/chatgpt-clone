import { generateText } from "../../services/ai.service.js";
import { cleanText, httpError, ok } from "../../utils/http.js";

export const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Go", "PHP", "SQL", "HTML/CSS", "Bash",
];

// Each mode: does it need existing code, and what do we ask the model?
const MODES = {
  generate: {
    needsCode: false,
    ask: ({ language, prompt }) => `Write ${language} code for this task:\n\n${prompt}`,
  },
  explain: {
    needsCode: true,
    ask: ({ language, prompt, code }) =>
      `Explain this ${language} code step by step, in simple language. ${prompt ? `Focus on: ${prompt}` : ""}\n\n${fence(language, code)}`,
  },
  debug: {
    needsCode: true,
    ask: ({ language, prompt, code }) =>
      `Find the bugs in this ${language} code and fix them. ${prompt ? `Problem or error message: ${prompt}` : ""}\n` +
      `First say what is wrong, then give the full corrected code.\n\n${fence(language, code)}`,
  },
  refactor: {
    needsCode: true,
    ask: ({ language, prompt, code }) =>
      `Refactor this ${language} code to be cleaner, safer and easier to read. Keep the behavior the same. ${prompt}\n\n${fence(language, code)}`,
  },
  tests: {
    needsCode: true,
    ask: ({ language, prompt, code }) =>
      `Write unit tests for this ${language} code using a popular test framework. Cover normal cases and edge cases. ${prompt}\n\n${fence(language, code)}`,
  },
  convert: {
    needsCode: true,
    ask: ({ language, prompt, code }) =>
      `Convert this code to ${language}. Keep the behavior the same and follow ${language} best practices. ${prompt}\n\n${fence("", code)}`,
  },
};

const fence = (language, code) => "```" + language.toLowerCase() + "\n" + code + "\n```";

const SYSTEM =
  "You are an expert senior software engineer. Be accurate and practical. " +
  "Reply in Markdown. Put all code in fenced code blocks with the language name. " +
  "Keep explanations short. Do not invent libraries or functions that do not exist.";

// POST /api/codex/run  { mode, language, prompt?, code? }
export async function runCodexController(req, res) {
  const { mode, language } = req.body ?? {};
  const config = MODES[mode];
  if (!config) throw httpError(400, "Choose a valid mode");
  if (!LANGUAGES.includes(language)) throw httpError(400, "Choose a valid language");

  const prompt = cleanText(req.body?.prompt, {
    name: "Description",
    max: 4000,
    required: mode === "generate",
  });
  const code = cleanText(req.body?.code, {
    name: "Code",
    max: 20000,
    required: config.needsCode,
  });

  const { text } = await generateText({
    contents: config.ask({ language, prompt, code }),
    systemInstruction: SYSTEM,
  });

  return ok(res, { mode, language, result: text });
}
