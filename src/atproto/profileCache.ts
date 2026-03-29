const PUBLIC_API = 'https://public.api.bsky.app';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CachedProfile {
  data: any;
  fetchedAt: number;
}

const cache = new Map<string, CachedProfile>();
const inflight = new Map<string, Promise<any>>();

export async function getProfile(didOrHandle: string) {
  const cached = cache.get(didOrHandle);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // Deduplicate concurrent requests
  const existing = inflight.get(didOrHandle);
  if (existing) return existing;

  const promise = fetch(
    `${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(didOrHandle)}`
  )
    .then((r) => r.json())
    .then((data) => {
      cache.set(didOrHandle, { data, fetchedAt: Date.now() });
      inflight.delete(didOrHandle);
      return data;
    });

  inflight.set(didOrHandle, promise);
  return promise;
}
