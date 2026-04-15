import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteTemplate as waDeleteTemplate } from "@/lib/whatsapp";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { name, category, language, components } = await request.json();
    const template = await prisma.template.update({
      where: { id },
      data: { name, category, language, components, status: "pending" },
    });
    return NextResponse.json(template);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from Meta if configured
    if (template.waId && process.env.META_ACCESS_TOKEN) {
      try {
        await waDeleteTemplate(template.name);
      } catch (err) {
        console.error("Meta delete error:", err);
      }
    }

    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
