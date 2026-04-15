import { prisma } from "./prisma";
import { sendTextMessage, sendTemplateMessage } from "./whatsapp";
import type { MondayWebhookPayload } from "./monday";

type Action = {
  type: "send_template" | "send_message" | "assign_ai" | "assign_human" | "notify";
  templateName?: string;
  languageCode?: string;
  message?: string;
  agentMode?: string;
};

type WorkflowRecord = {
  id: string;
  trigger: string;
  conditions: unknown;
  actions: unknown;
  enabled: boolean;
};

export async function runWorkflowsForMondayEvent(
  payload: MondayWebhookPayload,
  phone?: string
) {
  const eventType = payload.event.type;

  // Map Monday event types to our trigger names
  const triggerMap: Record<string, string> = {
    create_pulse: "monday_lead_created",
    update_column_value: "monday_status_changed",
    change_column_value: "monday_status_changed",
  };

  const trigger = triggerMap[eventType];
  if (!trigger) return;

  const workflows = await prisma.workflow.findMany({
    where: { trigger, enabled: true },
  });

  for (const workflow of workflows as WorkflowRecord[]) {
    if (meetsConditions(workflow, payload)) {
      await executeActions(workflow, phone, payload);
    }
  }
}

function meetsConditions(workflow: WorkflowRecord, payload: MondayWebhookPayload): boolean {
  const conditions = workflow.conditions as Record<string, unknown> | null;
  if (!conditions) return true;

  // Check board ID condition
  if (conditions.boardId && String(conditions.boardId) !== String(payload.event.boardId)) {
    return false;
  }

  // Check column/status condition for status_changed trigger
  if (workflow.trigger === "monday_status_changed") {
    if (conditions.columnId && conditions.columnId !== payload.event.columnId) {
      return false;
    }
    if (conditions.statusValue && payload.event.value?.label?.text !== conditions.statusValue) {
      return false;
    }
  }

  return true;
}

async function executeActions(
  workflow: WorkflowRecord,
  phone: string | undefined,
  payload: MondayWebhookPayload
) {
  const actions = workflow.actions as Action[];
  if (!Array.isArray(actions)) return;

  for (const action of actions) {
    try {
      if (!phone) continue;

      switch (action.type) {
        case "send_template":
          if (action.templateName) {
            await sendTemplateMessage(
              phone,
              action.templateName,
              action.languageCode || "es"
            );
          }
          break;

        case "send_message":
          if (action.message) {
            await sendTextMessage(phone, action.message);
          }
          break;

        case "assign_ai":
        case "assign_human": {
          const conv = await prisma.conversation.findFirst({
            where: { contact: { phone } },
          });
          if (conv) {
            await prisma.conversation.update({
              where: { id: conv.id },
              data: { agentMode: action.type === "assign_ai" ? "ai" : "human" },
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Workflow ${workflow.id} action ${action.type} failed:`, err);
    }
  }
}

export async function runWorkflowsForInboundMessage(
  phone: string,
  message: string,
  conversationId: string
) {
  const workflows = await prisma.workflow.findMany({
    where: { trigger: "keyword_received", enabled: true },
  });

  for (const workflow of workflows as WorkflowRecord[]) {
    const conditions = workflow.conditions as Record<string, unknown> | null;
    if (conditions?.keyword) {
      const keyword = String(conditions.keyword).toLowerCase();
      if (!message.toLowerCase().includes(keyword)) continue;
    }
    await executeActions(workflow, phone, {} as MondayWebhookPayload);
  }
}
