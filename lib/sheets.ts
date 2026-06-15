export interface LeadData {
  phone: string;
  name?: string;
  objective?: string;
  budget?: string;
  timeline?: string;
  zone?: string;
  bedrooms?: string;
  qualification?: string;
  recommendedProject?: string;
  lastMessage?: string;
  conversationId?: string;
}

export async function sendLeadToSheets(webhookUrl: string, data: LeadData) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    });
  } catch (err) {
    console.error("Sheets webhook error:", err);
  }
}
