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
      await prisma.template.upsert({
        where: { name: mt.name },
        update: {
          waId: mt.id,
          status: mt.status?.toLowerCase() || "pending",
          category: mt.category,
          language: mt.language,
          components: mt.components || [],
          rejectedReason: mt.rejected_reason || null,
        },
        create: {
          waId: mt.id,
          name: mt.name,
          category: mt.category,
          language: mt.language,
          status: mt.status?.toLowerCase() || "pending",
          components: mt.components || [],
          rejectedReason: mt.rejected_reason || null,
        },
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error("Template sync error:", error);
    return NextResponse.json({ error: "Error al sincronizar templates" }, { status: 500 });
  }
}
