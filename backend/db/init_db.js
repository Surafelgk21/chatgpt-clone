import mysql from "mysql2/promise";
import db, { dbConfig } from "./db_config.js";

// Creates the database (if the MySQL user is allowed to) and every table the
// app needs. Safe to run on every start: it never deletes data, and it
// upgrades an older database (a single flat list of messages) automatically.
export async function initDatabase() {
  const { database, ...serverConfig } = dbConfig;

  if (!database) {
    throw new Error("DB_DATABASE is not set in backend/.env");
  }

  // 1. Create the database if it does not exist yet. Skip quietly when the
  //    user has no permission - the table step below will then report clearly.
  let connection;
  try {
    connection = await mysql.createConnection(serverConfig);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, "``")}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (error) {
    console.warn("Could not auto-create the database:", error.message);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }

  const tableOptions = "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";

  // 2. Projects: a folder of chats that share custom instructions.
  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(100) NOT NULL,
      instructions TEXT NULL,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ${tableOptions}
  `);

  // 3. Chats: one row per conversation shown in the sidebar.
  await db.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NULL,
      title      VARCHAR(255) NOT NULL DEFAULT 'New chat',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chats_project (project_id),
      INDEX idx_chats_updated (updated_at),
      CONSTRAINT fk_chats_project FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE
    ) ${tableOptions}
  `);

  // 4. Messages (kept under the original table name so old data survives).
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      role        ENUM('user', 'assistant') NOT NULL,
      content     LONGTEXT NOT NULL,
      token_count INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ${tableOptions}
  `);
  await upgradeConversationsTable();

  // 5. Images made in the Images tab (the files live in backend/uploads/images).
  await db.query(`
    CREATE TABLE IF NOT EXISTS images (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      prompt     TEXT NOT NULL,
      file_name  VARCHAR(255) NOT NULL,
      mime_type  VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ${tableOptions}
  `);

  // 6. Deep research reports.
  await db.query(`
    CREATE TABLE IF NOT EXISTS research_reports (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      topic         VARCHAR(500) NOT NULL,
      status        ENUM('running', 'done', 'error') NOT NULL DEFAULT 'running',
      progress      TEXT NULL,
      report        LONGTEXT NULL,
      sources       TEXT NULL,
      error_message VARCHAR(500) NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at   TIMESTAMP NULL DEFAULT NULL
    ) ${tableOptions}
  `);

  // A report still "running" at startup was cut off by a restart.
  await db.query(
    `UPDATE research_reports
        SET status = 'error', error_message = 'Interrupted by a server restart. Please run it again.'
      WHERE status = 'running'`,
  );
}

// Older versions stored every message in one flat list. Add the chat_id column
// and move those old messages into a single chat so nothing is lost.
async function upgradeConversationsTable() {
  const [columns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'chat_id'`,
  );

  if (columns.length === 0) {
    await db.query(
      `ALTER TABLE conversations ADD COLUMN chat_id INT NULL AFTER id, ADD INDEX idx_conversations_chat (chat_id)`,
    );
  }

  const [[{ orphans }]] = await db.query(
    `SELECT COUNT(*) AS orphans FROM conversations WHERE chat_id IS NULL`,
  );
  if (orphans > 0) {
    const [created] = await db.query(
      `INSERT INTO chats (title) VALUES ('Earlier conversation')`,
    );
    await db.query(`UPDATE conversations SET chat_id = ? WHERE chat_id IS NULL`, [
      created.insertId,
    ]);
  }

  await db.query(`ALTER TABLE conversations MODIFY chat_id INT NOT NULL`);

  const [constraints] = await db.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations'
        AND CONSTRAINT_NAME = 'fk_conversations_chat'`,
  );
  if (constraints.length === 0) {
    await db.query(
      `ALTER TABLE conversations
         ADD CONSTRAINT fk_conversations_chat FOREIGN KEY (chat_id)
         REFERENCES chats(id) ON DELETE CASCADE`,
    );
  }
}
