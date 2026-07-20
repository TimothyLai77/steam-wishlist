import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const sqliteUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// Create adapter with config directly
const adapter = new PrismaLibSql({ url: sqliteUrl });

// Singleton Prisma client
export const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

export default prisma;
