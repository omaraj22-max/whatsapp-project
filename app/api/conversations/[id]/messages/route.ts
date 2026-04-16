import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

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

    // Read credentials from DB (so they update without redeploying)
    const accessToken = await getSetting("META_ACCESS_TOKEN");
    const phoneNumberId = await getSetting("META_PHONE_NUMBER_ID");

    let waMessageId: string | undefined;
    if (accessToken && phoneNumberId) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: conversation.contact.phone,
              type: "text",
              text: { body: content },
            }),
          }
        );
        const data = await res.json() as { messages?: { id: string }[] };
        waMessageId = data?.messages?.[0]?.id;
        if (!res.ok) console.error("WhatsApp send error:", data);
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
