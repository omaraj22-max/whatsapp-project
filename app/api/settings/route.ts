import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUBLIC_KEYS = [
  "META_ACCESS_TOKEN",
  "META_PHONE_NUMBER_ID",
  "META_WHATSAPP_BUSINESS_ACCOUNT_ID",
  "META_WEBHOOK_VERIFY_TOKEN",
  "MONDAY_API_TOKEN",
  "MONDAY_BOARD_ID",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_SYSTEM_PROMPT",
];

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    for (const key of PUBLIC_KEYS) {
      if (key in body && body[key] !== undefined) {
        const value = String(body[key]);
        const existing = await prisma.setting.findUnique({ where: { key } });
        if (existing) {
          await prisma.setting.update({ where: { key }, data: { value } });
        } else {
          await prisma.setting.create({ data: { key, value } });
        }
        process.env[key] = value;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al guardar settings" }, { status: 500 });
  }
}
