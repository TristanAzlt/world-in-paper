'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Compass, Trophy, User } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

const TAB_ROUTES: Record<string, string> = {
  games: '/games',
  'my-games': '/my-games',
  profile: '/profile',
};

function getActiveTab(pathname: string): string {
  if (pathname.startsWith('/my-games')) return 'my-games';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'games';
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);

  const handleChange = (value: string) => {
    if (value === activeTab) return;
    const route = TAB_ROUTES[value];
    if (route) router.push(route);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleChange}>
      <TabItem value="games" icon={<Compass />} label="Explore" />
      <TabItem value="my-games" icon={<Trophy />} label="My Games" />
      <TabItem value="profile" icon={<User />} label="Profile" />
    </Tabs>
  );
}
