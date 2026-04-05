import { ArrowUp, ArrowDown } from 'iconoir-react';
import type { Asset } from '@/types';
import { TokenIcon } from '@/components/TokenIcon';

interface AssetRowProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(4)}`;
}

export function AssetRow({ asset, onSelect }: AssetRowProps) {
  const isPositive = asset.change24h >= 0;

  return (
    <button
      onClick={() => onSelect(asset)}
      className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
      style={{ backgroundColor: '#1c1c24', marginBottom: '10px', padding: '16px' }}
    >
      <div className="flex items-center gap-3">
        <TokenIcon src={asset.iconUrl} alt={asset.symbol} />
        <div className="text-left">
          <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{asset.symbol}</div>
          <div className="text-xs" style={{ color: '#9898aa' }}>{asset.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
          {formatPrice(asset.price)}
        </div>
        <div className="flex items-center justify-end gap-0.5 text-xs font-semibold" style={{ color: isPositive ? '#34c759' : '#ff6b6b' }}>
          {isPositive ? <ArrowUp width={10} height={10} /> : <ArrowDown width={10} height={10} />}
          {Math.abs(asset.change24h).toFixed(1)}%
        </div>
      </div>
    </button>
  );
}
