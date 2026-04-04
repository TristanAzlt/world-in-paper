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
import { api } from '@/lib/api';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { AssetToken, OriginKey, PlayerPortfolio } from '@/types';
import { useAssets } from '@/hooks/useAssets';
import { useContract } from '@/hooks/useContract';
import { useQuote } from '@/hooks/useQuote';
import { AnimatedText } from '@/components/AnimatedText';
import { TokenIcon } from '@/components/TokenIcon';

function originToNum(origin: string): number {
  const map: Record<string, number> = {
    solana: 0, base: 1, ethereum: 2, bsc: 3, worldchain: 4, world: 4, hyperliquid: 5,
  };
  return map[origin.toLowerCase()] ?? 5;
}

const ORIGIN_NUM_TO_KEY: Record<string, OriginKey> = {
  '0': 'solana', '1': 'base', '2': 'ethereum', '3': 'bsc', '4': 'worldchain', '5': 'hyperliquid',
};

interface TradeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  gameId: string;
  walletAddress?: string;
  positions?: Array<{ symbol: string; quantity: number }>;
  preselectedAsset?: { address: string; origin: string } | null;
  onTradeSuccess?: () => void;
}

type Step = 'select' | 'order' | 'confirming' | 'settling' | 'success';
type MainTab = 'crypto' | 'tradfi';

const CRYPTO_SUBS: { key: OriginKey | 'top'; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'base', label: 'Base' },
  { key: 'ethereum', label: 'ETH' },
  { key: 'bsc', label: 'BSC' },
  { key: 'solana', label: 'SOL' },
  { key: 'worldchain', label: 'World' },
];

const TRADFI_SUBS = ['stocks', 'indices', 'commodities'] as const;

const QUICK_PERCENTS = [5, 10, 25, 50];

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(4)}`;
}

function formatQty(n: number): string {
  if (n === 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

function AssetRowItem({ asset, onSelect }: { asset: AssetToken; onSelect: (a: AssetToken) => void }) {
  return (
    <button
      onClick={() => onSelect(asset)}
      className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
      style={{ backgroundColor: '#1c1c24', marginBottom: '10px', padding: '16px' }}
    >
      <div className="flex items-center gap-3">
        <TokenIcon src={asset.image} alt={asset.symbol} />
        <div className="text-left">
          <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{asset.symbol}</div>
          <div className="text-xs" style={{ color: '#9898aa' }}>{asset.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
          {formatPrice(asset.price)}
        </div>
      </div>
    </button>
  );
}

export function TradeDrawer({ isOpen, onClose, availableBalance, gameId, walletAddress, positions = [], preselectedAsset, onTradeSuccess }: TradeDrawerProps) {
  const [step, setStep] = useState<Step>('select');
  const [mainTab, setMainTab] = useState<MainTab>('crypto');
  const [cryptoSub, setCryptoSub] = useState<OriginKey | 'top'>('top');
  const [tradfiSub, setTradfiSub] = useState<typeof TRADFI_SUBS[number]>('stocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetToken | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');

  const { submitTrade } = useContract();
  const { quote, loading: quoteLoading, failed: quoteFailed, getQuote } = useQuote();
  const [preselectionUsed, setPreselectionUsed] = useState(false);

  // Fetch assets based on current selection
  const activeOrigin: OriginKey = mainTab === 'crypto'
    ? (cryptoSub === 'top' ? 'hyperliquid' : cryptoSub)
    : 'hyperliquid';

  const { tokens, categories, loading: assetsLoading } = useAssets(activeOrigin);

  // Auto-select preselected asset: first switch origin, then find asset
  const preselectedOriginKey = preselectedAsset ? ORIGIN_NUM_TO_KEY[preselectedAsset.origin] || 'hyperliquid' : null;

  useEffect(() => {
    if (!preselectedAsset || !isOpen || selectedAsset || preselectionUsed) return;
    if (preselectedOriginKey === 'hyperliquid') {
      setMainTab('crypto');
      setCryptoSub('top');
    } else if (preselectedOriginKey) {
      setMainTab('crypto');
      setCryptoSub(preselectedOriginKey);
    }
  }, [preselectedAsset, isOpen, selectedAsset, preselectedOriginKey, preselectionUsed]);

  useEffect(() => {
    if (!preselectedAsset || !isOpen || selectedAsset || preselectionUsed) return;
    const allAssets = categories
      ? [...(categories.crypto || []), ...(categories.stocks || []), ...(categories.indices || []), ...(categories.commodities || [])]
      : tokens;
    const match = allAssets.find((a) => a.address.toLowerCase() === preselectedAsset.address.toLowerCase());
    if (match) {
      setSelectedAsset(match);
      setStep('order');
      setSide('sell');
      setPreselectionUsed(true);
    }
  }, [preselectedAsset, isOpen, tokens, categories, selectedAsset, preselectionUsed]);

  const displayAssets = useMemo(() => {
    let assets: AssetToken[] = [];

    if (mainTab === 'crypto') {
      if (cryptoSub === 'top') {
        // Hyperliquid crypto tokens
        assets = categories?.crypto || tokens;
      } else {
        // Other chain tokens
        assets = tokens;
      }
    } else {
      // TradFi from hyperliquid categories
      assets = categories?.[tradfiSub] || [];
    }

    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(
      (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    );
  }, [mainTab, cryptoSub, tradfiSub, tokens, categories, searchQuery]);

  const amountNum = Number(amount) || 0;

  // Convert human amount to raw integer string with given decimals
  const toRawAmount = (human: number, dec: number): string => {
    // Use string math to avoid precision loss with large decimals
    const [whole = '0', frac = ''] = human.toString().split('.');
    const padded = (frac + '0'.repeat(dec)).slice(0, dec);
    const raw = whole + padded;
    return raw.replace(/^0+/, '') || '0';
  };

  // Fetch quote from backend when amount changes
  useEffect(() => {
    if (!selectedAsset || !amount || amountNum === 0) return;
    const decimals = side === 'buy' ? 6 : (selectedAsset.decimals ?? 6);
    const rawAmount = toRawAmount(amountNum, decimals);
    const origin = (ORIGIN_NUM_TO_KEY[selectedAsset.origin] || activeOrigin) as OriginKey;
    getQuote(selectedAsset.address, origin, side === 'buy', rawAmount);
  }, [selectedAsset, amount, amountNum, side, activeOrigin, getQuote]);

  const estimatedTokens = useMemo(() => {
    if (quote && quote.price > 0 && amountNum > 0) {
      return side === 'buy' ? amountNum / quote.price : amountNum * quote.price;
    }
    if (!selectedAsset || amountNum === 0) return 0;
    return side === 'buy' ? amountNum / selectedAsset.price : amountNum * selectedAsset.price;
  }, [quote, selectedAsset, amountNum, side]);
  const tokenBalance = selectedAsset
    ? positions.find((p) => p.symbol === selectedAsset.address || p.symbol === selectedAsset.symbol)?.quantity ?? 0
    : 0;
  const hasQuote = quote && quote.price > 0;
  const canConfirm = hasQuote && (side === 'buy'
    ? amountNum > 0 && amountNum <= availableBalance
    : amountNum > 0 && amountNum <= tokenBalance);

  const handleSelectAsset = (asset: AssetToken) => {
    haptic.light();
    setSelectedAsset(asset);
    setStep('order');
    setAmount('');
    setSide('buy');
  };

  const handleBack = () => {
    haptic.light();
    setStep('select');
    setSelectedAsset(null);
  };

  const getAssetTradeCount = async (assetAddress: string) => {
    if (!walletAddress) return 0;
    try {
      const p = await api<PlayerPortfolio>(`/games/portfolio?gameId=${gameId}&user=${walletAddress}`);
      const token = p.tokens.find((t) => t.asset_address.toLowerCase() === assetAddress.toLowerCase());
      return token ? token.trades.length : 0;
    } catch {
      return 0;
    }
  };

  const waitForSettlement = async (assetAddress: string, tradesBefore: number) => {
    if (!walletAddress) return;
    const maxAttempts = 12;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const p = await api<PlayerPortfolio>(`/games/portfolio?gameId=${gameId}&user=${walletAddress}`);
        const token = p.tokens.find((t) => t.asset_address.toLowerCase() === assetAddress.toLowerCase());
        const tradesNow = token ? token.trades.length : 0;
        if (tradesNow > tradesBefore) return;
      } catch { /* keep polling */ }
    }
  };

  const handleConfirm = async () => {
    if (!selectedAsset || !gameId) return;
    haptic.medium();
    setStep('confirming');

    try {
      const tradesBefore = await getAssetTradeCount(selectedAsset.address);

      // Contract stores all balances in 6 decimals
      const amountIn = BigInt(toRawAmount(amountNum, 6));
      const result = await submitTrade(
        BigInt(gameId),
        selectedAsset.address,
        originToNum(selectedAsset.origin),
        side === 'buy',
        amountIn,
      );

      if (result?.data?.userOpHash) {
        setStep('settling');
        await waitForSettlement(selectedAsset.address, tradesBefore);

        haptic.success();
        setStep('success');
        onTradeSuccess?.();
        setTimeout(() => resetAndClose(), 1200);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (e) {
      console.error('Trade failed:', e);
      haptic.error();
      setStep('order');
    }
  };

  const resetAndClose = () => {
    setStep('select');
    setMainTab('crypto');
    setCryptoSub('top');
    setTradfiSub('stocks');
    setSearchQuery('');
    setSelectedAsset(null);
    setSide('buy');
    setAmount('');
    setPreselectionUsed(false);
    haptic.light();
    onClose();
  };

  return (
    <>
    <Drawer open={isOpen && step !== 'confirming' && step !== 'settling' && step !== 'success'} onOpenChange={(open) => !open && resetAndClose()} dismissible={false} snapPoints={[0.92]}>
      <DrawerContent>
        <VisuallyHidden.Root><DrawerTitle>Trade</DrawerTitle></VisuallyHidden.Root>

        {/* Step 1: Select */}
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

            {/* Main tabs: Crypto | TradFi */}
            <div className="relative flex h-11 rounded-full mx-5 mb-3" style={{ backgroundColor: '#24242e' }}>
              <div
                className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
                style={{ backgroundColor: '#2470ff', transform: mainTab === 'tradfi' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              <button
                onClick={() => { setMainTab('crypto'); setSearchQuery(''); haptic.selection(); }}
                className="relative z-10 flex-1 text-sm font-bold"
                style={{ color: mainTab === 'crypto' ? '#ffffff' : '#6a6a7a' }}
              >
                Crypto
              </button>
              <button
                onClick={() => { setMainTab('tradfi'); setSearchQuery(''); haptic.selection(); }}
                className="relative z-10 flex-1 text-sm font-bold"
                style={{ color: mainTab === 'tradfi' ? '#ffffff' : '#6a6a7a' }}
              >
                TradFi
              </button>
            </div>

            {/* Sub tabs */}
            {mainTab === 'crypto' ? (
              <div className="flex gap-2 overflow-x-auto px-5 pb-3" style={{ scrollbarWidth: 'none' }}>
                {CRYPTO_SUBS.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => { setCryptoSub(sub.key); setSearchQuery(''); haptic.selection(); }}
                    className="flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all"
                    style={{
                      backgroundColor: cryptoSub === sub.key ? '#2470ff' : '#24242e',
                      color: cryptoSub === sub.key ? '#ffffff' : '#6a6a7a',
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 px-5 pb-3">
                {TRADFI_SUBS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => { setTradfiSub(sub); setSearchQuery(''); haptic.selection(); }}
                    className="flex-1 rounded-full py-2 text-xs font-bold transition-all"
                    style={{
                      backgroundColor: tradfiSub === sub ? '#2470ff' : '#24242e',
                      color: tradfiSub === sub ? '#ffffff' : '#6a6a7a',
                    }}
                  >
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </button>
                ))}
              </div>
            )}

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
            <div className="flex-1 overflow-y-auto px-5 pb-24">
              {assetsLoading ? (
                <div className="space-y-2.5">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: '#1c1c24' }}>
                      <div className="h-10 w-10 rounded-full animate-pulse" style={{ backgroundColor: '#24242e' }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                        <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                      </div>
                      <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                    </div>
                  ))}
                </div>
              ) : displayAssets.length > 0 ? (
                <div className="animate-fade-in">
                  {displayAssets.map((asset) => (
                    <AssetRowItem key={`${asset.address}-${asset.origin}`} asset={asset} onSelect={handleSelectAsset} />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-sm" style={{ color: '#9898aa' }}>No assets found</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Order */}
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
                <TokenIcon src={selectedAsset.image} alt={selectedAsset.symbol} size={36} />
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
              <div className="rounded-2xl py-6 text-center" style={{ backgroundColor: '#1c1c24' }}>
                <AnimatedText className="text-4xl font-bold" style={{ color: '#ffffff' }}>
                  {formatPrice(selectedAsset.price)}
                </AnimatedText>
              </div>

              <div className="relative flex h-14 rounded-full" style={{ backgroundColor: '#24242e' }}>
                <div
                  className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
                  style={{ backgroundColor: '#2470ff', transform: side === 'sell' ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <button
                  onClick={() => { setSide('buy'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-[15px] font-extrabold tracking-wide"
                  style={{ color: side === 'buy' ? '#ffffff' : '#6a6a7a' }}
                >
                  BUY
                </button>
                <button
                  onClick={() => { setSide('sell'); setAmount(''); haptic.selection(); }}
                  className="relative z-10 flex-1 text-[15px] font-extrabold tracking-wide"
                  style={{ color: side === 'sell' ? '#ffffff' : '#6a6a7a' }}
                >
                  SELL
                </button>
              </div>

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
                  Available: {side === 'buy'
                    ? `$${availableBalance.toLocaleString()}`
                    : `${formatQty(tokenBalance)} ${selectedAsset.symbol}`
                  }
                </div>
              </div>

              <div className="flex gap-2">
                {QUICK_PERCENTS.map((pct) => {
                  const base = side === 'buy' ? availableBalance : tokenBalance;
                  const pctVal = Math.floor(base * pct / 100).toString();
                  const isSelected = amount === pctVal;
                  return (
                    <button
                      key={pct}
                      onClick={() => { setAmount(pctVal); haptic.selection(); }}
                      className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                      style={{ height: '50px', backgroundColor: isSelected ? '#2470ff' : '#24242e', color: isSelected ? '#ffffff' : '#6a6a7a' }}
                    >
                      {pct}%
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const maxVal = side === 'buy' ? Math.floor(availableBalance).toString() : tokenBalance.toString();
                    setAmount(maxVal);
                    haptic.selection();
                  }}
                  className="flex-1 rounded-2xl text-[15px] font-bold active:scale-95 transition-all"
                  style={{ height: '50px', backgroundColor: amount === Math.floor(availableBalance).toString() ? '#2470ff' : '#24242e', color: '#6a6a7a' }}
                >
                  MAX
                </button>
              </div>

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
                {quoteLoading ? (
                  <div className="mt-2 h-5 w-32 mx-auto rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                ) : (
                  <AnimatedText className="mt-1 text-lg font-bold" style={{ color: '#ffffff', display: 'block' }}>
                    {side === 'buy'
                      ? `~${formatQty(estimatedTokens)} ${selectedAsset.symbol}`
                      : `~$${estimatedTokens.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </AnimatedText>
                )}
              </div>

              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full rounded-2xl text-[17px] font-bold transition-all active:scale-[0.97] disabled:opacity-30"
                style={{
                  backgroundColor: quoteFailed ? '#ff6b6b' : '#2470ff',
                  color: '#ffffff',
                  height: '64px',
                }}
              >
                {quoteFailed ? 'Something went wrong' : 'Execute Trade'}
              </button>
            </div>
          </div>
        )}

      </DrawerContent>
    </Drawer>

    {/* Settlement overlay — separate small drawer */}
    <Drawer open={step === 'confirming' || step === 'settling' || step === 'success'} dismissible={false} height="fit">
      <DrawerContent>
        <VisuallyHidden.Root><DrawerTitle>Processing</DrawerTitle></VisuallyHidden.Root>
        <div className="flex flex-col items-center justify-center px-5 py-12">
          {step === 'confirming' && <LoadingSpinner label="Submitting trade..." />}
          {step === 'settling' && <LoadingSpinner label="Waiting for settlement..." />}
          {step === 'success' && <SuccessState title="Trade confirmed" subtitle="Your position has been updated" />}
        </div>
      </DrawerContent>
    </Drawer>
  </>
  );
}
