import mysql from "mysql2/promise";

// One shared connection config, used by the pool AND by init_db.js.
export const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
  connectTimeout: 10000,
 ssl: ["true", "required"].includes(
  String(process.env.DB_SSL || "").toLowerCase()
)
  ? { rejectUnauthorized: false }
  : undefined,
};

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

// Turn raw MySQL errors into a message that says what to change.
export function explainDbError(error) {
  switch (error?.code) {
    case "ER_ACCESS_DENIED_ERROR":
      return "Wrong DB_USER or DB_PASSWORD in backend/.env (or that MySQL user cannot log in from this host).";
    case "ER_BAD_DB_ERROR":
      return `Database "${dbConfig.database}" does not exist. Create it or fix DB_DATABASE in backend/.env.`;
    case "ECONNREFUSED":
      return `MySQL is not running on ${dbConfig.host}:${dbConfig.port}. Start MySQL or check DB_HOST / DB_PORT.`;
    case "ENOTFOUND":
      return `DB_HOST "${dbConfig.host}" could not be found.`;
    case "ETIMEDOUT":
      return "Connection to MySQL timed out. Check DB_HOST / DB_PORT, and DB_SSL for hosted databases.";
    case "ER_NO_SUCH_TABLE":
      return "The conversations table is missing. Restart the backend so it can create it.";
    default:
      return null;
  }
}

export default db;
