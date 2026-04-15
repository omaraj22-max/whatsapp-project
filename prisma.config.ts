import { defineConfig } from "@prisma/config";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_q5LSOlzisHg4@ep-shy-tooth-an7k22i5-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export default defineConfig({
  datasource: {
    url: DATABASE_URL,
  },
});
