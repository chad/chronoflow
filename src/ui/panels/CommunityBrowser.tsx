import { useState, useEffect, useCallback } from 'react';
import { listPatches, getPatchContent, checkLikes, type PatchListItem } from '../../atproto/api';
import { PatchCard } from '../components/PatchCard';
import { useAuthStore } from '../../atproto/authStore';
import { usePatchStore } from '../../patch/patchStore';
import { likePatch, unlikePatch } from '../../atproto/likeRecords';
import { registerLike, removeLike } from '../../atproto/api';

export function CommunityBrowser() {
  const [isOpen, setIsOpen] = useState(false);
  const [patches, setPatches] = useState<PatchListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, string>>({});

  const agent = useAuthStore((state) => state.agent);
  const did = useAuthStore((state) => state.did);
  const importPatch = usePatchStore((state) => state.importPatch);
  const autoLayoutNodes = usePatchStore((state) => state.autoLayoutNodes);

  const fetchPatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPatches({ sort, page, search: search || undefined });
      setPatches(data.patches);
      setTotal(data.total);

      // Check likes for current user
      if (did && data.patches.length > 0) {
        const likes = await checkLikes(did, data.patches.map((p) => p.uri));
        setLikedMap(likes);
      }
    } catch (err) {
      console.error('[community] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [sort, page, search, did]);

  useEffect(() => {
    if (isOpen) fetchPatches();
  }, [isOpen, fetchPatches]);

  const handleLoad = async (patch: PatchListItem) => {
    const parts = patch.uri.replace('at://', '').split('/');
    const content = await getPatchContent(parts[0], parts[2]);
    if (content) {
      importPatch(content);
      setTimeout(() => autoLayoutNodes(), 0);
    }
  };

  const handleLike = async (patch: PatchListItem) => {
    if (!agent || !did) return;
    try {
      const res = await likePatch(agent, patch.uri, ''); // CID not needed for like
      const likeUri = res.data.uri;
      const rkey = likeUri.replace('at://', '').split('/')[2];
      await registerLike(likeUri, patch.uri, did);
      setLikedMap((prev) => ({ ...prev, [patch.uri]: likeUri }));
      setPatches((prev) => prev.map((p) => p.uri === patch.uri ? { ...p, likeCount: p.likeCount + 1 } : p));
    } catch (err) {
      console.error('[community] like failed:', err);
    }
  };

  const handleUnlike = async (patch: PatchListItem) => {
    if (!agent || !did) return;
    const likeUri = likedMap[patch.uri];
    if (!likeUri) return;
    try {
      const rkey = likeUri.replace('at://', '').split('/')[2];
      await unlikePatch(agent, rkey);
      await removeLike(did, rkey);
      setLikedMap((prev) => {
        const next = { ...prev };
        delete next[patch.uri];
        return next;
      });
      setPatches((prev) => prev.map((p) => p.uri === patch.uri ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p));
    } catch (err) {
      console.error('[community] unlike failed:', err);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1 w-full"
      >
        <span>{isOpen ? '▼' : '▶'}</span>
        <span className="font-bold text-gray-300">Community</span>
        {total > 0 && <span className="text-gray-500 ml-auto">{total}</span>}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search patches..."
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white outline-none focus:border-cyan-400"
          />

          <div className="flex gap-1">
            <button
              onClick={() => { setSort('recent'); setPage(1); }}
              className={`px-2 py-0.5 text-[10px] rounded ${sort === 'recent' ? 'bg-cyan-800 text-cyan-200' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              Recent
            </button>
            <button
              onClick={() => { setSort('popular'); setPage(1); }}
              className={`px-2 py-0.5 text-[10px] rounded ${sort === 'popular' ? 'bg-cyan-800 text-cyan-200' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              Popular
            </button>
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="text-xs text-gray-500 text-center py-4">Loading...</div>
            ) : patches.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No patches found</div>
            ) : (
              patches.map((patch) => (
                <PatchCard
                  key={patch.uri}
                  patch={patch}
                  isLiked={!!likedMap[patch.uri]}
                  onLoad={handleLoad}
                  onLike={handleLike}
                  onUnlike={handleUnlike}
                />
              ))
            )}
          </div>

          {total > patches.length && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full text-xs text-gray-400 hover:text-gray-300 py-1"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
