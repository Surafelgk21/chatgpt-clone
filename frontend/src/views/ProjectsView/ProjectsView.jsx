import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  FolderKanban,
  FolderPlus,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { api, errorMessage } from "../../api";
import ui from "../../components/ui/ui.module.css";
import styles from "./ProjectsView.module.css";

const TEMPLATES = [
  {
    name: "Study helper",
    instructions: "Explain things like a patient teacher. Use simple words and short examples. End with one question to check my understanding.",
  },
  {
    name: "Code reviewer",
    instructions: "Review the code I send. Point out bugs, security problems and unclear parts first, then suggest improvements with short code examples.",
  },
  {
    name: "Writing coach",
    instructions: "Help me improve my writing. Keep my voice. Give feedback in a short list, then show a better version.",
  },
];

const formatDate = (value) => {
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function ProjectsView({ onNewChatInProject, onOpenChat, onProjectDeleted, onChatDeleted }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null); // { mode: "create" | "edit", name, instructions }
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data.data || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setDetail(data.data);
    } catch (err) {
      setError(errorMessage(err));
      setSelectedId(null);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const body = { name: form.name, instructions: form.instructions };
      if (form.mode === "create") {
        const { data } = await api.post("/projects", body);
        setForm(null);
        await loadProjects();
        setSelectedId(data.data.id);
      } else {
        await api.put(`/projects/${selectedId}`, body);
        setForm(null);
        await Promise.all([loadProjects(), loadDetail(selectedId)]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    const { project, chats } = detail;
    const warning = chats.length
      ? `Delete "${project.name}" and its ${chats.length} chat${chats.length === 1 ? "" : "s"}? This cannot be undone.`
      : `Delete "${project.name}"?`;
    if (!window.confirm(warning)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      onProjectDeleted(project.id);
      setSelectedId(null);
      loadProjects();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteChat(chat) {
    if (!window.confirm(`Delete the chat "${chat.title}"?`)) return;
    try {
      await api.delete(`/chat/chats/${chat.id}`);
      onChatDeleted(chat.id);
      loadDetail(selectedId);
      loadProjects();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const errorBox = error && (
    <div className={ui.error} role="alert">
      <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{error}</span>
    </div>
  );

  const formCard = form && (
    <form className={ui.card} onSubmit={submitForm} style={{ marginBottom: 20 }}>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="project-name">Project name</label>
        <input
          id="project-name"
          className={ui.input}
          value={form.name}
          maxLength={100}
          autoFocus
          placeholder="e.g. Biology exam"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="project-instructions">Instructions (optional)</label>
        <textarea
          id="project-instructions"
          className={ui.textarea}
          value={form.instructions}
          maxLength={4000}
          placeholder="Tell the AI how to behave in every chat of this project."
          onChange={(event) => setForm({ ...form, instructions: event.target.value })}
        />
      </div>

      {form.mode === "create" && !form.name && !form.instructions && (
        <div className={ui.chips} style={{ marginBottom: 16 }}>
          {TEMPLATES.map((template) => (
            <button key={template.name} type="button" className={ui.chip} onClick={() => setForm({ ...form, ...template })}>
              {template.name}
            </button>
          ))}
        </div>
      )}

      <div className={ui.row}>
        <button type="submit" className={`${ui.btn} ${ui.primary}`} disabled={saving || !form.name.trim()}>
          {saving && <Loader2 size={16} className={ui.spin} />}
          {form.mode === "create" ? "Create project" : "Save changes"}
        </button>
        <button type="button" className={ui.btn} onClick={() => setForm(null)}>Cancel</button>
      </div>
    </form>
  );

  // ---------- one project ----------
  if (selectedId) {
    return (
      <div className={ui.page}>
        <div className={ui.inner}>
          <button
            type="button"
            className={ui.back}
            onClick={() => {
              setSelectedId(null);
              setForm(null);
              setError("");
            }}
          >
            <ArrowLeft size={16} /> All projects
          </button>

          {errorBox}
          {!detail && <div className={ui.empty}>Loading...</div>}

          {detail && (
            <>
              <h1 className={ui.title}>{detail.project.name}</h1>
              <p className={ui.subtitle} style={{ whiteSpace: "pre-wrap" }}>
                {detail.project.instructions || "No instructions yet. Add some so the AI follows them in every chat here."}
              </p>

              {formCard}

              <div className={ui.row} style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.primary}`}
                  onClick={() => onNewChatInProject({ id: detail.project.id, name: detail.project.name })}
                >
                  <MessageSquarePlus size={16} /> New chat in this project
                </button>
                <button
                  type="button"
                  className={ui.btn}
                  onClick={() => setForm({ mode: "edit", name: detail.project.name, instructions: detail.project.instructions || "" })}
                >
                  <Pencil size={15} /> Edit
                </button>
                <button type="button" className={`${ui.btn} ${ui.danger}`} onClick={deleteProject}>
                  <Trash2 size={15} /> Delete project
                </button>
              </div>

              <h2 className={styles.sectionTitle}>Chats in this project</h2>
              {detail.chats.length === 0 && (
                <div className={ui.empty}>No chats yet. Start one to use this project's instructions.</div>
              )}
              <ul className={styles.chatList}>
                {detail.chats.map((chat) => (
                  <li key={chat.id} className={styles.chatItem}>
                    <button type="button" className={styles.chatOpen} onClick={() => onOpenChat(chat.id)}>
                      <MessageSquare size={16} />
                      <span className={styles.chatName}>{chat.title}</span>
                      <span className={ui.muted}>{formatDate(chat.updated_at)}</span>
                    </button>
                    <button type="button" className={ui.iconBtn} onClick={() => deleteChat(chat)} aria-label={`Delete ${chat.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- all projects ----------
  return (
    <div className={ui.page}>
      <div className={ui.inner}>
        <h1 className={ui.title}>Projects</h1>
        <p className={ui.subtitle}>
          A project keeps related chats together and gives the AI standing instructions, so you do not have to repeat yourself.
        </p>

        {errorBox}
        {formCard}

        {!form && (
          <button
            type="button"
            className={`${ui.btn} ${ui.primary}`}
            style={{ marginBottom: 20 }}
            onClick={() => setForm({ mode: "create", name: "", instructions: "" })}
          >
            <FolderPlus size={16} /> New project
          </button>
        )}

        {loading && <div className={ui.empty}>Loading projects...</div>}
        {!loading && projects.length === 0 && !form && (
          <div className={ui.empty}>No projects yet. Create your first one.</div>
        )}

        <div className={ui.grid}>
          {projects.map((project) => (
            <button key={project.id} type="button" className={styles.projectCard} onClick={() => setSelectedId(project.id)}>
              <span className={styles.folder}>
                <FolderKanban size={20} />
              </span>
              <span className={styles.projectName}>{project.name}</span>
              <span className={styles.projectDesc}>
                {project.instructions || "No instructions"}
              </span>
              <span className={ui.muted}>
                {project.chat_count} chat{project.chat_count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectsView;
