'use client';

import { Compass, Trophy, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { haptic } from '@/lib/haptics';

const TABS = [
  { key: 'games', path: '/games', icon: Compass, label: 'Explore' },
  { key: 'my-games', path: '/my-games', icon: Trophy, label: 'My Games' },
  { key: 'profile', path: '/profile', icon: User, label: 'Profile' },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith('/my-games')) return 'my-games';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'games';
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);

  return (
    <div className="flex justify-around px-2">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => {
              if (!isActive) {
                haptic.selection();
                router.push(tab.path);
              }
            }}
            className="flex flex-col items-center gap-1 py-1 px-4"
          >
            <Icon
              width={22}
              height={22}
              style={{ color: isActive ? '#2470ff' : '#6a6a7a' }}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: isActive ? '#2470ff' : '#6a6a7a' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
