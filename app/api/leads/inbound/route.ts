import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const data = await request.json() as {
      phone?: string;
      name?: string;
      source?: string;
    };

    const rawPhone = data.phone || "";
    const phone = rawPhone.replace(/\D/g, "");
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    // Find or create contact
    let contact = await prisma.contact.findUnique({ where: { phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { phone, name: data.name || null },
      });
    } else if (data.name && !contact.name) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: { name: data.name },
      });
    }

    // Find or create open conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: { in: ["open", "waiting"] } },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { contactId: contact.id, status: "open", agentMode: "ai" },
      });
    }

    // Send welcome template
    const templateName = await getSetting("WELCOME_TEMPLATE_NAME");
    const accessToken = await getSetting("META_ACCESS_TOKEN");
    const phoneNumberId = await getSetting("META_PHONE_NUMBER_ID");

    if (templateName && accessToken && phoneNumberId) {
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
            to: phone,
            type: "template",
            template: {
              name: templateName,
              language: { code: "es" },
            },
          }),
        }
      );
      const result = await res.json() as { messages?: { id: string }[] };
      const waMessageId = result?.messages?.[0]?.id;

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "outbound",
          type: "template",
          content: `[Template: ${templateName}]`,
          status: waMessageId ? "sent" : "pending",
          waMessageId,
          sentBy: "ai",
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    console.error("Leads inbound error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
