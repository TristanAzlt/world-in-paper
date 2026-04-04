import { ArrowUp, ArrowDown } from 'iconoir-react';
import type { Asset } from '@/types';

interface AssetRowProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      style={{ backgroundColor: '#f7f7f7', marginBottom: '10px', padding: '16px' }}
    >
      <div className="flex items-center gap-3">
        <img
          src={asset.iconUrl}
          alt={asset.symbol}
          className="h-10 w-10 rounded-full"
          style={{ backgroundColor: '#eee' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-left">
          <div className="text-[15px] font-bold" style={{ color: '#111' }}>{asset.symbol}</div>
          <div className="text-xs" style={{ color: '#aaa' }}>{asset.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-bold" style={{ color: '#111' }}>
          {formatPrice(asset.price)}
        </div>
        <div className="flex items-center justify-end gap-0.5 text-xs font-semibold" style={{ color: isPositive ? '#16a34a' : '#ef4444' }}>
          {isPositive ? <ArrowUp width={10} height={10} /> : <ArrowDown width={10} height={10} />}
          {Math.abs(asset.change24h).toFixed(1)}%
        </div>
      </div>
    </button>
  );
}
