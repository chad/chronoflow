import { useState, useEffect } from 'react';
import type { PatchListItem } from '../../atproto/api';
import { getProfile } from '../../atproto/profileCache';
import { ProfileCard } from './ProfileCard';

interface PatchCardProps {
  patch: PatchListItem;
  isLiked?: boolean;
  onLoad: (patch: PatchListItem) => void;
  onLike?: (patch: PatchListItem) => void;
  onUnlike?: (patch: PatchListItem) => void;
}

export function PatchCard({ patch, isLiked, onLoad, onLike, onUnlike }: PatchCardProps) {
  const [avatar, setAvatar] = useState<string>('');

  useEffect(() => {
    getProfile(patch.did).then((p) => {
      if (p?.avatar) setAvatar(p.avatar);
    });
  }, [patch.did]);

  return (
    <div
      className="px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded cursor-pointer transition-colors"
      onClick={() => onLoad(patch)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-gray-200 truncate">{patch.name}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            isLiked ? onUnlike?.(patch) : onLike?.(patch);
          }}
          className={`text-xs shrink-0 ${isLiked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}
        >
          {isLiked ? '♥' : '♡'} {patch.likeCount}
        </button>
      </div>
      <ProfileCard did={patch.did}>
        <div className="flex items-center gap-1 mt-1">
          {avatar && <img src={avatar} alt="" className="w-3.5 h-3.5 rounded-full" />}
          <span className="text-[10px] text-gray-400 truncate">@{patch.handle}</span>
        </div>
      </ProfileCard>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
        <span>{patch.nodeCount} nodes</span>
        {patch.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-cyan-600">#{tag}</span>
        ))}
      </div>
    </div>
  );
}
