// Small helpers shared by every controller.

// An error whose message is safe and useful to show in the browser.
export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

// Validate an id coming from a URL or request body.
export function parseId(value, label = "id") {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(400, `Invalid ${label}`);
  }
  return number;
}

// Validate and trim a text field.
export function cleanText(value, { name, max, required = true }) {
  if (value === undefined || value === null || value === "") {
    if (required) throw httpError(400, `${name} is required`);
    return "";
  }
  if (typeof value !== "string") throw httpError(400, `${name} must be text`);
  const text = value.trim();
  if (!text && required) throw httpError(400, `${name} is required`);
  if (text.length > max) {
    throw httpError(400, `${name} is too long (maximum ${max} characters)`);
  }
  return text;
}

// Success response in the same shape the frontend already expects.
export const ok = (res, data, message = "OK", status = 200) =>
  res.status(status).json({ success: true, message, data });
