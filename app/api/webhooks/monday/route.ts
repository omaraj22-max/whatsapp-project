import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWorkflowsForMondayEvent } from "@/lib/workflows";
import type { MondayWebhookPayload } from "@/lib/monday";

export async function POST(request: Request) {
  try {
    const body = await request.json() as MondayWebhookPayload;

    // Monday challenge verification
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    const event = body.event;
    if (!event) return NextResponse.json({ ok: true });

    // Find the contact associated with this Monday item
    let phone: string | undefined;
    if (event.pulseId) {
      const contact = await prisma.contact.findFirst({
        where: { mondayItemId: String(event.pulseId) },
      });
      phone = contact?.phone;
    }

    // Run workflows
    await runWorkflowsForMondayEvent(body, phone);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Monday webhook error:", error);
    return NextResponse.json({ ok: true }); // Always 200
  }
}
