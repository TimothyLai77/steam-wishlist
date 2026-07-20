import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const sqliteUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// Create adapter with config directly
const adapter = new PrismaLibSql({ url: sqliteUrl });

// Singleton: reuse the same Prisma client across modules and dev restarts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
