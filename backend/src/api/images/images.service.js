import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import db from "../../../db/db_config.js";
import { generateImage } from "../../services/ai.service.js";
import { imagesDir } from "../../config/paths.js";
import { httpError } from "../../utils/http.js";

const toPublic = (row) => ({
  id: row.id,
  prompt: row.prompt,
  url: `/uploads/images/${row.file_name}`,
  created_at: row.created_at,
});

export async function listImages() {
  const [rows] = await db.execute(
    `SELECT id, prompt, file_name, created_at FROM images ORDER BY id DESC LIMIT 100`,
  );
  return rows.map(toPublic);
}

export async function createImage(prompt) {
  const { buffer, mimeType, extension } = await generateImage(prompt);

  // Random file name: never trust user text as part of a file path.
  const fileName = `${crypto.randomUUID()}.${extension}`;
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.writeFile(path.join(imagesDir, fileName), buffer);

  try {
    const [result] = await db.execute(
      `INSERT INTO images (prompt, file_name, mime_type) VALUES (?, ?, ?)`,
      [prompt, fileName, mimeType],
    );
    const [rows] = await db.execute(
      `SELECT id, prompt, file_name, created_at FROM images WHERE id = ?`,
      [result.insertId],
    );
    return toPublic(rows[0]);
  } catch (error) {
    await fs.unlink(path.join(imagesDir, fileName)).catch(() => {});
    throw error;
  }
}

export async function deleteImage(id) {
  const [rows] = await db.execute(`SELECT file_name FROM images WHERE id = ?`, [id]);
  if (!rows.length) throw httpError(404, "Image not found");
  await db.execute(`DELETE FROM images WHERE id = ?`, [id]);
  await fs.unlink(path.join(imagesDir, path.basename(rows[0].file_name))).catch(() => {});
}
