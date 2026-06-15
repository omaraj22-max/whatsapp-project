import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTemplate } from "@/lib/whatsapp";
import { getSetting } from "@/lib/settings";

export async function GET() {
  try {
    const accessToken = await getSetting("META_ACCESS_TOKEN");
    const wabaId = await getSetting("META_WHATSAPP_BUSINESS_ACCOUNT_ID");

    if (accessToken && wabaId) {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${wabaId}/message_templates?fields=id,name,category,language,status,rejected_reason,components&limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const data = await res.json() as { data: { id: string; name: string; category: string; language: string; status: string; rejected_reason?: string; components: object[] }[] };
        const metaTemplates = data.data || [];

        for (const mt of metaTemplates) {
          const payload = {
            waId: mt.id,
            status: mt.status?.toLowerCase() || "pending",
            category: mt.category,
            language: mt.language,
            components: mt.components || [],
            rejectedReason: mt.rejected_reason || null,
          };
          const existing = await prisma.template.findUnique({ where: { name: mt.name } });
          if (existing) {
            await prisma.template.update({ where: { name: mt.name }, data: payload });
          } else {
            await prisma.template.create({ data: { name: mt.name, ...payload } });
          }
        }

        return NextResponse.json(metaTemplates.map((mt) => ({
          id: mt.id,
          name: mt.name,
          category: mt.category,
          language: mt.language,
          status: mt.status?.toLowerCase(),
          components: mt.components,
        })));
      }
    }

    // Fallback to DB if Meta credentials not set
    const templates = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });
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
