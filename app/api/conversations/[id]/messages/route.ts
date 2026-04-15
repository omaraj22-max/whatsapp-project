import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/whatsapp";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { content, type = "text" } = await request.json();

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Send via WhatsApp API
    let waMessageId: string | undefined;
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) {
      try {
        const res = await sendTextMessage(conversation.contact.phone, content);
        waMessageId = res?.messages?.[0]?.id;
      } catch (err) {
        console.error("WhatsApp send error:", err);
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        direction: "outbound",
        type,
        content,
        status: waMessageId ? "sent" : "pending",
        waMessageId,
        sentBy: "human",
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
