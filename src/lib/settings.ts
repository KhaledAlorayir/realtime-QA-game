import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const SettingsSchema = z.object({
  DB_CONNECTION_URL: z.string().trim(),
  JWT_SECRET: z.string().trim(),
});

export const settings = SettingsSchema.parse(process.env);
