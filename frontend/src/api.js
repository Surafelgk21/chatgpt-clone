import axios from "axios";

// Backend address. Set VITE_API_URL in frontend/.env (see .env.example).
export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3777").replace(/\/$/, "");

export const api = axios.create({ baseURL: `${API_BASE}/api` });

// Images are saved by the backend and served from /uploads.
export const assetUrl = (path) => `${API_BASE}${path}`;

// A readable message for any failed request.
export function errorMessage(error) {
  if (error?.response) {
    return error.response.data?.message || "Something went wrong. Please try again.";
  }
  // No response at all means the browser could not reach the backend.
  return `Cannot reach the server at ${API_BASE}. Make sure the backend is running and VITE_API_URL is correct.`;
}

// Save text as a file in the browser (used for reports).
export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
