import { explainDbError } from "../../db/db_config.js";

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Database problems: the real cause goes to the server log, the browser
  // gets a clear message that does not leak internals.
  if ((err?.code && String(err.code).startsWith("ER_")) || err?.code === "ECONNREFUSED") {
    const hint = explainDbError(err);
    if (hint) console.error("  -> Fix:", hint);
    return res.status(500).json({
      success: false,
      message: "The server could not reach its database. Please try again later.",
    });
  }

  const status = err.status || 500;
  const safeToShow = err.expose === true || status < 500;
  return res.status(status).json({
    success: false,
    message: safeToShow
      ? err.message
      : "Something went wrong on the server. Please try again later.",
  });
};

export default errorHandler;
