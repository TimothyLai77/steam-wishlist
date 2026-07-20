import { defineConfig } from "prisma/config";
import { loadEnvConfig } from "@react-native-dotenv/async-storage";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
