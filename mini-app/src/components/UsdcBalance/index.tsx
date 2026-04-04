'use client';

import { Drawer, DrawerContent, DrawerTitle } from '@worldcoin/mini-apps-ui-kit-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { LoadingSpinner, SuccessState } from '@/components/LoadingState';
import { TokenIcon } from '@/components/TokenIcon';
import { Plus, Xmark, Copy, NavArrowLeft } from 'iconoir-react';
import Image from 'next/image';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AnimatedText } from '@/components/AnimatedText';
import { useBalances, type TokenBalance } from '@/hooks/useBalances';
import { useSwap } from '@/hooks/useSwap';
import { haptic } from '@/lib/haptics';
import { TOKENS } from '@/lib/constants';
import { parseUnits, formatUnits } from 'viem';

const TOKEN_ICONS: Record<string, string> = {
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  WETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  WLD: 'https://app.hyperliquid.xyz/coins/WLD.svg',
  WBTC: 'https://app.hyperliquid.xyz/coins/BTC.svg',
  uXRP: 'https://app.hyperliquid.xyz/coins/XRP.svg',
  uSOL: 'https://app.hyperliquid.xyz/coins/SOL.svg',
  USDC: '/usd-coin-usdc-logo.svg',
};

export function UsdcBalance() {
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const { balances, usdcBalance, loading, refetch } = useBalances(walletAddress);
  const { getQuote, executeSwap, quote } = useSwap(walletAddress);

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<'main' | 'swap' | 'confirm' | 'swapping' | 'done' | 'error'>('main');
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [amount, setAmount] = useState('');

  const displayBalance = loading ? '...' : usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const amountNum = Number(amount) || 0;

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      haptic.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectToken = async (token: TokenBalance) => {
    haptic.selection();
    setSelectedToken(token);
    setState('swap');
    setAmount('');
  };

  const handleAmountChange = async (val: string) => {
    setAmount(val);
    if (selectedToken && Number(val) > 0) {
      try {
        const tokenAmount = parseUnits(val, selectedToken.decimals).toString();
        await getQuote(selectedToken.address, TOKENS.USDC.address, tokenAmount);
      } catch (e) {
        console.error('Quote error:', e);
      }
    }
  };

  const handleSetMax = () => {
    if (selectedToken) {
      setAmount(selectedToken.formatted.toString());
      haptic.selection();
      try {
        const tokenAmount = selectedToken.balance.toString();
        getQuote(selectedToken.address, TOKENS.USDC.address, tokenAmount);
      } catch (e) {
        console.error('Max quote error:', e);
      }
    }
  };

  const handleSwap = async () => {
    if (!selectedToken || amountNum <= 0) return;
    haptic.medium();
    setState('swapping');

    // If max, use raw balance to avoid float precision issues
    const isMax = amount === selectedToken.formatted.toString();
    const tokenAmount = isMax
      ? selectedToken.balance.toString()
      : parseUnits(amount, selectedToken.decimals).toString();
    console.log('Swap amount:', amount, 'isMax:', isMax, 'raw:', tokenAmount);
    const result = await executeSwap(selectedToken.address, tokenAmount);

    if (result?.data?.userOpHash) {
      haptic.success();
      setState('done');
      // Wait for tx to be mined then refetch
      setTimeout(() => refetch(), 5000);
      setTimeout(() => refetch(), 10000);
      setTimeout(() => resetAndClose(), 3000);
    } else {
      haptic.error();
      setState('error');
      setTimeout(() => setState('swap'), 2000);
    }
  };

  const resetAndClose = () => {
    setState('main');
    setSelectedToken(null);
    setAmount('');
    setOpen(false);
  };

  const usdcOut = quote ? Number(formatUnits(BigInt(quote.amountOut), 6)) : 0;

  return (
    <>
      <button
        onClick={() => { setOpen(true); haptic.light(); }}
        className="flex items-center gap-1.5 rounded-full active:scale-95 transition-transform"
        style={{ backgroundColor: '#1c1c24', padding: '8px 14px' }}
      >
        <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={18} height={18} />
        <AnimatedText className="text-sm font-bold" style={{ color: '#ffffff' }}>
          {displayBalance}
        </AnimatedText>
        <Plus width={14} height={14} style={{ color: '#9898aa' }} />
      </button>

      <Drawer open={open} onOpenChange={(o) => !o && resetAndClose()} dismissible={state === 'main'} height="fit">
        <DrawerContent>
          <VisuallyHidden.Root><DrawerTitle>Wallet</DrawerTitle></VisuallyHidden.Root>
          <div className="px-5 pt-6 pb-10">

            {/* Main: balances + copy */}
            {state === 'main' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-extrabold" style={{ color: '#ffffff' }}>Top Up</h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                    style={{ backgroundColor: '#24242e' }}
                  >
                    <Xmark width={20} height={20} style={{ color: '#9898aa' }} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {balances.filter((t) => t.symbol !== 'USDC' && t.symbol !== 'ETH' && t.symbol !== 'WETH').map((token) => {
                    const canSwap = token.formatted > 0.001 && token.symbol !== 'ETH' && token.symbol !== 'WETH';
                    return (
                    <button
                      key={token.symbol}
                      onClick={() => canSwap ? handleSelectToken(token) : null}
                      disabled={!canSwap}
                      className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all disabled:opacity-60"
                      style={{ backgroundColor: '#1c1c24', padding: '16px' }}
                    >
                      <div className="flex items-center gap-3">
                        <TokenIcon src={TOKEN_ICONS[token.symbol] || ''} alt={token.symbol} size={40} />
                        <div className="text-left">
                          <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{token.symbol}</div>
                          <div className="text-xs" style={{ color: '#9898aa' }}>{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-bold" style={{ color: token.formatted > 0 ? '#ffffff' : '#6a6a7a' }}>
                          {token.formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </div>
                        <div className="text-xs" style={{ color: canSwap ? '#2470ff' : '#6a6a7a' }}>
                          {canSwap ? 'Swap →' : token.formatted > 0 ? '' : 'No balance'}
                        </div>
                      </div>
                    </button>
                    );
                  })}

                  {loading && (
                    <div className="py-6 text-center">
                      <div className="h-6 w-6 rounded-full animate-spin mx-auto mb-2" style={{ border: '2px solid #24242e', borderTopColor: '#2470ff' }} />
                      <p className="text-sm" style={{ color: '#6a6a7a' }}>Loading...</p>
                    </div>
                  )}
                </div>

                {walletAddress && (
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-between rounded-2xl active:scale-[0.98] transition-all mb-4"
                    style={{ backgroundColor: '#1c1c24', padding: '16px' }}
                  >
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#6a6a7a' }}>Your address (World Chain)</div>
                      <div className="text-sm font-bold" style={{ color: '#9898aa' }}>
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Copy width={16} height={16} style={{ color: '#9898aa' }} />
                      <span className="text-xs font-semibold" style={{ color: copied ? '#34c759' : '#9898aa' }}>
                        {copied ? 'Copied' : 'Copy'}
                      </span>
                    </div>
                  </button>
                )}

                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#2470ff15', border: '1px solid #2470ff30' }}>
                  <p className="text-[13px]" style={{ color: '#9898bb' }}>
                    Tap a token to swap it to USDC, or send USDC on World Chain to your address.
                  </p>
                </div>
              </>
            )}

            {/* Swap: amount input */}
            {state === 'swap' && selectedToken && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setState('main')}
                      className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                      style={{ backgroundColor: '#24242e' }}
                    >
                      <NavArrowLeft width={20} height={20} style={{ color: '#9898aa' }} />
                    </button>
                    <h2 className="text-xl font-extrabold" style={{ color: '#ffffff' }}>
                      Swap {selectedToken.symbol}
                    </h2>
                  </div>
                  <button
                    onClick={resetAndClose}
                    className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                    style={{ backgroundColor: '#24242e' }}
                  >
                    <Xmark width={20} height={20} style={{ color: '#9898aa' }} />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Amount input */}
                  <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#1c1c24' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: '#6a6a7a' }}>
                      {selectedToken.symbol} to swap
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        data-trade-input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full bg-transparent outline-none"
                        style={{ color: '#ffffff', fontSize: '36px', fontWeight: 700 }}
                      />
                      <span className="text-lg font-bold" style={{ color: '#6a6a7a' }}>{selectedToken.symbol}</span>
                    </div>
                    <div className="mt-2 text-xs" style={{ color: '#6a6a7a' }}>
                      Balance: {selectedToken.formatted.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </div>
                  </div>

                  {/* Quick buttons */}
                  <div className="flex gap-2">
                    {[25, 50, 75].map((pct) => {
                      const val = (selectedToken.formatted * pct / 100).toString();
                      return (
                        <button
                          key={pct}
                          onClick={() => { handleAmountChange(val); haptic.selection(); }}
                          className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                          style={{ height: '50px', backgroundColor: '#24242e', color: '#9898aa' }}
                        >
                          {pct}%
                        </button>
                      );
                    })}
                    <button
                      onClick={handleSetMax}
                      className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                      style={{ height: '50px', backgroundColor: '#2470ff', color: '#ffffff' }}
                    >
                      MAX
                    </button>
                  </div>

                  {/* Quote preview */}
                  {amountNum > 0 && quote && (
                    <div className="rounded-2xl py-3 px-4 flex items-center justify-between" style={{ backgroundColor: '#1c1c24' }}>
                      <span className="text-sm" style={{ color: '#6a6a7a' }}>You receive</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                          ~${usdcOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={14} height={14} />
                      </div>
                    </div>
                  )}

                  {/* Swap button */}
                  <button
                    onClick={handleSwap}
                    disabled={amountNum <= 0 || amountNum > selectedToken.formatted || !quote}
                    className="w-full rounded-2xl text-[17px] font-bold active:scale-[0.97] transition-all disabled:opacity-30"
                    style={{ height: '60px', backgroundColor: '#2470ff', color: '#ffffff' }}
                  >
                    Swap to USDC
                  </button>
                </div>
              </>
            )}

            {state === 'swapping' && <LoadingSpinner label="Swapping..." />}
            {state === 'done' && <SuccessState title={`+$${usdcOut.toFixed(2)} USDC`} subtitle="Added to your balance" />}
            {state === 'error' && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: '#ff6b6b20' }}>
                  <Xmark width={36} height={36} style={{ color: '#ff6b6b' }} />
                </div>
                <p className="text-xl font-bold" style={{ color: '#ffffff' }}>Swap failed</p>
                <p className="text-sm" style={{ color: '#9898aa' }}>Please try again</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
