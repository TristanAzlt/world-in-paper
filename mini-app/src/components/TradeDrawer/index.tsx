'use client';

import {
  Drawer,
  DrawerContent,
  SearchField,
  Spinner,
} from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Check, Xmark } from 'iconoir-react';
import { haptic } from '@/lib/haptics';
import { useState, useMemo } from 'react';
import type { Asset, AssetCategory } from '@/types';
import { getAssetsByCategory } from '@/lib/mock-data';
import { AnimatedText } from '@/components/AnimatedText';
import { AssetRow } from '@/components/AssetRow';

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
        {step === 'select' && (
          <div className="flex h-full flex-col">
            
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-xl font-bold" style={{ color: '#111' }}>Select Asset</h2>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#f0f0f0' }}
              >
                <Xmark width={20} height={20} style={{ color: '#555' }} />
              </button>
            </div>

            {/* Category tabs */}
            <div className="relative flex h-12 rounded-full mx-5 mb-4" style={{ backgroundColor: '#f0f0f0' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-transform duration-300 ease-out"
                style={{
                  width: '33.333%',
                  backgroundColor: '#111',
                  transform: category === 'stocks' ? 'translateX(100%)' : category === 'solana' ? 'translateX(200%)' : 'translateX(0)',
                }}
              />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(cat.key); setSearchQuery(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-[15px] font-semibold"
                  style={{ color: category === cat.key ? '#fff' : '#888' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <SearchField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Asset list */}
            <div className="overflow-y-auto px-5 pb-40" style={{ maxHeight: '60vh' }}>
              {filteredAssets.map((asset) => (
                <AssetRow key={asset.symbol} asset={asset} onSelect={handleSelectAsset} />
              ))}
              {filteredAssets.length === 0 && (
                <p className="py-12 text-center text-sm" style={{ color: '#999' }}>No assets found</p>
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
                  style={{ backgroundColor: '#f0f0f0' }}
                >
                  <NavArrowLeft width={20} height={20} style={{ color: '#555' }} />
                </button>
                <img
                  src={selectedAsset.iconUrl}
                  alt={selectedAsset.symbol}
                  className="h-9 w-9 rounded-full"
                  style={{ backgroundColor: '#f0f0f0' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#111' }}>{selectedAsset.symbol}</h2>
                  <p className="text-xs" style={{ color: '#888' }}>{selectedAsset.name}</p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ backgroundColor: '#f0f0f0' }}
              >
                <Xmark width={20} height={20} style={{ color: '#555' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 px-5 pb-40">
              {/* Price card */}
              <div className="rounded-2xl py-6 text-center" style={{ backgroundColor: '#f7f7f7' }}>
                <AnimatedText className="text-4xl font-bold" style={{ color: '#111' }}>
                  {formatPrice(selectedAsset.price)}
                </AnimatedText>
                <div
                  className="mt-2 text-base font-semibold"
                  style={{ color: selectedAsset.change24h >= 0 ? '#16a34a' : '#ef4444' }}
                >
                  {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h.toFixed(1)}%
                </div>
              </div>

              {/* Buy / Sell toggle */}
              <div className="relative flex h-14 rounded-full" style={{ backgroundColor: '#f0f0f0' }}>
                <div
                  className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: '#111',
                    transform: side === 'sell' ? 'translateX(100%)' : 'translateX(0)',
                  }}
                />
                <button
                  onClick={() => { setSide('buy'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'buy' ? '#fff' : '#888' }}
                >
                  BUY
                </button>
                <button
                  onClick={() => { setSide('sell'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'sell' ? '#fff' : '#888' }}
                >
                  SELL
                </button>
              </div>

              {/* Amount */}
              <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#f7f7f7' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#999' }}>
                  {side === 'buy' ? 'Amount (USD)' : `Amount (${selectedAsset.symbol})`}
                </div>
                <div className="flex items-center gap-1">
                  {side === 'buy' && <span className="text-3xl font-bold" style={{ color: '#111' }}>$</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-3xl font-bold outline-none"
                    style={{ color: '#111' }}
                  />
                  {side === 'sell' && <span className="text-lg font-bold" style={{ color: '#aaa' }}>{selectedAsset.symbol}</span>}
                </div>
                <div className="mt-2 text-xs" style={{ color: '#999' }}>
                  {side === 'buy'
                    ? `Available: $${availableBalance.toLocaleString()}`
                    : `Available: — ${selectedAsset.symbol}`
                  }
                </div>
              </div>

              {/* Quick percent + MAX */}
              {side === 'sell' && tokenBalance === 0 ? (
                <div className="rounded-2xl py-4 text-center" style={{ backgroundColor: '#fef2f2' }}>
                  <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
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
                          backgroundColor: isSelected ? '#111' : '#f0f0f0',
                          color: isSelected ? '#fff' : '#555',
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
                          backgroundColor: isSelected ? '#111' : '#f0f0f0',
                          color: isSelected ? '#fff' : '#555',
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
                  backgroundColor: '#f7f7f7',
                  maxHeight: amountNum > 0 ? '100px' : '0px',
                  opacity: amountNum > 0 ? 1 : 0,
                  padding: amountNum > 0 ? undefined : '0 20px',
                  marginTop: amountNum > 0 ? undefined : '-20px',
                }}
              >
                <div className="text-sm" style={{ color: '#888' }}>
                  {side === 'buy' ? 'You receive' : 'You get'}
                </div>
                <AnimatedText className="mt-1 text-lg font-bold" style={{ color: '#111', display: 'block' }}>
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
                  backgroundColor: '#111',
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
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 px-5">
            {step === 'confirming' ? (
              <>
                <Spinner />
                <p className="text-lg font-semibold" style={{ color: '#555' }}>Submitting trade...</p>
              </>
            ) : (
              <>
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#dcfce7' }}
                >
                  <Check width={36} height={36} style={{ color: '#16a34a' }} />
                </div>
                <p className="text-xl font-bold" style={{ color: '#111' }}>Trade confirmed</p>
              </>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
