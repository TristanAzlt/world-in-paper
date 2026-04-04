'use client';

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@worldcoin/mini-apps-ui-kit-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { NavArrowLeft, Xmark, Search } from 'iconoir-react';
import { LoadingSpinner, SuccessState } from '@/components/LoadingState';
import { haptic } from '@/lib/haptics';
import { useState, useMemo } from 'react';
import type { Asset, AssetCategory } from '@/types';
import { getAssetsByCategory } from '@/lib/mock-data';
import { AnimatedText } from '@/components/AnimatedText';
import { AssetRow } from '@/components/AssetRow';
import { TokenIcon } from '@/components/TokenIcon';

interface TradeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  positions?: Array<{ symbol: string; quantity: number }>;
}

type Step = 'select' | 'order' | 'confirming' | 'success';

const QUICK_PERCENTS = [5, 10, 25, 50];
const CATEGORIES: { key: AssetCategory; label: string }[] = [
  { key: 'crypto', label: 'Crypto' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'solana', label: 'Solana' },
];

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(4)}`;
}

export function TradeDrawer({ isOpen, onClose, availableBalance, positions = [] }: TradeDrawerProps) {
  const [step, setStep] = useState<Step>('select');
  const [category, setCategory] = useState<AssetCategory>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');

  const filteredAssets = useMemo(() => {
    const assets = getAssetsByCategory(category);
    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(
      (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    );
  }, [category, searchQuery]);

  const estimatedTokens = useMemo(() => {
    if (!selectedAsset || !amount || Number(amount) === 0) return 0;
    return Number(amount) / selectedAsset.price;
  }, [selectedAsset, amount]);

  const amountNum = Number(amount) || 0;
  const tokenBalance = selectedAsset
    ? positions.find((p) => p.symbol === selectedAsset.symbol)?.quantity ?? 0
    : 0;
  const canConfirm = side === 'buy'
    ? amountNum > 0 && amountNum <= availableBalance
    : amountNum > 0 && amountNum <= tokenBalance;

  const handleSelectAsset = (asset: Asset) => {
    haptic.light();
    setSelectedAsset(asset);
    setStep('order');
    setAmount('');
    setSide('buy');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedAsset(null);
  };

  const handleConfirm = () => {
    haptic.medium();
    setStep('confirming');
    setTimeout(() => {
      haptic.success();
      setStep('success');
      setTimeout(() => resetAndClose(), 1200);
    }, 1500);
  };

  const resetAndClose = () => {
    setStep('select');
    setCategory('crypto');
    setSearchQuery('');
    setSelectedAsset(null);
    setSide('buy');
    setAmount('');
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetAndClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} dismissible={false} snapPoints={[0.92]}>
      <DrawerContent>
        <VisuallyHidden.Root><DrawerTitle>Trade</DrawerTitle></VisuallyHidden.Root>
        {step === 'select' && (
          <div className="flex h-full flex-col">
            
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-xl font-bold" style={{ color: '#ffffff' }}>Select Asset</h2>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#24242e' }}
              >
                <Xmark width={20} height={20} style={{ color: '#9898aa' }} />
              </button>
            </div>

            {/* Category tabs */}
            <div className="relative flex h-12 rounded-full mx-5 mb-4" style={{ backgroundColor: '#24242e' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-transform duration-300 ease-out"
                style={{
                  width: '33.333%',
                  backgroundColor: '#2470ff',
                  transform: category === 'stocks' ? 'translateX(100%)' : category === 'solana' ? 'translateX(200%)' : 'translateX(0)',
                }}
              />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(cat.key); setSearchQuery(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-[15px] font-semibold"
                  style={{ color: category === cat.key ? '#ffffff' : '#6a6a7a' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 rounded-2xl px-4" style={{ backgroundColor: '#24242e', height: '48px' }}>
                <Search width={18} height={18} style={{ color: '#6a6a7a' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent outline-none text-[15px]"
                  style={{ color: '#fff' }}
                />
              </div>
            </div>

            {/* Asset list */}
            <div className="overflow-y-auto px-5 pb-40" style={{ maxHeight: '60vh' }}>
              {filteredAssets.map((asset) => (
                <AssetRow key={asset.symbol} asset={asset} onSelect={handleSelectAsset} />
              ))}
              {filteredAssets.length === 0 && (
                <p className="py-12 text-center text-sm" style={{ color: '#9898aa' }}>No assets found</p>
              )}
            </div>
          </div>
        )}

        {step === 'order' && selectedAsset && (
          <div className="flex h-full flex-col">
            
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                  style={{ backgroundColor: '#24242e' }}
                >
                  <NavArrowLeft width={20} height={20} style={{ color: '#9898aa' }} />
                </button>
                <TokenIcon src={selectedAsset.iconUrl} alt={selectedAsset.symbol} size={36} />
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#ffffff' }}>{selectedAsset.symbol}</h2>
                  <p className="text-xs" style={{ color: '#6a6a7a' }}>{selectedAsset.name}</p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#24242e' }}
              >
                <Xmark width={20} height={20} style={{ color: '#9898aa' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 px-5 pb-40">
              {/* Price card */}
              <div className="rounded-2xl py-6 text-center" style={{ backgroundColor: '#1c1c24' }}>
                <AnimatedText className="text-4xl font-bold" style={{ color: '#ffffff' }}>
                  {formatPrice(selectedAsset.price)}
                </AnimatedText>
                <div
                  className="mt-2 text-base font-semibold"
                  style={{ color: selectedAsset.change24h >= 0 ? '#34c759' : '#ff6b6b' }}
                >
                  {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h.toFixed(1)}%
                </div>
              </div>

              {/* Buy / Sell toggle */}
              <div className="relative flex h-14 rounded-full" style={{ backgroundColor: '#24242e' }}>
                <div
                  className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: '#2470ff',
                    transform: side === 'sell' ? 'translateX(100%)' : 'translateX(0)',
                  }}
                />
                <button
                  onClick={() => { setSide('buy'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'buy' ? '#ffffff' : '#6a6a7a' }}
                >
                  BUY
                </button>
                <button
                  onClick={() => { setSide('sell'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'sell' ? '#ffffff' : '#6a6a7a' }}
                >
                  SELL
                </button>
              </div>

              {/* Amount */}
              <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#1c1c24' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#9898aa' }}>
                  {side === 'buy' ? 'Amount (USD)' : `Amount (${selectedAsset.symbol})`}
                </div>
                <div className="flex items-center gap-1">
                  {side === 'buy' && <span style={{ color: '#6a6a7a', fontSize: '36px', fontWeight: 600 }}>$</span>}
                  <input
                    data-trade-input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    style={{ color: '#ffffff', fontSize: '36px', fontWeight: 700 }}
                  />
                  {side === 'sell' && <span className="text-lg font-bold" style={{ color: '#9898aa' }}>{selectedAsset.symbol}</span>}
                </div>
                <div className="mt-2 text-xs" style={{ color: '#9898aa' }}>
                  {side === 'buy'
                    ? `Available: $${availableBalance.toLocaleString()}`
                    : `Available: — ${selectedAsset.symbol}`
                  }
                </div>
              </div>

              {/* Quick percent + MAX */}
              {side === 'sell' && tokenBalance === 0 ? (
                <div className="rounded-2xl py-4 text-center" style={{ backgroundColor: '#1c1c24' }}>
                  <span className="text-sm font-semibold" style={{ color: '#ff6b6b' }}>
                    No {selectedAsset.symbol} to sell
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {QUICK_PERCENTS.map((pct) => {
                    const base = side === 'buy' ? availableBalance : tokenBalance;
                    const pctVal = side === 'buy'
                      ? Math.floor(base * pct / 100).toString()
                      : (base * pct / 100).toPrecision(6);
                    const isSelected = amount === pctVal;
                    return (
                      <button
                        key={pct}
                        onClick={() => { setAmount(pctVal); haptic.selection(); }}
                        className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                        style={{
                          height: '50px',
                          backgroundColor: isSelected ? '#2470ff' : '#24242e',
                          color: isSelected ? '#ffffff' : '#6a6a7a',
                        }}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                  {(() => {
                    const maxVal = side === 'buy'
                      ? Math.floor(availableBalance).toString()
                      : tokenBalance.toString();
                    const isSelected = amount === maxVal;
                    return (
                      <button
                        onClick={() => { setAmount(maxVal); haptic.selection(); }}
                        className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                        style={{
                          height: '50px',
                          backgroundColor: isSelected ? '#2470ff' : '#24242e',
                          color: isSelected ? '#ffffff' : '#6a6a7a',
                        }}
                      >
                        MAX
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Estimated output */}
              <div
                className="rounded-2xl py-4 text-center transition-all duration-300 overflow-hidden"
                style={{
                  backgroundColor: '#1c1c24',
                  maxHeight: amountNum > 0 ? '100px' : '0px',
                  opacity: amountNum > 0 ? 1 : 0,
                  padding: amountNum > 0 ? undefined : '0 20px',
                  marginTop: amountNum > 0 ? undefined : '-20px',
                }}
              >
                <div className="text-sm" style={{ color: '#6a6a7a' }}>
                  {side === 'buy' ? 'You receive' : 'You get'}
                </div>
                <AnimatedText className="mt-1 text-lg font-bold" style={{ color: '#ffffff', display: 'block' }}>
                  {side === 'buy'
                    ? `~${estimatedTokens.toPrecision(6)} ${selectedAsset.symbol}`
                    : `~$${(amountNum * selectedAsset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </AnimatedText>
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full rounded-2xl text-[17px] font-bold transition-all active:scale-[0.97] disabled:opacity-30"
                style={{
                  backgroundColor: '#2470ff',
                  color: '#ffffff',
                  height: '64px',
                }}
              >
                Execute Trade
              </button>
            </div>
          </div>
        )}

        {(step === 'confirming' || step === 'success') && (
          <div className="min-h-[400px] flex items-center justify-center px-5">
            {step === 'confirming'
              ? <LoadingSpinner label="Submitting trade..." />
              : <SuccessState title="Trade confirmed" subtitle="Your position has been updated" />
            }
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
