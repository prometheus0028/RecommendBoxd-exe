/**
 * A lightweight, zero-dependency, in-memory rate limiter.
 * Ideal for Next.js API routes without Redis.
 */
const rateCache = new Map();

// Run a garbage collection sweep every 60 seconds to prevent memory leaks
// from accumulating inactive IP addresses over time.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateCache.entries()) {
    if (now > record.resetTime) {
      rateCache.delete(ip);
    }
  }
}, 60 * 1000);

/**
 * Checks if an IP has exceeded the rate limit.
 * @param {string} ip - The client IP address
 * @param {number} limit - Maximum requests allowed in the time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { success: boolean, limit: number, remaining: number, reset: number }
 */
export function checkRateLimit(ip, limit = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  const record = rateCache.get(ip);

  // First time we're seeing this IP in the current window
  if (!record) {
    rateCache.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  // The time window has expired, reset their count
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1, reset: record.resetTime };
  }

  // They are within the time window and have exceeded the limit
  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetTime };
  }

  // They are within the time window and have NOT exceeded the limit
  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetTime };
}
