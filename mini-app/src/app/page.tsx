import Image from 'next/image';
import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <Image src="/wip-logo.png" alt="World In Paper" width={120} height={120} className="rounded-3xl" />
          <div className="text-center">
            <h1 className="text-3xl font-extrabold" style={{ color: '#ffffff' }}>
              World In Paper
            </h1>
            <p className="mt-2 text-base" style={{ color: '#9898aa' }}>
              Competitive paper trading
            </p>
          </div>
        </div>
        <AuthButton />
      </Page.Main>
    </Page>
  );
}
