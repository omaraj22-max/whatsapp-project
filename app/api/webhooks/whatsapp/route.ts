import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhook, parseWebhookPayload, markMessageRead } from "@/lib/whatsapp";
import { generateReply, buildConversationHistory } from "@/lib/openai";
import { sendTextMessage } from "@/lib/whatsapp";
import { runWorkflowsForInboundMessage } from "@/lib/workflows";

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
    return NextResponse.json({ status: "ok" }); // Always return 200 to Meta
  }
}

async function processInboundMessage(inbound: {
  from: string;
  messageId: string;
  timestamp: string;
  type: string;
  text?: string;
}) {
  const phone = inbound.from;

  // Upsert contact
  const contact = await prisma.contact.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  // Get or create open conversation
  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id, status: { in: ["open", "waiting"] } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        status: "open",
        agentMode: "human",
      },
    });
  }

  // Save inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      waMessageId: inbound.messageId,
      direction: "inbound",
      type: inbound.type,
      content: inbound.text || `[${inbound.type}]`,
    },
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // Mark as read
  try {
    await markMessageRead(inbound.messageId);
  } catch {
    // Non-critical
  }

  // Run keyword workflows
  if (inbound.text) {
    await runWorkflowsForInboundMessage(phone, inbound.text, conversation.id);
  }

  // AI agent handling
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
        orderBy: { createdAt: "asc" },
        take: 30,
      },
    },
  });

  if (!conversation) return;

  let shouldRespond = false;

  if (conversation.agentMode === "ai") {
    shouldRespond = true;
  } else if (conversation.agentMode === "auto") {
    const config = conversation.agentConfig as Record<string, unknown> | null;
    if (config?.mode === "keyword" && config.keyword) {
      shouldRespond = userText.toLowerCase().includes(String(config.keyword).toLowerCase());
    } else if (config?.mode === "timeout" && config.timeoutMinutes) {
      // Check last human message time
      const lastHumanMsg = conversation.messages
        .filter((m) => m.direction === "outbound" && m.sentBy === "human")
        .pop();

      if (!lastHumanMsg) {
        shouldRespond = true;
      } else {
        const diffMins =
          (Date.now() - new Date(lastHumanMsg.createdAt).getTime()) / 60000;
        shouldRespond = diffMins >= Number(config.timeoutMinutes);
      }
    }
  }

  if (!shouldRespond) return;

  try {
    const systemPrompt = process.env.OPENAI_SYSTEM_PROMPT;
    const history = buildConversationHistory(conversation.messages);
    const reply = await generateReply(history, systemPrompt);

    if (!reply) return;

    // Send via WhatsApp
    const res = await sendTextMessage(phone, reply);
    const waMessageId = res?.messages?.[0]?.id;

    // Save AI message
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
  } catch (err) {
    console.error("AI agent error:", err);
  }
}
