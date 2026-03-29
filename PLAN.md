# Mosh: Social Modular Synth with AT Proto

## Overview

Rename ChronoFlow → **Mosh** and add AT Proto/Bluesky social features: login, publish patches, community browsing, likes, sharing.

---

## Phase 1: Rename ChronoFlow → Mosh

Pure string/branding changes. No functional changes.

### localStorage migration

Create `src/utils/storageMigration.ts`:
```typescript
export function migrateStorageKey(oldKey: string, newKey: string): void {
  if (!localStorage.getItem(newKey)) {
    const old = localStorage.getItem(oldKey);
    if (old) { localStorage.setItem(newKey, old); localStorage.removeItem(oldKey); }
  }
}
```

Call once in `main.tsx` before `ReactDOM.createRoot()`:
```typescript
migrateStorageKey('chronoflow-patch', 'mosh-patch');
migrateStorageKey('chronoflow-node-presets', 'mosh-node-presets');
migrateStorageKey('chronoflow-palette-collapsed', 'mosh-palette-collapsed');
```

### Files to modify

**`package.json`** — `"name": "mosh"`

**`index.html`** — All meta/OG tags:
- `<title>Mosh — Modular Synthesizer</title>`
- `<meta property="og:title" content="Mosh — Modular Synthesizer">`
- `<meta property="og:site_name" content="Mosh">`
- All URLs: `chronoflow.miren.club` → `mosh.miren.club`

**`.miren/app.toml`** — `name = 'mosh'`

**`src/App.tsx`** — Three spots:
- `document.title = \`${patch.meta.name} — Mosh\``
- `<h1 className="text-lg font-bold text-cyan-400">Mosh</h1>`
- Deep link splash text

**`src/patch/patchStore.ts`** — localStorage key:
- `'chronoflow-patch'` → `'mosh-patch'` (lines ~705, 709)

**`src/patch/nodePresets.ts`** — Storage key:
- `'chronoflow-node-presets'` → `'mosh-node-presets'`

**`src/ui/panels/NodePalette.tsx`** — Storage key:
- `'chronoflow-palette-collapsed'` → `'mosh-palette-collapsed'`

**`src/audio/nodes/OutputNode.ts`** — Recording filename:
- `'chronoflow-'` → `'mosh-'`

**`src/engine/ChronoFlowEngine.ts`** — Rename file to `MoshEngine.ts`:
- Class: `ChronoFlowEngine` → `MoshEngine`
- Interface: `ChronoFlowEngineOptions` → `MoshEngineOptions`
- All console.log/error strings

**`src/engine/index.ts`** — Update import/export to `MoshEngine`

**`src/ui/panels/MidiPanel.tsx`** — Comment: "GarageBand -> ChronoFlow" → "GarageBand -> Mosh"

**`src/audio/AudioAnalysisBus.ts`** — Comment references

**`CLAUDE.md`, `README.md`, `SPEC.md`** — All "ChronoFlow" → "Mosh"

### Verify
```bash
npx tsc --noEmit
npx vite build
grep -ri "chronoflow" src/  # should return nothing
```

---

## Phase 2: AT Proto OAuth ("Sign in with Bluesky")

### Install dependencies
```bash
npm install @atproto/oauth-client-browser @atproto/api
```

### New file: `public/client-metadata.json`

OAuth client metadata served as a static file. AT Proto requires this be publicly accessible at the `client_id` URL.

```json
{
  "client_id": "https://mosh.miren.club/client-metadata.json",
  "client_name": "Mosh",
  "client_uri": "https://mosh.miren.club",
  "redirect_uris": ["https://mosh.miren.club/"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

### New file: `src/atproto/client.ts`

```typescript
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const PROD_CLIENT_ID = 'https://mosh.miren.club/client-metadata.json';
const PROD_REDIRECT = 'https://mosh.miren.club/';

// AT Proto supports loopback clients for dev (no public metadata URL needed)
const DEV_REDIRECT = `http://127.0.0.1:${window.location.port}/`;
const DEV_CLIENT_ID = `http://localhost?redirect_uri=${encodeURIComponent(DEV_REDIRECT)}&scope=${encodeURIComponent('atproto transition:generic')}`;

export const oauthClient = new BrowserOAuthClient({
  clientId: import.meta.env.DEV ? DEV_CLIENT_ID : PROD_CLIENT_ID,
  redirectUri: import.meta.env.DEV ? DEV_REDIRECT : PROD_REDIRECT,
});
```

### New file: `src/atproto/authStore.ts`

Zustand store for auth state.

```typescript
import { create } from 'zustand';
import { Agent } from '@atproto/api';
import { oauthClient } from './client';
import { getProfile } from './profileCache';

interface AuthState {
  did: string | null;
  handle: string | null;
  agent: Agent | null;
  profile: { displayName: string; avatar: string; description: string } | null;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (handle: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  did: null,
  handle: null,
  agent: null,
  profile: null,
  isLoading: true,
  error: null,

  init: async () => {
    try {
      const result = await oauthClient.init();
      if (result?.session) {
        const agent = new Agent(result.session);
        const did = result.session.did;
        set({ agent, did, isLoading: false });
        // Fetch profile in background
        const profile = await getProfile(did);
        set({ handle: profile.handle, profile: {
          displayName: profile.displayName || profile.handle,
          avatar: profile.avatar || '',
          description: profile.description || '',
        }});
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[auth] init failed:', err);
      set({ isLoading: false, error: String(err) });
    }
  },

  login: async (handle: string) => {
    try {
      set({ isLoading: true, error: null });
      await oauthClient.signIn(handle);
      // This redirects — page will reload and init() handles the callback
    } catch (err) {
      set({ isLoading: false, error: String(err) });
    }
  },

  logout: () => {
    // Clear IndexedDB session (BrowserOAuthClient handles this)
    set({ did: null, handle: null, agent: null, profile: null });
    // Optionally: oauthClient.revoke(did) if API supports it
  },
}));
```

### New file: `src/atproto/profileCache.ts`

Read-only profile fetching via public Bluesky API (no auth needed).

```typescript
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
```

### New file: `src/ui/components/AuthButton.tsx`

```typescript
import { useState } from 'react';
import { useAuthStore } from '../../atproto/authStore';

export function AuthButton() {
  const { did, handle, profile, isLoading, login, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoading) return null;

  // Signed in — show avatar + handle
  if (did && profile) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700"
        >
          {profile.avatar && (
            <img src={profile.avatar} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span className="text-sm text-gray-300 max-w-[120px] truncate">
            {handle || did}
          </span>
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[150px]">
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
              {handle}
            </div>
            <button
              onClick={() => { logout(); setShowDropdown(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed out — show sign in button
  if (showLogin) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="handle.bsky.social"
          value={handleInput}
          onChange={(e) => setHandleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && handleInput.trim()) login(handleInput.trim());
            if (e.key === 'Escape') setShowLogin(false);
          }}
          className="px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white w-48 outline-none focus:border-cyan-400"
          autoFocus
        />
        <button
          onClick={() => handleInput.trim() && login(handleInput.trim())}
          className="px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded"
        >
          Go
        </button>
        <button
          onClick={() => setShowLogin(false)}
          className="px-1 py-1 text-sm text-gray-400 hover:text-white"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowLogin(true)}
      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
    >
      Sign in
    </button>
  );
}
```

### Modify: `src/App.tsx`

Add to imports:
```typescript
import { useAuthStore } from './atproto/authStore';
import { AuthButton } from './ui/components/AuthButton';
```

Add `useEffect` for auth init:
```typescript
const initAuth = useAuthStore((state) => state.init);

useEffect(() => {
  initAuth();
}, [initAuth]);
```

Add `<AuthButton />` to the header (between the manual link and audio button).

---

## Phase 3: Publish Patches to AT Proto

### Lexicon: `club.miren.mosh.patch`

Save to `lexicons/club.miren.mosh.patch.json` (for reference, not compiled):
```json
{
  "lexicon": 1,
  "id": "club.miren.mosh.patch",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["name", "content", "createdAt"],
        "properties": {
          "name": { "type": "string", "maxLength": 100 },
          "description": { "type": "string", "maxLength": 1000 },
          "content": { "type": "string", "maxLength": 100000 },
          "tags": { "type": "array", "items": { "type": "string" }, "maxLength": 10 },
          "nodeCount": { "type": "integer" },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

`content` = JSON.stringify(patch). Most patches <50KB.

### New file: `src/atproto/patchRecords.ts`

```typescript
import type { Agent } from '@atproto/api';
import type { Patch } from '../patch/types';

const COLLECTION = 'club.miren.mosh.patch';

interface PublishMeta {
  description: string;
  tags: string[];
}

export async function publishPatch(
  agent: Agent,
  patch: Patch,
  meta: PublishMeta
): Promise<{ uri: string; cid: string }> {
  const content = JSON.stringify(patch);
  if (content.length > 100000) {
    throw new Error('Patch too large to publish (>100KB)');
  }

  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: COLLECTION,
    record: {
      $type: COLLECTION,
      name: patch.meta.name,
      description: meta.description,
      content,
      tags: meta.tags,
      nodeCount: patch.nodes.length,
      createdAt: new Date().toISOString(),
    },
  });

  return { uri: res.data.uri, cid: res.data.cid };
}

export async function unpublishPatch(agent: Agent, rkey: string): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: COLLECTION,
    rkey,
  });
}

export async function getMyPublishedPatches(agent: Agent) {
  const res = await agent.com.atproto.repo.listRecords({
    repo: agent.assertDid,
    collection: COLLECTION,
    limit: 100,
  });
  return res.data.records;
}
```

### New file: `src/ui/panels/PublishDialog.tsx`

Modal dialog with:
- Patch name (pre-filled, readonly)
- Description textarea
- Tags input (comma-separated)
- Node count / connection count display
- Publish button → calls `publishPatch()`, shows success
- Cancel button

### Modify: `src/ui/panels/PatchManager.tsx`

Add "Publish" button in the actions area, only visible when `useAuthStore().agent` exists. Opens `<PublishDialog>`.

---

## Phase 4: Community Browser (needs backend)

### Backend: `backend/`

Small Node.js + Hono + better-sqlite3 service.

**`backend/package.json`**:
```json
{
  "name": "mosh-api",
  "private": true,
  "type": "module",
  "scripts": { "dev": "tsx src/index.ts", "build": "tsc", "start": "node dist/index.js" },
  "dependencies": {
    "hono": "^4",
    "better-sqlite3": "^11",
    "@hono/node-server": "^1"
  },
  "devDependencies": {
    "tsx": "^4",
    "typescript": "^5",
    "@types/better-sqlite3": "^7"
  }
}
```

**`backend/src/db.ts`** — SQLite schema:
```sql
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
```

**`backend/src/routes/patches.ts`** — Endpoints:

```
POST /api/patches
  Body: { uri, cid }
  → Fetches record from PDS via com.atproto.repo.getRecord
  → Stores metadata + content in SQLite
  → Returns 201

GET /api/patches?sort=recent|popular&page=1&limit=20&search=...&tag=...
  → Returns paginated list (without content field for efficiency)
  → Each item: { uri, did, handle, name, description, tags, nodeCount, likeCount, createdAt }

GET /api/patches/:did/:rkey
  → Returns full patch including content

DELETE /api/patches/:did/:rkey
  Headers: Authorization: Bearer <token>
  → Verify DID matches, remove from index
```

**`backend/.miren/app.toml`**:
```toml
name = 'mosh-api'
env = []
include = ['dist', 'package.json', 'package-lock.json']

[services.web]
command = "npm start"
```

Deploy to `mosh-api.miren.club`.

### Frontend: `src/atproto/api.ts`

```typescript
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
  return data.content; // JSON string of the Patch
}
```

### Frontend: `src/ui/panels/CommunityBrowser.tsx`

New sidebar panel (add below PatchManager in App.tsx, or as a tab within PatchManager):
- Search input at top
- Sort toggle: Recent | Popular
- Scrollable list of `<PatchCard>` components
- Each card: name, author (avatar + @handle), node count, like count, tags
- Click card → fetch content → `importPatch(content)` into editor
- "Load more" pagination

### Frontend: `src/ui/components/PatchCard.tsx`

Small card component:
```
┌─────────────────────────┐
│ Cosmic Cathedral        │
│ @chad.bsky.social   ♥ 5 │
│ 24 nodes  #ambient #gen │
└─────────────────────────┘
```

Author avatar fetched from `profileCache.ts`.

### Wire up: After publishing (Phase 3), also call `registerPatch(uri, cid)`.

---

## Phase 5: Social Layer

### Likes

**Lexicon: `club.miren.mosh.like`** (save to `lexicons/club.miren.mosh.like.json`):
```json
{
  "lexicon": 1,
  "id": "club.miren.mosh.like",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["subject", "createdAt"],
        "properties": {
          "subject": {
            "type": "ref",
            "ref": "com.atproto.repo.strongRef"
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

**`src/atproto/likeRecords.ts`**:
```typescript
export async function likePatch(agent: Agent, uri: string, cid: string) {
  return agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: 'club.miren.mosh.like',
    record: {
      $type: 'club.miren.mosh.like',
      subject: { uri, cid },
      createdAt: new Date().toISOString(),
    },
  });
}

export async function unlikePatch(agent: Agent, likeRkey: string) {
  return agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: 'club.miren.mosh.like',
    rkey: likeRkey,
  });
}
```

**Backend**: Add `POST /api/likes` and `DELETE /api/likes/:did/:rkey`. Increment/decrement `like_count` on the patches table.

**UI**: Add heart button to PatchCard. Filled when liked by current user.

### Share to Bluesky

**`src/atproto/shareToBluesky.ts`**:
```typescript
export async function shareToBluesky(agent: Agent, patch: { name: string; uri: string }) {
  const url = `https://mosh.miren.club/?patch=${encodeURIComponent(patch.uri)}`;
  const text = `Check out my patch "${patch.name}" on Mosh!`;

  await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: url,
          title: patch.name,
          description: 'A modular synth patch on Mosh',
        },
      },
    },
  });
}
```

**UI**: "Share on Bluesky" button in publish success dialog and on community patch cards (for your own patches).

### Profile cards

**`src/ui/components/ProfileCard.tsx`** — Hover popup on author names:
- Avatar, display name, @handle
- Bio (truncated)
- Follower / following counts
- Published patch count
- Data from `profileCache.ts`

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│           Browser (mosh.miren.club)      │
│                                          │
│  React + Zustand + @xyflow/react         │
│  ┌──────────┐  ┌──────────────────┐     │
│  │ patchStore│  │ authStore        │     │
│  │ (synth)  │  │ (AT Proto OAuth) │     │
│  └──────────┘  └──────────────────┘     │
│       │              │                   │
│       │         @atproto/api             │
│       │              │                   │
│       │    ┌─────────┴──────────┐       │
│       │    │                    │       │
│       │    ▼                    ▼       │
│       │  User's PDS        Public API   │
│       │  (write records)   (read profiles)│
│       │                                  │
│       │    ┌──────────────────┐         │
│       └───►│ mosh-api backend │         │
│            │ (browse/search)  │         │
│            └──────────────────┘         │
└─────────────────────────────────────────┘

User's PDS (bsky.social etc):
  club.miren.mosh.patch  — published patches
  club.miren.mosh.like   — likes on patches
  app.bsky.feed.post     — Bluesky shares

mosh-api backend (mosh-api.miren.club):
  SQLite index of all published patches
  REST API for browse/search/likes
  Push-registration model (frontend notifies on publish)
```

---

## Phase Sequencing

```
Phase 1 (Rename)  →  Phase 2 (Auth)  →  Phase 3 (Publish)  →  Phase 4 (Community)  →  Phase 5 (Social)
  client-only         client-only        client-only           + backend               + backend
```

Phases 1-3 need no backend at all — just the browser and user's PDS.

---

## Key Decisions

- **@atproto/oauth-client-browser** over custom broker — standard library, handles PKCE + DPoP, stores tokens in IndexedDB, auto-refreshes. Much simpler than freeq's custom Rust broker.
- **Push-registration** over firehose — when you publish, frontend tells the backend. No need to subscribe to millions of firehose events. Add firehose indexer later for completeness.
- **Patch content as JSON string** in AT Proto record — keeps lexicon simple, avoids deeply nested schema validation. 100KB limit is generous.
- **SQLite backend** — zero config, single file, perfect for small indexer. Upgrade to Postgres if needed.
- **No router needed** — OAuth callback handled by `BrowserOAuthClient.init()` on page load. Community browser is a sidebar panel, not a separate page.
- **Loopback client for dev** — AT Proto supports `http://localhost` clients without public metadata. Use `import.meta.env.DEV` to switch.
