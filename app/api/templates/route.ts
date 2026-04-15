import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTemplate } from "@/lib/whatsapp";

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, category, language, components } = await request.json();

    // Submit to Meta
    let waId: string | undefined;
    if (process.env.META_ACCESS_TOKEN && process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID) {
      try {
        const res = await createTemplate({ name, category, language, components });
        waId = res?.id;
      } catch (err) {
        console.error("Meta template creation error:", err);
      }
    }

    const template = await prisma.template.create({
      data: {
        name,
        category,
        language,
        components,
        waId,
        status: waId ? "pending" : "pending",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear template" }, { status: 500 });
  }
}
