import { useState, useEffect } from 'react';
import { getProfile } from '../../atproto/profileCache';

interface ProfileCardProps {
  did: string;
  children: React.ReactNode;
}

export function ProfileCard({ did, children }: ProfileCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show && !profile) {
      getProfile(did).then(setProfile);
    }
  }, [show, did, profile]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && profile && (
        <div className="absolute left-0 bottom-full mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 w-64 p-3">
          <div className="flex items-start gap-3">
            {profile.avatar && (
              <img src={profile.avatar} alt="" className="w-10 h-10 rounded-full shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">
                {profile.displayName || profile.handle}
              </div>
              <div className="text-xs text-gray-400 truncate">@{profile.handle}</div>
            </div>
          </div>
          {profile.description && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{profile.description}</p>
          )}
          <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
            <span><strong className="text-gray-300">{profile.followersCount ?? 0}</strong> followers</span>
            <span><strong className="text-gray-300">{profile.followsCount ?? 0}</strong> following</span>
          </div>
        </div>
      )}
    </div>
  );
}
