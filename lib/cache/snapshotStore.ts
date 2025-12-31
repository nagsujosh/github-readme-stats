import { redis } from "./upstash";
import { snapshotKey, lockKey } from "./keys";
import type { Snapshot } from "@/lib/github/types";

function mustInt(name: string, fallback: number) {
  const raw = process.env[name];
  const v = raw ? Number(raw) : fallback;
  return Number.isFinite(v) ? v : fallback;
}

export function getSnapshotTtlSeconds() {
  return mustInt("STATS_SNAPSHOT_TTL_SECONDS", 43200);
}

export function getVersion() {
  return process.env.STATS_VERSION || "v1";
}

export async function loadSnapshot(username: string): Promise<Snapshot | null> {
  const key = snapshotKey(getVersion(), username);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

export async function saveSnapshot(username: string, snap: Snapshot): Promise<void> {
  const key = snapshotKey(getVersion(), username);
  await redis.setex(key, snap.ttlSeconds, JSON.stringify(snap));
}

/**
 * Best-effort lock to avoid stampede. Public/free means you need this.
 */
export async function tryAcquireAnalyzeLock(username: string, lockSeconds = 30) {
  const key = lockKey(username);
  const ok = await redis.setnx(key, "1");
  if (ok === 1) {
    await redis.expire(key, lockSeconds);
    return true;
  }
  return false;
}

export async function releaseAnalyzeLock(username: string) {
  const key = lockKey(username);
  await redis.del(key);
}
