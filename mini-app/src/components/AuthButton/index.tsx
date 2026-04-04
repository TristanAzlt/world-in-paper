'use client';

import { walletAuth } from '@/auth/wallet';
import { Spinner } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const { isInstalled } = useMiniKit();
  const session = useSession();
  const hasAttemptedAuth = useRef(false);

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) return;
    setIsPending(true);
    try {
      await walletAuth();
      // Keep pending — redirect is happening
    } catch (error) {
      console.error('Auth error', error);
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  useEffect(() => {
    if (isInstalled === true && !hasAttemptedAuth.current && session.status !== 'authenticated') {
      hasAttemptedAuth.current = true;
      setIsPending(true);
      walletAuth()
        .catch((error) => {
          console.error('Auto auth error', error);
          setIsPending(false);
        });
    }
  }, [isInstalled, session.status]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full animate-spin"
          style={{ border: '3px solid #24242e', borderTopColor: '#2470ff' }}
        />
        <p className="text-sm font-semibold" style={{ color: '#9898aa' }}>Connecting...</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="rounded-full text-base font-bold active:scale-95 transition-all"
      style={{ height: '56px', width: '220px', backgroundColor: '#2470ff', color: '#ffffff' }}
    >
      Sign In
    </button>
  );
};
