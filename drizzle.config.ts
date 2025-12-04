import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseFile = process.env.DATABASE_URL ?? path.join(process.cwd(), "local.sqlite");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFile,
  },
});
