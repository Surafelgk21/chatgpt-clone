import "./src/config/loadEnv.js"; // must stay first: loads backend/.env
import express from "express";
import cors from "cors";

import db, { explainDbError } from "./db/db_config.js";
import { initDatabase } from "./db/init_db.js";
import mainRouter from "./src/api/main.routes.js";
import errorHandler from "./src/middleware/errorHandler.js";
import { uploadsDir } from "./src/config/paths.js";

const app = express();
const PORT = process.env.PORT || 3777;

// Comma-separated list of allowed origins, e.g. https://my-app.vercel.app
// Leave unset to allow all origins (fine for testing, tighten for production).
const allowedOrigins = process.env.CORS_ORIGIN?.trim()
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : "*";

app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: allowedOrigins }));

// Generated images are served from backend/uploads
app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", mainRouter);
app.use(errorHandler);

async function startServer() {
  try {
    await initDatabase(); // creates the database and every table if missing

    const connection = await db.getConnection();
    console.log("Database connection successful");
    connection.release();

    if (!process.env.API_KEY) {
      console.warn("WARNING: API_KEY (Gemini) is not set in backend/.env - answers will fail.");
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error in connecting to the database:", error.message);
    const hint = explainDbError(error);
    if (hint) console.error("  -> Fix:", hint);
    process.exit(1); // let the host show a failed deploy instead of a silent dead server
  }
}
startServer();
