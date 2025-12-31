type UpstashResult<T> = { result: T };

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const URL = () => mustEnv("UPSTASH_REDIS_REST_URL");
const TOKEN = () => mustEnv("UPSTASH_REDIS_REST_TOKEN");

async function redisCall<T>(command: string, args: (string | number)[]) {
  const endpoint = `${URL()}/${command}/${args.map(encodeURIComponent).join("/")}`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as UpstashResult<T>;
  return json.result;
}

export const redis = {
  async get(key: string) {
    return redisCall<string | null>("get", [key]);
  },
  async set(key: string, value: string) {
    return redisCall<"OK">("set", [key, value]);
  },
  async setex(key: string, ttlSeconds: number, value: string) {
    return redisCall<"OK">("setex", [key, ttlSeconds, value]);
  },
  async del(key: string) {
    return redisCall<number>("del", [key]);
  },
  async incr(key: string) {
    return redisCall<number>("incr", [key]);
  },
  async expire(key: string, ttlSeconds: number) {
    return redisCall<number>("expire", [key, ttlSeconds]);
  },
  async setnx(key: string, value: string) {
    return redisCall<number>("setnx", [key, value]);
  },
};
