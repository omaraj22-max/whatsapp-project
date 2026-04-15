import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateReply(
  conversationHistory: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        systemPrompt ||
        process.env.OPENAI_SYSTEM_PROMPT ||
        "Eres un asistente de ventas amable y profesional.",
    },
    ...conversationHistory,
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "";
}

export function buildConversationHistory(
  messages: { direction: string; content: string; type: string }[]
): ChatMessage[] {
  return messages
    .filter((m) => m.type === "text" || m.direction === "outbound")
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content,
    }));
}
