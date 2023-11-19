import type { Config } from "drizzle-kit";

export default {
  schema: "./src/connections/database/schema.ts",
  out: "./src/connections/database/migrations",
} satisfies Config;
