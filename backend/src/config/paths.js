import path from "node:path";
import { fileURLToPath } from "node:url";

// Absolute paths, independent of the folder `node` is started from.
export const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export const uploadsDir = path.join(backendRoot, "uploads");
export const imagesDir = path.join(uploadsDir, "images");
