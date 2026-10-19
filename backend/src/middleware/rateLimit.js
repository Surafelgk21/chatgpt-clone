// Tiny in-memory rate limiter. It protects your Gemini quota from accidental
// loops or button spamming. (For a public site, use a shared store instead.)
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({
        success: false,
        message: "You are sending requests too quickly. Please wait a moment and try again.",
      });
    }
    next();
  };
}
