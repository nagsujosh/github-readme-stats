import { jsonResponse } from "@/lib/utils/http";
import { getVersion } from "./../../../../lib/cache/snapshotStore";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse({
    ok: true,
    version: getVersion(),
    now: new Date().toISOString(),
  });
}
