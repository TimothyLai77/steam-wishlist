import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

// Load env ONCE from project root (single source of truth)
dotenv.config({ path: path.join(projectRoot, ".env") });

// Derive NODE_ENV from APP_ENV so existing code that checks NODE_ENV still works
const appEnv = process.env.APP_ENV ?? "development";
process.env.NODE_ENV = appEnv === "production" ? "production" : "development";

const isProduction = appEnv === "production";

import { existsSync } from "fs";

import express from "express";
import cors from "cors";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import gameRoutes from "./routes/game.routes.js";
import rssApiRoutes, { rssFeedRoutes } from "./routes/rss.routes.js";
import { startPriceRefreshJob } from "./services/price-refresh-job.js";

const app = express();

const PORT = process.env.PORT ?? 4000;

// CORS middleware - allow localhost:5173 for dev, same-origin for prod
const corsOrigin = isProduction
  ? true // In production, frontend and backend are same-origin (served by Express)
  : ["http://localhost:5173", "http://localhost:4000"];

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Basic middleware
app.use(express.json());

// Routes (API)
app.use("/api/auth", authRoutes);
app.use("/api/wishlists", wishlistRoutes);
app.use("/api", gameRoutes);
app.use("/api/rss", rssApiRoutes);

// Public RSS feed — must be registered before the production SPA fallback
// below, or the fallback route swallows it in production.
app.use("/rss", rssFeedRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Test DB connection
app.get("/db", async (_req, res) => {
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    res.json({ connected: true, userCount: count });
  } catch (err) {
    res.status(500).json({ connected: false, error: String(err) });
  }
});

// Serve the built frontend when a production build exists in
// frontend/dist (local "npm run build + serve" mode) or when running
// in production (Docker/deploy).
// projectRoot (computed at the top) is correct for both the tsx (src/)
// and compiled (dist/) layouts — do NOT derive this from __dirname here,
// which would resolve to backend/frontend/dist (a level too shallow).
const frontendDist = path.join(projectRoot, "frontend", "dist");
const hasFrontendBuild = existsSync(frontendDist);

if (isProduction || hasFrontendBuild) {
  // Serve static files
  app.use(express.static(frontendDist));

  // SPA fallback: serve index.html for all non-API routes
  app.get(/(.*)/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  if (isProduction || hasFrontendBuild) {
    console.log("Serving frontend build from frontend/dist");
  }

  // Start scheduled price refresh job
  startPriceRefreshJob();
});

export default app;
