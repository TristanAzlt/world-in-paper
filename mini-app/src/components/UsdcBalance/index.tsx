'use client';

import { Drawer, DrawerContent } from '@worldcoin/mini-apps-ui-kit-react';
import { LoadingSpinner, SuccessState } from '@/components/LoadingState';
import { Plus, Xmark } from 'iconoir-react';
import Image from 'next/image';
import { useState } from 'react';
import { AnimatedText } from '@/components/AnimatedText';
import { haptic } from '@/lib/haptics';

interface UsdcBalanceProps {
  balance?: number;
}

const TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', balance: 0.85, price: 2060.45, icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'WLD', name: 'Worldcoin', balance: 124.5, price: 2.35, icon: 'https://app.hyperliquid.xyz/coins/WLD.svg' },
  { symbol: 'USDT', name: 'Tether', balance: 50.0, price: 1.0, icon: 'https://app.hyperliquid.xyz/coins/USDT.svg' },
];

const TOP_UP_AMOUNTS = [10, 25, 50, 100];

export function UsdcBalance({ balance }: UsdcBalanceProps) {
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<typeof TOKENS[0] | null>(null);
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<'select' | 'amount' | 'swapping' | 'done'>('select');

  const displayBalance = balance !== undefined
    ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '--';

  const amountNum = Number(amount) || 0;
  const tokenCost = selectedToken ? amountNum / selectedToken.price : 0;
  const canSwap = selectedToken && amountNum > 0 && tokenCost <= selectedToken.balance;

  const handleSelectToken = (token: typeof TOKENS[0]) => {
    haptic.selection();
    setSelectedToken(token);
    setState('amount');
    setAmount('');
  };

  const handleSwap = () => {
    haptic.medium();
    setState('swapping');
    setTimeout(() => {
      haptic.success();
      setState('done');
      setTimeout(() => {
        resetAndClose();
      }, 1200);
    }, 1500);
  };

  const resetAndClose = () => {
    setState('select');
    setSelectedToken(null);
    setAmount('');
    setOpen(false);
  };

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

      <Drawer open={open} onOpenChange={(o) => !o && resetAndClose()} dismissible={false} height="fit">
        <DrawerContent>
          <div className="px-5 pt-4 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold" style={{ color: '#ffffff' }}>
                {state === 'select' ? 'Top Up USDC' : state === 'amount' ? `Swap ${selectedToken?.symbol}` : 'Swapping'}
              </h2>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#24242e' }}
              >
                <Xmark width={20} height={20} style={{ color: '#9898aa' }} />
              </button>
            </div>

            {/* Step 1: Select token */}
            {state === 'select' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9898aa' }}>
                  Swap from
                </div>
                {TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
                    style={{ backgroundColor: '#1c1c24', padding: '16px' }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="h-10 w-10 rounded-full"
                        style={{ backgroundColor: '#24242e' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="text-left">
                        <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{token.symbol}</div>
                        <div className="text-xs" style={{ color: '#9898aa' }}>{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{token.balance}</div>
                      <div className="text-xs" style={{ color: '#9898aa' }}>
                        ~${(token.balance * token.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Amount */}
            {state === 'amount' && selectedToken && (
              <div className="space-y-5">
                {/* USDC amount input */}
                <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#1c1c24' }}>
                  <div className="text-xs font-medium mb-2" style={{ color: '#9898aa' }}>USDC to receive</div>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#ffffff' }}>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent text-3xl font-bold outline-none"
                      style={{ color: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {TOP_UP_AMOUNTS.map((v) => {
                    const isSelected = amountNum === v;
                    return (
                      <button
                        key={v}
                        onClick={() => { setAmount(v.toString()); haptic.selection(); }}
                        className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                        style={{
                          height: '50px',
                          backgroundColor: isSelected ? '#2470ff' : '#24242e',
                          color: isSelected ? '#ffffff' : '#6a6a7a',
                        }}
                      >
                        ${v}
                      </button>
                    );
                  })}
                </div>

                {/* Cost preview */}
                {amountNum > 0 && (
                  <div className="rounded-2xl py-3 px-4 flex items-center justify-between" style={{ backgroundColor: '#1c1c24' }}>
                    <span className="text-sm" style={{ color: '#6a6a7a' }}>Cost</span>
                    <span className="text-sm font-bold" style={{ color: tokenCost <= selectedToken.balance ? '#ffffff' : '#ff6b6b' }}>
                      {tokenCost.toPrecision(6)} {selectedToken.symbol}
                    </span>
                  </div>
                )}

                {/* Swap button */}
                <button
                  onClick={handleSwap}
                  disabled={!canSwap}
                  className="w-full rounded-2xl text-[17px] font-bold active:scale-[0.97] transition-all disabled:opacity-30"
                  style={{ height: '60px', backgroundColor: '#2470ff', color: '#ffffff' }}
                >
                  Swap to USDC
                </button>
              </div>
            )}

            {/* Swapping / Done */}
            {state === 'swapping' && <LoadingSpinner label="Swapping..." />}
            {state === 'done' && <SuccessState title={`+$${amount} USDC`} subtitle="Added to your balance" />}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
