import { getSetting } from "@/lib/settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const accessToken = await getSetting("META_ACCESS_TOKEN");
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Step 1: get the download URL from Meta
  const infoRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!infoRes.ok) return new Response("Media not found", { status: 404 });

  const info = await infoRes.json() as { url?: string; mime_type?: string };
  if (!info.url) return new Response("Media URL missing", { status: 404 });

  // Step 2: fetch the actual file
  const mediaRes = await fetch(info.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) return new Response("Failed to fetch media", { status: 502 });

  const contentType = info.mime_type || mediaRes.headers.get("content-type") || "application/octet-stream";

  return new Response(mediaRes.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
