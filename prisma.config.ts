import { defineConfig } from "@prisma/config";
import { PrismaNeon } from "@prisma/adapter-neon";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
