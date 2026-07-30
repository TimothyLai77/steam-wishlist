import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import gameRoutes from "./routes/game.routes.js";

// Load .env from project root (../ relative to backend/src/)
dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT ?? 4000;

// Determine if running in production
const isProduction = process.env.NODE_ENV === "production";

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

// Serve built frontend in production
if (isProduction) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.resolve(__dirname, "../frontend/dist");

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
  if (isProduction) {
    console.log("Serving frontend in production mode");
  }
});

export default app;
