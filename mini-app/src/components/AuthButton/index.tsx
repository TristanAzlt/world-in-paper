'use client';

import { walletAuth } from '@/auth/wallet';
import { Spinner } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useRef, useState } from 'react';

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const { isInstalled } = useMiniKit();
  const hasAttemptedAuth = useRef(false);

  const onClick = useCallback(async () => {
    if (!isInstalled || isPending) return;
    setIsPending(true);
    try {
      await walletAuth();
    } catch (error) {
      console.error('Auth error', error);
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  useEffect(() => {
    if (isInstalled === true && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      setIsPending(true);
      walletAuth()
        .catch((error) => {
          console.error('Auto auth error', error);
          setIsPending(false);
        });
    }
  }, [isInstalled]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-sm" style={{ color: '#aaa' }}>Connecting...</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="rounded-full text-base font-bold active:scale-95 transition-all"
      style={{ height: '56px', width: '220px', backgroundColor: '#111', color: '#fff' }}
    >
      Sign In
    </button>
  );
};
