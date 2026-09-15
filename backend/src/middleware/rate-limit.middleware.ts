import rateLimit from "express-rate-limit";

/**
 * Limiter for `POST /api/auth/login`.
 *
 * The prime brute-force target: a single IP may attempt 10 logins per
 * 15-minute window before receiving `429 Too Many Requests`.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

/**
 * Limiter for `POST /api/auth/register`.
 *
 * Looser than the login limiter; exists mainly to slow down account
 * spam from a single IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many accounts created, please try again later." },
});
