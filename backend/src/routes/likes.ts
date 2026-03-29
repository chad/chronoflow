import { Hono } from 'hono';
import { db } from '../db.js';

export const likeRoutes = new Hono();

// Register a like
likeRoutes.post('/api/likes', async (c) => {
  const { uri, patchUri, did } = await c.req.json<{ uri: string; patchUri: string; did: string }>();
  if (!uri || !patchUri || !did) return c.json({ error: 'uri, patchUri, did required' }, 400);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO likes (uri, patch_uri, did, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(uri, patchUri, did, new Date().toISOString());

  if (result.changes > 0) {
    db.prepare('UPDATE patches SET like_count = like_count + 1 WHERE uri = ?').run(patchUri);
  }

  return c.json({ ok: true }, 201);
});

// Remove a like
likeRoutes.delete('/api/likes/:did/:rkey', (c) => {
  const { did, rkey } = c.req.param();
  const likeUri = `at://${did}/club.miren.mosh.like/${rkey}`;

  const like = db.prepare('SELECT patch_uri FROM likes WHERE uri = ?').get(likeUri) as any;
  if (like) {
    db.prepare('DELETE FROM likes WHERE uri = ?').run(likeUri);
    db.prepare('UPDATE patches SET like_count = MAX(0, like_count - 1) WHERE uri = ?').run(like.patch_uri);
  }

  return c.json({ ok: true });
});

// Check if user liked a set of patches
likeRoutes.get('/api/likes/check', (c) => {
  const did = c.req.query('did');
  const patchUris = c.req.query('patches')?.split(',') || [];

  if (!did || patchUris.length === 0) return c.json({ likes: {} });

  const placeholders = patchUris.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT uri, patch_uri FROM likes WHERE did = ? AND patch_uri IN (${placeholders})`
  ).all(did, ...patchUris) as any[];

  const likes: Record<string, string> = {};
  for (const row of rows) {
    likes[row.patch_uri] = row.uri;
  }

  return c.json({ likes });
});
