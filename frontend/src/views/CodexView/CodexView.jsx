import { useState } from "react";
import { Check, CircleAlert, Copy, Loader2, MessageSquarePlus, Play } from "lucide-react";
import { api, errorMessage } from "../../api";
import Markdown from "../../components/Markdown/Markdown";
import ui from "../../components/ui/ui.module.css";
import styles from "./CodexView.module.css";

// Must match the languages and modes the backend accepts.
const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Go", "PHP", "SQL", "HTML/CSS", "Bash"];

const MODES = [
  {
    id: "generate",
    label: "Write code",
    needsCode: false,
    promptLabel: "What should the code do?",
    promptPlaceholder: "e.g. A function that removes duplicate items from a list and keeps the order",
  },
  {
    id: "explain",
    label: "Explain",
    needsCode: true,
    promptLabel: "Anything specific to explain? (optional)",
    promptPlaceholder: "e.g. Why is the loop starting at 1?",
  },
  {
    id: "debug",
    label: "Fix bugs",
    needsCode: true,
    promptLabel: "Error message or problem (optional)",
    promptPlaceholder: "e.g. TypeError: Cannot read properties of undefined",
  },
  {
    id: "refactor",
    label: "Refactor",
    needsCode: true,
    promptLabel: "Goals (optional)",
    promptPlaceholder: "e.g. Make it shorter and add comments",
  },
  {
    id: "tests",
    label: "Write tests",
    needsCode: true,
    promptLabel: "Test framework or notes (optional)",
    promptPlaceholder: "e.g. Use Jest",
  },
  {
    id: "convert",
    label: "Convert",
    needsCode: true,
    promptLabel: "Notes (optional)",
    promptPlaceholder: "e.g. Keep the same function names",
    languageLabel: "Convert to",
  },
];

function CodexView({ onContinueInChat }) {
  const [modeId, setModeId] = useState("generate");
  const [language, setLanguage] = useState("JavaScript");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const mode = MODES.find((item) => item.id === modeId);

  async function run(event) {
    event.preventDefault();
    if (running) return;
    if (mode.id === "generate" && !prompt.trim()) {
      setError("Please describe what the code should do.");
      return;
    }
    if (mode.needsCode && !code.trim()) {
      setError("Please paste your code first.");
      return;
    }

    setRunning(true);
    setError("");
    try {
      const { data } = await api.post("/codex/run", { mode: mode.id, language, prompt, code });
      setResult({ ...data.data, prompt, code, modeLabel: mode.label });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function continueInChat() {
    const parts = [`${result.modeLabel} (${result.language})`];
    if (result.prompt) parts.push(result.prompt);
    if (result.code) parts.push("```\n" + result.code + "\n```");
    onContinueInChat({
      title: `Codex: ${result.modeLabel} ${result.language}`,
      messages: [
        { role: "user", content: parts.join("\n\n") },
        { role: "assistant", content: result.result },
      ],
    });
  }

  return (
    <div className={ui.page}>
      <div className={ui.inner}>
        <h1 className={ui.title}>Codex</h1>
        <p className={ui.subtitle}>
          Your coding helper. Write new code, explain old code, fix bugs, add tests or convert between languages.
        </p>

        <div className={styles.tabs} role="tablist" aria-label="What do you want to do?">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === modeId}
              className={`${styles.tab} ${item.id === modeId ? styles.tabActive : ""}`}
              onClick={() => {
                setModeId(item.id);
                setError("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.layout}>
          <form className={ui.card} onSubmit={run}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="codex-language">
                {mode.languageLabel || "Language"}
              </label>
              <select
                id="codex-language"
                className={ui.select}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {mode.needsCode && (
              <div className={ui.field}>
                <label className={ui.label} htmlFor="codex-code">
                  Your code
                </label>
                <textarea
                  id="codex-code"
                  className={`${ui.textarea} ${ui.mono}`}
                  value={code}
                  maxLength={20000}
                  spellCheck={false}
                  placeholder="Paste your code here"
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            )}

            <div className={ui.field}>
              <label className={ui.label} htmlFor="codex-prompt">
                {mode.promptLabel}
              </label>
              <textarea
                id="codex-prompt"
                className={ui.textarea}
                style={{ minHeight: 80 }}
                value={prompt}
                maxLength={4000}
                placeholder={mode.promptPlaceholder}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>

            <button type="submit" className={`${ui.btn} ${ui.primary}`} disabled={running}>
              {running ? <Loader2 size={16} className={ui.spin} /> : <Play size={16} />}
              {running ? "Working..." : mode.label}
            </button>
          </form>

          <div className={styles.output}>
            {error && (
              <div className={ui.error} role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
            {running && <div className={ui.empty}>The AI is working on it...</div>}
            {!running && !result && !error && <div className={ui.empty}>The answer will appear here.</div>}
            {!running && result && (
              <div className={ui.card}>
                <Markdown content={result.result} />
                <div className={ui.row} style={{ marginTop: 18 }}>
                  <button type="button" className={ui.btn} onClick={copyResult}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy all"}
                  </button>
                  <button type="button" className={ui.btn} onClick={continueInChat}>
                    <MessageSquarePlus size={15} /> Continue in chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodexView;
