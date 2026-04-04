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
      <Page.Footer className="px-0 fixed bottom-0 w-full z-50 pt-4 pb-8" style={{ backgroundColor: '#131318', borderTop: '1px solid #24242e' }}>
        <BottomNav />
      </Page.Footer>
    </Page>
  );
}
