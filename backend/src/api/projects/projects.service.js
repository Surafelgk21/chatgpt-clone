import db from "../../../db/db_config.js";
import { httpError } from "../../utils/http.js";

const getProjectRow = async (id) => {
  const [rows] = await db.execute(
    `SELECT p.id, p.name, p.instructions, p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM chats c WHERE c.project_id = p.id) AS chat_count
       FROM projects p WHERE p.id = ?`,
    [id],
  );
  return rows[0] || null;
};

export async function listProjects() {
  const [rows] = await db.execute(
    `SELECT p.id, p.name, p.instructions, p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM chats c WHERE c.project_id = p.id) AS chat_count
       FROM projects p ORDER BY p.updated_at DESC, p.id DESC`,
  );
  return rows;
}

export async function getProject(id) {
  const project = await getProjectRow(id);
  if (!project) throw httpError(404, "Project not found");
  const [chats] = await db.execute(
    `SELECT id, title, project_id, created_at, updated_at
       FROM chats WHERE project_id = ? ORDER BY updated_at DESC, id DESC`,
    [id],
  );
  return { project, chats };
}

export async function createProject({ name, instructions }) {
  const [result] = await db.execute(
    `INSERT INTO projects (name, instructions) VALUES (?, ?)`,
    [name, instructions || null],
  );
  return getProjectRow(result.insertId);
}

export async function updateProject(id, { name, instructions }) {
  const [result] = await db.execute(
    `UPDATE projects SET name = ?, instructions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, instructions || null, id],
  );
  if (result.affectedRows === 0) throw httpError(404, "Project not found");
  return getProjectRow(id);
}

// Deleting a project also deletes its chats (the database cascades).
export async function deleteProject(id) {
  const [result] = await db.execute(`DELETE FROM projects WHERE id = ?`, [id]);
  if (result.affectedRows === 0) throw httpError(404, "Project not found");
}
