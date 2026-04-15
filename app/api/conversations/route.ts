import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: "Error al obtener conversaciones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { phone, name } = await request.json();

    let contact = await prisma.contact.findUnique({ where: { phone } });
    if (!contact) {
      contact = await prisma.contact.create({ data: { phone, name } });
    }

    const existing = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: "open" },
    });

    if (existing) return NextResponse.json(existing);

    const conversation = await prisma.conversation.create({
      data: { contactId: contact.id },
      include: { contact: true },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 });
  }
}
