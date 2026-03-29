const API_BASE = import.meta.env.VITE_API_URL || 'https://mosh-api.miren.club';

export async function registerPatch(uri: string, cid: string) {
  await fetch(`${API_BASE}/api/patches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri, cid }),
  });
}

export interface PatchListItem {
  uri: string; did: string; handle: string; name: string;
  description: string; tags: string[]; nodeCount: number;
  likeCount: number; createdAt: string;
}

export async function listPatches(opts: {
  sort?: 'recent' | 'popular'; page?: number; search?: string; tag?: string;
}): Promise<{ patches: PatchListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.search) params.set('search', opts.search);
  if (opts.tag) params.set('tag', opts.tag);
  const res = await fetch(`${API_BASE}/api/patches?${params}`);
  return res.json();
}

export async function getPatchContent(did: string, rkey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/patches/${did}/${rkey}`);
  const data = await res.json();
  return data.content;
}

export async function registerLike(uri: string, patchUri: string, did: string) {
  await fetch(`${API_BASE}/api/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri, patchUri, did }),
  });
}

export async function removeLike(did: string, rkey: string) {
  await fetch(`${API_BASE}/api/likes/${did}/${rkey}`, { method: 'DELETE' });
}

export async function checkLikes(did: string, patchUris: string[]): Promise<Record<string, string>> {
  const params = new URLSearchParams({ did, patches: patchUris.join(',') });
  const res = await fetch(`${API_BASE}/api/likes/check?${params}`);
  const data = await res.json();
  return data.likes;
}
