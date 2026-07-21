import express from "express";
import dotenv from "dotenv";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

// Basic middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

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
