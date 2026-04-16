import { prisma } from "./prisma";

/**
 * Get a setting value — DB first, then process.env as fallback.
 */
export async function getSetting(key: string): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    if (s?.value) return s.value;
  } catch {
    // fallback to env
  }
  return process.env[key] || "";
}
