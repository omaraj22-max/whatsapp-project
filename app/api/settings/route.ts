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
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        });
        // Also set as process env for current runtime
        process.env[key] = String(body[key]);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al guardar settings" }, { status: 500 });
  }
}
