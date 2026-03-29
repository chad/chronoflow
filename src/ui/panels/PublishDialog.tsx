import { useState } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { useAuthStore } from '../../atproto/authStore';
import { publishPatch } from '../../atproto/patchRecords';
import { registerPatch } from '../../atproto/api';
import { shareToBluesky } from '../../atproto/shareToBluesky';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublishDialog({ isOpen, onClose }: PublishDialogProps) {
  const patch = usePatchStore((state) => state.patch);
  const agent = useAuthStore((state) => state.agent);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ uri: string; cid: string } | null>(null);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!agent) return;
    setIsPublishing(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);
      const result = await publishPatch(agent, patch, { description, tags });
      // Register with backend index
      registerPatch(result.uri, result.cid).catch(console.error);
      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setTagsInput('');
    setError(null);
    setSuccess(null);
    setShared(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-bold text-gray-200">Publish Patch</h2>
        </div>

        <div className="p-4 space-y-3">
          {success ? (
            <div className="space-y-2">
              <div className="text-sm text-green-400">Published successfully!</div>
              <div className="text-xs text-gray-400 break-all">URI: {success.uri}</div>
              {agent && !shared && (
                <button
                  onClick={async () => {
                    await shareToBluesky(agent, { name: patch.meta.name, uri: success.uri });
                    setShared(true);
                  }}
                  className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
                >
                  Share on Bluesky
                </button>
              )}
              {shared && <div className="text-xs text-blue-400">Shared to Bluesky!</div>}
              <button
                onClick={handleClose}
                className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Patch Name</label>
                <div className="px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-300">{patch.meta.name}</div>
              </div>

              <div className="flex gap-4 text-xs text-gray-400">
                <span>{patch.nodes.length} nodes</span>
                <span>{patch.connections.length} connections</span>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this patch sound like?"
                  className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white resize-none h-20 outline-none focus:border-cyan-400"
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ambient, generative, drone"
                  className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white outline-none focus:border-cyan-400"
                />
              </div>

              {error && (
                <div className="text-xs text-red-400">{error}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="flex-1 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded"
                >
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
