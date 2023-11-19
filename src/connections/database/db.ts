import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { settings } from "../../lib/settings";

const queryClient = postgres(settings.DB_CONNECTION_URL);
export const db = drizzle(queryClient, { schema });
