import Image from 'next/image';
import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center gap-8">
        <AuthButton />
      </Page.Main>
    </Page>
  );
}
