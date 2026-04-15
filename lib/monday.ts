const MONDAY_API_URL = "https://api.monday.com/v2";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.MONDAY_API_TOKEN}`,
    "API-Version": "2024-01",
  };
}

async function query<T = unknown>(gql: string, variables?: object): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query: gql, variables }),
  });

  const json = await res.json() as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }

  return json.data as T;
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export async function getBoards() {
  return query<{ boards: { id: string; name: string; columns: { id: string; title: string; type: string }[] }[] }>(`
    query {
      boards(limit: 50) {
        id
        name
        columns {
          id
          title
          type
        }
      }
    }
  `);
}

// ─── Items (Leads) ────────────────────────────────────────────────────────────

export async function getBoardItems(boardId: string) {
  return query<{ boards: { items_page: { items: MondayItem[] } }[] }>(`
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 200) {
          items {
            id
            name
            created_at
            column_values {
              id
              title
              text
              value
            }
          }
        }
      }
    }
  `, { boardId });
}

export interface MondayItem {
  id: string;
  name: string;
  created_at: string;
  column_values: { id: string; title: string; text: string; value: string }[];
}

export async function createItem(
  boardId: string,
  groupId: string,
  itemName: string,
  columnValues: Record<string, unknown>
) {
  return query<{ create_item: { id: string } }>(`
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
      }
    }
  `, {
    boardId,
    groupId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
}

export async function updateItemStatus(
  boardId: string,
  itemId: string,
  columnId: string,
  statusLabel: string
) {
  return query(`
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId
        item_id: $itemId
        column_id: $columnId
        value: $value
      ) {
        id
      }
    }
  `, {
    boardId,
    itemId,
    columnId,
    value: JSON.stringify({ label: statusLabel }),
  });
}

export async function getItem(itemId: string) {
  return query<{ items: MondayItem[] }>(`
    query ($itemId: ID!) {
      items(ids: [$itemId]) {
        id
        name
        created_at
        column_values {
          id
          title
          text
          value
        }
      }
    }
  `, { itemId });
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export async function createWebhook(
  boardId: string,
  url: string,
  event: "create_item" | "change_column_value" | "change_status_column_value"
) {
  return query(`
    mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
      create_webhook(board_id: $boardId, url: $url, event: $event) {
        id
        board_id
      }
    }
  `, { boardId, url, event });
}

// ─── Parse webhook payload ────────────────────────────────────────────────────

export interface MondayWebhookPayload {
  event: {
    type: string;
    boardId: number;
    groupId?: string;
    pulseId?: number; // item ID
    pulseName?: string;
    columnId?: string;
    columnTitle?: string;
    value?: {
      label?: { text: string };
      previousLabel?: { text: string };
    };
  };
  challenge?: string;
}
