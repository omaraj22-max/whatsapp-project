import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTemplatesFromMeta } from "@/lib/whatsapp";

export async function POST() {
  try {
    if (!process.env.META_ACCESS_TOKEN) {
      return NextResponse.json({ error: "META_ACCESS_TOKEN no configurado" }, { status: 400 });
    }

    const data = await getTemplatesFromMeta();
    const metaTemplates = data?.data || [];

    let synced = 0;
    for (const mt of metaTemplates) {
      const existing = await prisma.template.findUnique({ where: { name: mt.name } });
      const payload = {
        waId: mt.id,
        status: mt.status?.toLowerCase() || "pending",
        category: mt.category,
        language: mt.language,
        components: mt.components || [],
        rejectedReason: mt.rejected_reason || null,
      };
      if (existing) {
        await prisma.template.update({ where: { name: mt.name }, data: payload });
      } else {
        await prisma.template.create({ data: { name: mt.name, ...payload } });
      }
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error("Template sync error:", error);
    return NextResponse.json({ error: "Error al sincronizar templates" }, { status: 500 });
  }
}
