import { redis } from "./upstash";
import { rateIpKey, rateUserAnalyzeKey } from "./keys";

function mustInt(name: string, fallback: number) {
  const raw = process.env[name];
  const v = raw ? Number(raw) : fallback;
  return Number.isFinite(v) ? v : fallback;
}

const PER_IP_PER_MIN = mustInt("STATS_RL_PER_IP_PER_MIN", 60);
const ANALYZE_PER_USER_PER_HOUR = mustInt("STATS_RL_ANALYZE_PER_USER_PER_HOUR", 4);

export async function rateLimitIp(ip: string) {
  const key = rateIpKey(ip, "min");
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  const ok = count <= PER_IP_PER_MIN;
  return { ok, limit: PER_IP_PER_MIN, remaining: Math.max(0, PER_IP_PER_MIN - count) };
}

export async function rateLimitAnalyzeUser(username: string) {
  const key = rateUserAnalyzeKey(username, "hour");
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  const ok = count <= ANALYZE_PER_USER_PER_HOUR;
  return {
    ok,
    limit: ANALYZE_PER_USER_PER_HOUR,
    remaining: Math.max(0, ANALYZE_PER_USER_PER_HOUR - count),
  };
}
