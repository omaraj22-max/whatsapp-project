import OpenAI from "openai";
import type { LeadData } from "./sheets";

function getClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateReply(
  conversationHistory: ChatMessage[],
  systemPrompt?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY || "";
  if (!key) return "";
  const client = getClient(key);
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

export async function extractLeadData(
  conversationHistory: ChatMessage[],
  phone: string,
  apiKey?: string
): Promise<Partial<LeadData>> {
  const key = apiKey || process.env.OPENAI_API_KEY || "";
  if (!key || conversationHistory.length < 2) return { phone };

  const client = getClient(key);

  const extraction = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analiza esta conversación de WhatsApp de una inmobiliaria y extrae los datos del lead en JSON.
Devuelve SOLO un objeto JSON válido con estos campos (usa null si no se mencionó):
{
  "name": "nombre del cliente o null",
  "objective": "vivir | invertir | ambos | null",
  "budget": "rango de presupuesto mencionado o null",
  "timeline": "cuándo quiere la propiedad o null",
  "zone": "zona de interés o null",
  "bedrooms": "número de recámaras o null",
  "qualification": "calificado | no calificado | pendiente",
  "recommendedProject": "proyecto recomendado o null",
  "buscaRecomendaciones": "SÍ | NO | null",
  "modalidadCita": "videollamada | presencial | telefónica | null",
  "lastMessage": "resumen en una frase de la última respuesta del lead"
}
Un lead está CALIFICADO si su presupuesto es mayor a 6 millones de pesos.
buscaRecomendaciones es SÍ si el cliente dijo frases como 'no sé', 'tú dime', 'recomiéndame', 'lo que tú veas'.
modalidadCita es el formato de sesión que prefiere el lead una vez calificado (videollamada, presencial o telefónica).`,
      },
      {
        role: "user",
        content: conversationHistory
          .slice(-10)
          .map((m) => `${m.role === "user" ? "Cliente" : "Alex"}: ${m.content}`)
          .join("\n"),
      },
    ],
    max_tokens: 300,
    temperature: 0,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(extraction.choices[0]?.message?.content || "{}");
    return { phone, ...parsed };
  } catch {
    return { phone };
  }
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
