'use client';

import { walletAuth } from '@/auth/wallet';
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

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/wip-logo.png"
          alt="World In Paper"
          className={`h-[120px] w-[120px] rounded-3xl ${isPending ? 'animate-spin' : ''}`}
          style={isPending ? { animationDuration: '3s' } : undefined}
        />
        <div className="text-center">
          <h1 className="text-3xl font-extrabold" style={{ color: '#ffffff' }}>
            World In Paper
          </h1>
          <p className="mt-2 text-base" style={{ color: '#9898aa' }}>
            Competitive paper trading
          </p>
        </div>
      </div>

      {isPending ? (
        <p className="text-sm font-semibold" style={{ color: '#9898aa' }}>Connecting...</p>
      ) : (
        <button
          onClick={onClick}
          className="rounded-full text-base font-bold active:scale-95 transition-all"
          style={{ height: '56px', width: '220px', backgroundColor: '#2470ff', color: '#ffffff' }}
        >
          Sign In
        </button>
      )}
    </div>
  );
};
