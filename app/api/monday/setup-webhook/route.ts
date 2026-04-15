import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhook } from "@/lib/monday";
import { headers } from "next/headers";

async function getSetting(key: string): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value || process.env[key] || "";
}

export async function POST(request: Request) {
  try {
    const boardId = await getSetting("MONDAY_BOARD_ID");
    if (!boardId) {
      return NextResponse.json({ error: "MONDAY_BOARD_ID no configurado" }, { status: 400 });
    }

    const headersList = await headers();
    const host = headersList.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/webhooks/monday`;

    await createWebhook(boardId, webhookUrl, "create_item");
    await createWebhook(boardId, webhookUrl, "change_column_value");

    return NextResponse.json({ ok: true, webhookUrl });
  } catch (error) {
    console.error("Monday webhook setup error:", error);
    return NextResponse.json({ error: "Error al configurar webhook" }, { status: 500 });
  }
}
