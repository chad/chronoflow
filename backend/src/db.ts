import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'mosh.db');

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS patches (
    uri TEXT PRIMARY KEY,
    did TEXT NOT NULL,
    handle TEXT,
    rkey TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    content TEXT,
    created_at TEXT NOT NULL,
    indexed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS likes (
    uri TEXT PRIMARY KEY,
    patch_uri TEXT NOT NULL REFERENCES patches(uri),
    did TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_patches_created ON patches(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_patches_likes ON patches(like_count DESC);
  CREATE INDEX IF NOT EXISTS idx_likes_patch ON likes(patch_uri);
`);
