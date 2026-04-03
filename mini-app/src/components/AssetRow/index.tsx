import { ListItem } from '@worldcoin/mini-apps-ui-kit-react';
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
    <ListItem
      onClick={() => onSelect(asset)}
      label={asset.symbol}
      description={asset.name}
      startAdornment={
        <img
          src={asset.iconUrl}
          alt={asset.symbol}
          className="h-8 w-8 rounded-full bg-gray-100"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      }
      endAdornment={
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatPrice(asset.price)}
          </div>
          <div className={`flex items-center justify-end gap-0.5 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUp width={10} height={10} /> : <ArrowDown width={10} height={10} />}
            {Math.abs(asset.change24h).toFixed(1)}%
          </div>
        </div>
      }
    />
  );
}
