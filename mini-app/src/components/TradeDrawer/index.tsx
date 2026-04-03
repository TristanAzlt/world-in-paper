'use client';

import {
  Drawer,
  DrawerContent,
  Input,
  SearchField,
  Spinner,
} from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Check } from 'iconoir-react';
import { useState, useMemo } from 'react';
import type { Asset, AssetCategory } from '@/types';
import { getAssetsByCategory } from '@/lib/mock-data';
import { AssetRow } from '@/components/AssetRow';

interface TradeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

type Step = 'select' | 'order' | 'confirming' | 'success';

const QUICK_AMOUNTS = [25, 50, 100, 500];
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

export function TradeDrawer({ isOpen, onClose, availableBalance }: TradeDrawerProps) {
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
  const canConfirm = amountNum > 0 && amountNum <= availableBalance;

  const handleSelectAsset = (asset: Asset) => {
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
    setStep('confirming');
    setTimeout(() => {
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
    <Drawer open={isOpen} onOpenChange={handleOpenChange} snapPoints={[0.92]}>
      <DrawerContent>
        {/* ====== STEP 1: Asset Selection ====== */}
        {step === 'select' && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="px-5 pt-2 pb-4">
              <h2 className="text-xl font-bold" style={{ color: '#111' }}>Select Asset</h2>
            </div>

            {/* Category tabs - gros boutons pilule */}
            <div className="flex gap-2 px-5 pb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(cat.key); setSearchQuery(''); }}
                  className="flex-1 rounded-full py-3.5 text-[15px] font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: category === cat.key ? '#111' : '#f0f0f0',
                    color: category === cat.key ? '#fff' : '#888',
                  }}
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
            <div className="flex-1 overflow-y-auto px-5 pb-20">
              {filteredAssets.map((asset) => (
                <AssetRow key={asset.symbol} asset={asset} onSelect={handleSelectAsset} />
              ))}
              {filteredAssets.length === 0 && (
                <p className="py-12 text-center text-sm" style={{ color: '#999' }}>No assets found</p>
              )}
            </div>
          </div>
        )}

        {/* ====== STEP 2: Order ====== */}
        {step === 'order' && selectedAsset && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4">
              <button onClick={handleBack} className="p-2 -ml-2 rounded-full active:opacity-60" style={{ backgroundColor: '#f0f0f0' }}>
                <NavArrowLeft width={20} height={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#111' }}>{selectedAsset.symbol}</h2>
                <p className="text-sm" style={{ color: '#888' }}>{selectedAsset.name}</p>
              </div>
            </div>

            <div className="flex-1 space-y-5 px-5 pb-20">
              {/* Price card */}
              <div className="rounded-2xl py-6 text-center" style={{ backgroundColor: '#f7f7f7' }}>
                <div className="text-4xl font-bold" style={{ color: '#111' }}>
                  {formatPrice(selectedAsset.price)}
                </div>
                <div
                  className="mt-2 text-base font-semibold"
                  style={{ color: selectedAsset.change24h >= 0 ? '#16a34a' : '#ef4444' }}
                >
                  {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h.toFixed(1)}%
                </div>
              </div>

              {/* Buy / Sell toggle - gros */}
              <div className="relative flex h-14 rounded-full" style={{ backgroundColor: '#f0f0f0' }}>
                <div
                  className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: side === 'buy' ? '#16a34a' : '#ef4444',
                    transform: side === 'sell' ? 'translateX(100%)' : 'translateX(0)',
                  }}
                />
                <button
                  onClick={() => setSide('buy')}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'buy' ? '#fff' : '#888' }}
                >
                  BUY
                </button>
                <button
                  onClick={() => setSide('sell')}
                  className="relative z-10 flex-1 text-base font-bold"
                  style={{ color: side === 'sell' ? '#fff' : '#888' }}
                >
                  SELL
                </button>
              </div>

              {/* Amount */}
              <div>
                <Input
                  type="number"
                  label="Amount (USD)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="mt-1.5 text-right text-xs" style={{ color: '#999' }}>
                  Available: ${availableBalance.toLocaleString()}
                </div>
              </div>

              {/* Quick amounts - gros boutons */}
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    onClick={() => setAmount(qa.toString())}
                    className="flex-1 rounded-xl py-3.5 text-[15px] font-semibold active:scale-95 transition-transform"
                    style={{ backgroundColor: '#f0f0f0', color: '#555' }}
                  >
                    ${qa}
                  </button>
                ))}
              </div>

              {/* Estimated output */}
              {amountNum > 0 && (
                <div className="rounded-2xl py-4 text-center" style={{ backgroundColor: '#f7f7f7' }}>
                  <div className="text-sm" style={{ color: '#888' }}>You {side === 'buy' ? 'receive' : 'sell'}</div>
                  <div className="mt-1 text-lg font-bold" style={{ color: '#111' }}>
                    ~{estimatedTokens.toPrecision(6)} {selectedAsset.symbol}
                  </div>
                </div>
              )}

              {/* Confirm - gros bouton */}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full rounded-2xl py-5 text-lg font-bold transition-all active:scale-[0.97] disabled:opacity-30"
                style={{
                  backgroundColor: side === 'buy' ? '#16a34a' : '#ef4444',
                  color: '#ffffff',
                }}
              >
                {side === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.symbol}
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP 3: Confirming / Success ====== */}
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
