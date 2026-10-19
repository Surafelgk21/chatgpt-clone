import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Always load backend/.env, no matter which folder `node` is started from.
// This file must be the FIRST import in index.js so the variables exist
// before the database and Gemini modules read them.
// Real environment variables (e.g. on Render) are never overwritten.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });
