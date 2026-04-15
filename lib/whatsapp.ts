const BASE_URL = "https://graph.facebook.com/v20.0";

function getPhoneNumberId() {
  return process.env.META_PHONE_NUMBER_ID!;
}

function getAccessToken() {
  return process.env.META_ACCESS_TOKEN!;
}

function getWABAId() {
  return process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID!;
}

async function apiRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: object
) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || `WhatsApp API error ${res.status}`
    );
  }
  return data;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function sendTextMessage(to: string, text: string) {
  return apiRequest("POST", `/${getPhoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: object[] = []
) {
  return apiRequest("POST", `/${getPhoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

export async function markMessageRead(messageId: string) {
  return apiRequest("POST", `/${getPhoneNumberId()}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function createTemplate(template: {
  name: string;
  category: string;
  language: string;
  components: object[];
}) {
  return apiRequest("POST", `/${getWABAId()}/message_templates`, {
    ...template,
    messaging_product: "whatsapp",
  });
}

export async function updateTemplate(
  templateId: string,
  components: object[]
) {
  return apiRequest("POST", `/${templateId}`, {
    components,
  });
}

export async function deleteTemplate(templateName: string) {
  return apiRequest(
    "DELETE",
    `/${getWABAId()}/message_templates?name=${templateName}`
  );
}

export async function getTemplatesFromMeta() {
  return apiRequest(
    "GET",
    `/${getWABAId()}/message_templates?fields=id,name,category,language,status,rejected_reason,components&limit=100`
  );
}

// ─── Webhook verification ─────────────────────────────────────────────────────

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  if (
    mode === "subscribe" &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return challenge;
  }
  return null;
}

// ─── Parse incoming webhook ───────────────────────────────────────────────────

export interface InboundMessage {
  from: string; // phone number
  messageId: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "sticker" | "button" | "interactive" | "unknown";
  text?: string;
  caption?: string;
  mediaId?: string;
}

export function parseWebhookPayload(body: Record<string, unknown>): InboundMessage[] {
  const messages: InboundMessage[] = [];

  const entry = (body.entry as Record<string, unknown>[])?.[0];
  const changes = (entry?.changes as Record<string, unknown>[])?.[0];
  const value = changes?.value as Record<string, unknown>;

  if (!value?.messages) return messages;

  for (const msg of value.messages as Record<string, unknown>[]) {
    const type = msg.type as string;
    let text: string | undefined;
    let mediaId: string | undefined;

    if (type === "text") {
      text = (msg.text as Record<string, string>)?.body;
    } else if (["image", "video", "document", "audio", "sticker"].includes(type)) {
      const media = msg[type] as Record<string, string>;
      mediaId = media?.id;
      text = media?.caption;
    } else if (type === "button") {
      text = (msg.button as Record<string, string>)?.text;
    } else if (type === "interactive") {
      const interactive = msg.interactive as Record<string, Record<string, string>>;
      text = interactive?.button_reply?.title || interactive?.list_reply?.title;
    }

    messages.push({
      from: msg.from as string,
      messageId: msg.id as string,
      timestamp: msg.timestamp as string,
      type: type as InboundMessage["type"],
      text,
      mediaId,
    });
  }

  return messages;
}
