import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load env from project root for Prisma CLI operations (migrations, etc.)
dotenv.config({ path: path.join(projectRoot, ".env") });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});

