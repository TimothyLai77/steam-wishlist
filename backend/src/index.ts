import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import gameRoutes from "./routes/game.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

// CORS middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Basic middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wishlists", wishlistRoutes);
app.use("/api", gameRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
