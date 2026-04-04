'use client';

import { Drawer, DrawerContent, Spinner } from '@worldcoin/mini-apps-ui-kit-react';
import { Plus, Xmark } from 'iconoir-react';
import Image from 'next/image';
import { useState } from 'react';
import { AnimatedText } from '@/components/AnimatedText';
import { haptic } from '@/lib/haptics';

interface UsdcBalanceProps {
  balance?: number;
}

const TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', balance: 0.85, price: 2060.45, icon: 'https://app.hyperliquid.xyz/coins/ETH.svg' },
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
        style={{ backgroundColor: '#f7f7f7', padding: '8px 14px' }}
      >
        <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={18} height={18} />
        <AnimatedText className="text-sm font-bold" style={{ color: '#111' }}>
          {displayBalance}
        </AnimatedText>
        <Plus width={14} height={14} style={{ color: '#aaa' }} />
      </button>

      <Drawer open={open} onOpenChange={(o) => !o && resetAndClose()} dismissible={false} height="fit">
        <DrawerContent>
          <div className="px-5 pt-4 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold" style={{ color: '#111' }}>
                {state === 'select' ? 'Top Up USDC' : state === 'amount' ? `Swap ${selectedToken?.symbol}` : 'Swapping'}
              </h2>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#f0f0f0' }}
              >
                <Xmark width={20} height={20} style={{ color: '#555' }} />
              </button>
            </div>

            {/* Step 1: Select token */}
            {state === 'select' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#aaa' }}>
                  Swap from
                </div>
                {TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
                    style={{ backgroundColor: '#f7f7f7', padding: '16px' }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="h-10 w-10 rounded-full"
                        style={{ backgroundColor: '#eee' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="text-left">
                        <div className="text-[15px] font-bold" style={{ color: '#111' }}>{token.symbol}</div>
                        <div className="text-xs" style={{ color: '#aaa' }}>{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold" style={{ color: '#111' }}>{token.balance}</div>
                      <div className="text-xs" style={{ color: '#aaa' }}>
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
                <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#f7f7f7' }}>
                  <div className="text-xs font-medium mb-2" style={{ color: '#999' }}>USDC to receive</div>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#111' }}>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent text-3xl font-bold outline-none"
                      style={{ color: '#111' }}
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
                          backgroundColor: isSelected ? '#111' : '#f0f0f0',
                          color: isSelected ? '#fff' : '#555',
                        }}
                      >
                        ${v}
                      </button>
                    );
                  })}
                </div>

                {/* Cost preview */}
                {amountNum > 0 && (
                  <div className="rounded-2xl py-3 px-4 flex items-center justify-between" style={{ backgroundColor: '#f7f7f7' }}>
                    <span className="text-sm" style={{ color: '#888' }}>Cost</span>
                    <span className="text-sm font-bold" style={{ color: tokenCost <= selectedToken.balance ? '#111' : '#ef4444' }}>
                      {tokenCost.toPrecision(6)} {selectedToken.symbol}
                    </span>
                  </div>
                )}

                {/* Swap button */}
                <button
                  onClick={handleSwap}
                  disabled={!canSwap}
                  className="w-full rounded-2xl text-[17px] font-bold active:scale-[0.97] transition-all disabled:opacity-30"
                  style={{ height: '60px', backgroundColor: '#111', color: '#fff' }}
                >
                  Swap to USDC
                </button>
              </div>
            )}

            {/* Swapping / Done */}
            {state === 'swapping' && (
              <div className="flex flex-col items-center justify-center gap-4 py-10">
                <Spinner />
                <p className="text-base font-semibold" style={{ color: '#555' }}>Swapping...</p>
              </div>
            )}
            {state === 'done' && (
              <div className="flex flex-col items-center justify-center gap-4 py-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f0f0' }}>
                  <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={32} height={32} />
                </div>
                <p className="text-lg font-bold" style={{ color: '#111' }}>+${amount} USDC</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
