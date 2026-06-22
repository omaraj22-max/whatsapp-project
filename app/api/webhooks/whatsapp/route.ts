import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhook, parseWebhookPayload, markMessageRead } from "@/lib/whatsapp";
import { generateReply, buildConversationHistory, extractLeadData } from "@/lib/openai";
import { runWorkflowsForInboundMessage } from "@/lib/workflows";
import { getSetting } from "@/lib/settings";
import { sendLeadToSheets } from "@/lib/sheets";

// ─── GET: Webhook verification ────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode") || "";
  const token = searchParams.get("hub.verify_token") || "";
  const challenge = searchParams.get("hub.challenge") || "";

  const result = verifyWebhook(mode, token, challenge);
  if (result) {
    return new Response(result, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Receive messages ───────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const inboundMessages = parseWebhookPayload(body);

    for (const inbound of inboundMessages) {
      await processInboundMessage(inbound);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

async function processInboundMessage(inbound: {
  from: string;
  messageId: string;
  timestamp: string;
  type: string;
  text?: string;
  caption?: string;
  mediaId?: string;
}) {
  const phone = inbound.from;

  let contact = await prisma.contact.findUnique({ where: { phone } });
  const isNewContact = !contact;
  if (!contact) {
    contact = await prisma.contact.create({ data: { phone } });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id, status: { in: ["open", "waiting"] } },
  });

  const isNewConversation = !conversation;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        status: "open",
        agentMode: "ai", // Default AI mode for Alex agent
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      waMessageId: inbound.messageId,
      direction: "inbound",
      type: inbound.type,
      content: inbound.text || inbound.caption || `[${inbound.type}]`,
      metadata: inbound.mediaId ? { mediaId: inbound.mediaId } : undefined,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  try {
    await markMessageRead(inbound.messageId);
  } catch {
    // Non-critical
  }

  // Send new lead to Google Sheets immediately
  if (isNewContact || isNewConversation) {
    const sheetsUrl = await getSetting("SHEETS_WEBHOOK_URL");
    if (sheetsUrl) {
      await sendLeadToSheets(sheetsUrl, {
        phone,
        qualification: "pendiente",
        conversationId: conversation.id,
        lastMessage: inbound.text || "",
      });
    }
  }

  if (inbound.text) {
    await runWorkflowsForInboundMessage(phone, inbound.text, conversation.id);
  }

  await handleAIAgent(conversation.id, phone, inbound.text);
}

async function handleAIAgent(
  conversationId: string,
  phone: string,
  userText?: string
) {
  if (!userText) return;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (conversation) {
    conversation.messages = conversation.messages.reverse();
  }

  if (!conversation) return;

  let shouldRespond = false;

  if (conversation.agentMode === "ai") {
    shouldRespond = true;
  } else if (conversation.agentMode === "auto") {
    const config = conversation.agentConfig as Record<string, unknown> | null;
    if (config?.mode === "keyword" && config.keyword) {
      shouldRespond = userText.toLowerCase().includes(String(config.keyword).toLowerCase());
    } else if (config?.mode === "timeout" && config.timeoutMinutes) {
      const lastHumanMsg = conversation.messages
        .filter((m: { direction: string; sentBy: string | null }) => m.direction === "outbound" && m.sentBy === "human")
        .pop();
      if (!lastHumanMsg) {
        shouldRespond = true;
      } else {
        const diffMins = (Date.now() - new Date(lastHumanMsg.createdAt).getTime()) / 60000;
        shouldRespond = diffMins >= Number(config.timeoutMinutes);
      }
    }
  }

  if (!shouldRespond) return;

  try {
    const systemPrompt = await getSetting("OPENAI_SYSTEM_PROMPT");
    const openaiKey = await getSetting("OPENAI_API_KEY");
    if (!openaiKey) return;

    const history = buildConversationHistory(conversation.messages);
    const reply = await generateReply(history, systemPrompt || undefined, openaiKey);

    if (!reply) return;

    const accessToken = await getSetting("META_ACCESS_TOKEN");
    const phoneNumberId = await getSetting("META_PHONE_NUMBER_ID");
    let waMessageId: string | undefined;

    if (accessToken && phoneNumberId) {
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
            type: "text",
            text: { body: reply },
          }),
        }
      );
      const data = await res.json() as { messages?: { id: string }[] };
      waMessageId = data?.messages?.[0]?.id;
    }

    await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        type: "text",
        content: reply,
        status: waMessageId ? "sent" : "pending",
        waMessageId,
        sentBy: "ai",
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Update Google Sheets after every AI reply to capture new data immediately
    const sheetsUrl = await getSetting("SHEETS_WEBHOOK_URL");
    if (sheetsUrl) {
      const updatedHistory = [
        ...buildConversationHistory(conversation.messages),
        { role: "assistant" as const, content: reply },
      ];
      const leadData = await extractLeadData(updatedHistory, phone, openaiKey);
      await sendLeadToSheets(sheetsUrl, { ...leadData, conversationId, phone });
    }
  } catch (err) {
    console.error("AI agent error:", err);
  }
}
