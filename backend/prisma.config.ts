import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Try loading from project root (dev) or container root (Docker)
dotenv.config({ path: "../.env" });
dotenv.config({ path: "./.env" });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});

