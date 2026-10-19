import db from "../../../../db/db_config.js";
import { generateText } from "../../../services/ai.service.js";
import { httpError } from "../../../utils/http.js";

const HISTORY_LIMIT = 12; // how many earlier messages Gemini sees per chat

// A chat title is the first line of the first question, shortened.
const makeTitle = (text) => {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}...` : oneLine || "New chat";
};

// Escape % and _ so a search for "100%" does not match everything.
const likePattern = (text) => `%${text.replace(/[!%_]/g, "!$&")}%`;

const getChatRow = async (id) => {
  const [rows] = await db.execute(
    `SELECT c.id, c.title, c.project_id, c.created_at, c.updated_at, p.name AS project_name
       FROM chats c LEFT JOIN projects p ON p.id = c.project_id
      WHERE c.id = ?`,
    [id],
  );
  return rows[0] || null;
};

const getMessageById = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, role, content, created_at FROM conversations WHERE id = ?`,
    [id],
  );
  return rows[0];
};

// project: "none" = chats outside any project, a number = one project, empty = all
export async function listChats({ project } = {}) {
  let where = "";
  const params = [];
  if (project === "none") {
    where = "WHERE c.project_id IS NULL";
  } else if (project) {
    where = "WHERE c.project_id = ?";
    params.push(project);
  }
  const [rows] = await db.execute(
    `SELECT c.id, c.title, c.project_id, c.created_at, c.updated_at
       FROM chats c ${where}
      ORDER BY c.updated_at DESC, c.id DESC LIMIT 200`,
    params,
  );
  return rows;
}

export async function getChat(id) {
  const chat = await getChatRow(id);
  if (!chat) throw httpError(404, "Chat not found");
  const [messages] = await db.execute(
    `SELECT id, role, content, created_at FROM conversations WHERE chat_id = ? ORDER BY id`,
    [id],
  );
  return { chat, messages };
}

// Create a chat, optionally pre-filled (used by "Continue in chat" buttons).
export async function createChat({ title, projectId, messages = [] }) {
  if (projectId) {
    const [projects] = await db.execute(`SELECT id FROM projects WHERE id = ?`, [projectId]);
    if (!projects.length) throw httpError(404, "Project not found");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.execute(
      `INSERT INTO chats (title, project_id) VALUES (?, ?)`,
      [makeTitle(title || messages.find((m) => m.role === "user")?.content || "New chat"), projectId || null],
    );
    for (const message of messages) {
      await connection.execute(
        `INSERT INTO conversations (chat_id, role, content) VALUES (?, ?, ?)`,
        [created.insertId, message.role, message.content],
      );
    }
    await connection.commit();
    return getChat(created.insertId);
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export async function renameChat(id, title) {
  const [result] = await db.execute(`UPDATE chats SET title = ? WHERE id = ?`, [title, id]);
  if (result.affectedRows === 0) throw httpError(404, "Chat not found");
  return getChatRow(id);
}

export async function deleteChat(id) {
  const [result] = await db.execute(`DELETE FROM chats WHERE id = ?`, [id]);
  if (result.affectedRows === 0) throw httpError(404, "Chat not found");
}

// Send a question. Starts a new chat when chatId is not given.
export async function sendMessage({ chatId, projectId, question }) {
  let chat = null;
  let history = [];
  let effectiveProjectId = projectId || null;

  if (chatId) {
    chat = await getChatRow(chatId);
    if (!chat) throw httpError(404, "Chat not found");
    effectiveProjectId = chat.project_id;

    const [rows] = await db.execute(
      `SELECT role, content FROM conversations
        WHERE chat_id = ? ORDER BY id DESC LIMIT ${HISTORY_LIMIT}`,
      [chatId],
    );
    history = rows.reverse();
  }

  // Project instructions are given to Gemini as a system instruction.
  let systemInstruction;
  if (effectiveProjectId) {
    const [projects] = await db.execute(
      `SELECT instructions FROM projects WHERE id = ?`,
      [effectiveProjectId],
    );
    if (!projects.length) throw httpError(404, "Project not found");
    systemInstruction = projects[0].instructions?.trim() || undefined;
  }

  const contents = history.map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));
  // The conversation sent to Gemini must start with a user message.
  while (contents.length && contents[0].role !== "user") contents.shift();
  contents.push({ role: "user", parts: [{ text: question }] });

  // Ask Gemini first. If it fails nothing is saved, so the database never
  // holds a question without an answer.
  const { text, totalTokens } = await generateText({ contents, systemInstruction });

  const connection = await db.getConnection();
  let newChatId = chatId;
  let userId;
  let assistantId;
  try {
    await connection.beginTransaction();

    if (!newChatId) {
      const [created] = await connection.execute(
        `INSERT INTO chats (title, project_id) VALUES (?, ?)`,
        [makeTitle(question), effectiveProjectId],
      );
      newChatId = created.insertId;
    }

    const [userInsert] = await connection.execute(
      `INSERT INTO conversations (chat_id, role, content) VALUES (?, 'user', ?)`,
      [newChatId, question],
    );
    const [assistantInsert] = await connection.execute(
      `INSERT INTO conversations (chat_id, role, content, token_count) VALUES (?, 'assistant', ?, ?)`,
      [newChatId, text, totalTokens],
    );
    await connection.execute(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newChatId]);

    await connection.commit();
    userId = userInsert.insertId;
    assistantId = assistantInsert.insertId;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }

  return {
    chat: await getChatRow(newChatId),
    userMessage: await getMessageById(userId),
    assistantMessage: await getMessageById(assistantId),
  };
}

// Search chat titles and message text.
export async function searchChats(query) {
  const pattern = likePattern(query);
  const [rows] = await db.execute(
    `SELECT c.id, c.title, c.project_id, c.updated_at,
            (SELECT m.content FROM conversations m
              WHERE m.chat_id = c.id AND m.content LIKE ? ESCAPE '!'
              ORDER BY m.id LIMIT 1) AS match_content
       FROM chats c
      WHERE c.title LIKE ? ESCAPE '!'
         OR EXISTS (SELECT 1 FROM conversations m
                     WHERE m.chat_id = c.id AND m.content LIKE ? ESCAPE '!')
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT 30`,
    [pattern, pattern, pattern],
  );

  const needle = query.toLowerCase();
  return rows.map(({ match_content, ...chat }) => {
    let snippet = null;
    if (match_content) {
      const at = match_content.toLowerCase().indexOf(needle);
      const start = Math.max(0, at - 40);
      const end = Math.min(match_content.length, at + needle.length + 80);
      snippet =
        (start > 0 ? "..." : "") +
        match_content.slice(start, end).replace(/\s+/g, " ") +
        (end < match_content.length ? "..." : "");
    }
    return { ...chat, snippet };
  });
}
