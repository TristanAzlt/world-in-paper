import { auth } from '@/auth';
import { BottomNav } from '@/components/BottomNav';
import { Page } from '@/components/PageLayout';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    console.log('Not authenticated');
  }

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white z-50 pt-2 pb-8 border-t border-gray-100">
        <BottomNav />
      </Page.Footer>
    </Page>
  );
}
