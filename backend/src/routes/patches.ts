import { Hono } from 'hono';
import { db } from '../db.js';

export const patchRoutes = new Hono();

// Register a published patch (frontend calls this after publishing to PDS)
patchRoutes.post('/api/patches', async (c) => {
  const { uri, cid } = await c.req.json<{ uri: string; cid: string }>();
  if (!uri) return c.json({ error: 'uri required' }, 400);

  // Parse DID and rkey from AT URI: at://did:plc:xxx/club.miren.mosh.patch/rkey
  const parts = uri.replace('at://', '').split('/');
  const did = parts[0];
  const rkey = parts[2];

  // Fetch record from PDS
  const pdsRes = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=club.miren.mosh.patch&rkey=${encodeURIComponent(rkey)}`
  );

  if (!pdsRes.ok) {
    return c.json({ error: 'Failed to fetch record from PDS' }, 502);
  }

  const pdsData = await pdsRes.json() as any;
  const record = pdsData.value;

  // Fetch handle
  let handle = did;
  try {
    const profileRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
    );
    if (profileRes.ok) {
      const profile = await profileRes.json() as any;
      handle = profile.handle || did;
    }
  } catch {
    // Use DID as fallback
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO patches (uri, did, handle, rkey, name, description, tags, node_count, content, created_at, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    uri,
    did,
    handle,
    rkey,
    record.name || 'Untitled',
    record.description || '',
    JSON.stringify(record.tags || []),
    record.nodeCount || 0,
    record.content || '',
    record.createdAt || new Date().toISOString(),
    new Date().toISOString()
  );

  return c.json({ ok: true }, 201);
});

// List patches
patchRoutes.get('/api/patches', (c) => {
  const sort = c.req.query('sort') || 'recent';
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const search = c.req.query('search') || '';
  const tag = c.req.query('tag') || '';
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    where += ' AND tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  const orderBy = sort === 'popular' ? 'like_count DESC' : 'created_at DESC';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM patches WHERE ${where}`);
  const { total } = countStmt.get(...params) as { total: number };

  const listStmt = db.prepare(`
    SELECT uri, did, handle, rkey, name, description, tags, node_count, like_count, created_at
    FROM patches WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `);
  const rows = listStmt.all(...params, limit, offset) as any[];

  const patches = rows.map((r) => ({
    uri: r.uri,
    did: r.did,
    handle: r.handle,
    name: r.name,
    description: r.description,
    tags: JSON.parse(r.tags || '[]'),
    nodeCount: r.node_count,
    likeCount: r.like_count,
    createdAt: r.created_at,
  }));

  return c.json({ patches, total });
});

// Get single patch with content
patchRoutes.get('/api/patches/:did/:rkey', (c) => {
  const { did, rkey } = c.req.param();
  const stmt = db.prepare('SELECT * FROM patches WHERE did = ? AND rkey = ?');
  const row = stmt.get(did, rkey) as any;

  if (!row) return c.json({ error: 'Not found' }, 404);

  return c.json({
    uri: row.uri,
    did: row.did,
    handle: row.handle,
    name: row.name,
    description: row.description,
    tags: JSON.parse(row.tags || '[]'),
    nodeCount: row.node_count,
    likeCount: row.like_count,
    content: row.content,
    createdAt: row.created_at,
  });
});

// Delete patch from index
patchRoutes.delete('/api/patches/:did/:rkey', (c) => {
  const { did, rkey } = c.req.param();
  const stmt = db.prepare('DELETE FROM patches WHERE did = ? AND rkey = ?');
  stmt.run(did, rkey);
  return c.json({ ok: true });
});
