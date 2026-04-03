'use client';

import { Button, Input, LiveFeedback, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft } from 'iconoir-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Page } from '@/components/PageLayout';

export default function CreateGamePage() {
  const router = useRouter();
  const [buyIn, setBuyIn] = useState('10');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [startingCapital, setStartingCapital] = useState('5000');
  const [state, setState] = useState<'pending' | 'success' | undefined>(undefined);

  const handleCreate = () => {
    setState('pending');
    setTimeout(() => {
      setState('success');
      setTimeout(() => router.push('/my-games'), 800);
    }, 1500);
  };

  return (
    <>
      <Page.Header>
        <TopBar
          title="Create Game"
          startAdornment={
            <button onClick={() => router.back()} className="p-1">
              <NavArrowLeft />
            </button>
          }
        />
      </Page.Header>

      <Page.Main>
        <div className="space-y-5">
          <Input
            type="number"
            label="Buy-in (USDC)"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
          />

          <Input
            type="number"
            label="Max Players"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
          />

          <Input
            type="number"
            label="Starting Capital ($)"
            value={startingCapital}
            onChange={(e) => setStartingCapital(e.target.value)}
          />

          <LiveFeedback
            label={{
              pending: 'Creating...',
              success: 'Game created',
              failed: 'Failed',
            }}
            state={state}
            className="w-full"
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleCreate}
              disabled={state === 'pending'}
            >
              Create Game
            </Button>
          </LiveFeedback>
        </div>
      </Page.Main>
    </>
  );
}
