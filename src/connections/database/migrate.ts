import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { settings } from "../../lib/settings";
import postgres from "postgres";

const migrationClient = postgres(settings.DB_CONNECTION_URL, { max: 1 });
migrate(drizzle(migrationClient), {
  migrationsFolder: "src/connections/database/migrations",
});
