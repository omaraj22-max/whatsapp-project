import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getSettingValue(key: string): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value || process.env[key] || "";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params;

  try {
    if (service === "whatsapp") {
      const token = await getSettingValue("META_ACCESS_TOKEN");
      const phoneId = await getSettingValue("META_PHONE_NUMBER_ID");
      if (!token || !phoneId) {
        return NextResponse.json({ error: "Token o Phone ID no configurados" }, { status: 400 });
      }
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
      const data = await res.json();
      return NextResponse.json({ ok: true, number: data.display_phone_number });
    }

    if (service === "monday") {
      const token = await getSettingValue("MONDAY_API_TOKEN");
      if (!token) return NextResponse.json({ error: "API Token no configurado" }, { status: 400 });
      const res = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: "{ me { id name } }" }),
      });
      if (!res.ok) return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
      const json = await res.json() as { data?: { me?: { name: string } } };
      return NextResponse.json({ ok: true, user: json.data?.me?.name });
    }

    if (service === "openai") {
      const apiKey = await getSettingValue("OPENAI_API_KEY");
      if (!apiKey) return NextResponse.json({ error: "API Key no configurada" }, { status: 400 });
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return NextResponse.json({ error: "API Key inválida" }, { status: 401 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Servicio desconocido" }, { status: 400 });
  } catch (error) {
    console.error(`Test ${service} error:`, error);
    return NextResponse.json({ error: "Error de conexión" }, { status: 500 });
  }
}
