import {
    hyperliquidAssetSchema,
    hyperliquidAssetSelectionSchema,
    hyperliquidMetaAndAssetCtxsSchema,
    type HyperliquidAsset,
    type HyperliquidCategory,
    type HyperliquidMetaAndAssetCtxEntry
} from './hyperliquid.schema';
import rawHyperliquidAssets from './hyperliquid-assets.json';

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const hyperliquidAssetSelection = hyperliquidAssetSelectionSchema.parse(rawHyperliquidAssets);

const configuredCategoryByName = new Map<string, HyperliquidCategory>(
    hyperliquidAssetSelection.assets.map((asset) => [asset.name.toLowerCase(), asset.category])
);

type CategorizedAssets = Record<HyperliquidCategory, HyperliquidAsset[]>;

export class HyperliquidService {
    async getMidPrice(symbol: string): Promise<number> {
        const isTradfi = symbol.startsWith('xyz:');
        const body = isTradfi
            ? { type: 'allMids', dex: 'xyz' }
            : { type: 'allMids' };

        const response = await fetch(HYPERLIQUID_INFO_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Hyperliquid HTTP ${response.status}`);
        }

        const prices = await response.json() as Record<string, string>;
        const mid = prices[symbol] ?? prices[`xyz:${symbol}`];

        if (!mid) {
            throw new Error(`No price for "${symbol}" on Hyperliquid`);
        }

        const price = Number(mid);
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Invalid price for "${symbol}" on Hyperliquid`);
        }

        return price;
    }

    async getCategorizedAssets(): Promise<CategorizedAssets> {
        const [hyperliquidAssets, xyzAssets] = await Promise.all([
            this.getHyperliquidAssets(),
            this.getXYZAssets()
        ]);

        return this.mergeCategorizedAssets(hyperliquidAssets, xyzAssets);
    }

    private async getHyperliquidAssets(): Promise<CategorizedAssets> {
        return this.getCategorizedAssetsFromApi({ type: 'metaAndAssetCtxs' });
    }

    private async getXYZAssets(): Promise<CategorizedAssets> {
        return this.getCategorizedAssetsFromApi({ type: 'metaAndAssetCtxs', dex: 'xyz' });
    }

    private async getCategorizedAssetsFromApi(payload: { type: 'metaAndAssetCtxs'; dex?: string }): Promise<CategorizedAssets> {
        const response = await fetch(HYPERLIQUID_INFO_URL, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Hyperliquid HTTP ${response.status}`);
        }

        const parsed = hyperliquidMetaAndAssetCtxsSchema.parse(await response.json());
        const entries: HyperliquidMetaAndAssetCtxEntry[] = Array.isArray(parsed[0])
            ? (parsed as HyperliquidMetaAndAssetCtxEntry[])
            : [parsed as HyperliquidMetaAndAssetCtxEntry];

        const byAddress = new Map<string, HyperliquidAsset>();

        for (const [meta, contexts] of entries) {
            for (let i = 0; i < meta.universe.length; i += 1) {
                const market = meta.universe[i];
                const context = contexts[i];

                if (!market || !context || market.isDelisted) {
                    continue;
                }

                const price = Number(context.markPx);
                const openInterest = Number(context.openInterest);
                const marketCap = price * openInterest;

                if (!Number.isFinite(price) || !Number.isFinite(openInterest) || !Number.isFinite(marketCap) || price <= 0 || marketCap <= 0) {
                    continue;
                }

                const symbol = this.extractSymbol(market.name);
                const category = this.resolveConfiguredCategory(market.name);

                if (!category) {
                    continue;
                }

                const candidate = hyperliquidAssetSchema.safeParse({
                    origin: 'hyperliquid',
                    category,
                    // Keep IDs compatible with allMids keys used by the workflow.
                    // Examples: BTC, ETH, xyz:TSLA, @12.
                    address: market.name,
                    name: market.name,
                    symbol,
                    image: `https://app.hyperliquid.xyz/coins/${symbol}.svg`,
                    price,
                    market_cap: marketCap
                });

                if (!candidate.success) {
                    continue;
                }

                const key = candidate.data.address;
                const existing = byAddress.get(key);

                if (!existing || candidate.data.market_cap > existing.market_cap) {
                    byAddress.set(key, candidate.data);
                }
            }
        }

        const grouped = this.createEmptyCategorizedAssets();

        for (const asset of byAddress.values()) {
            grouped[asset.category].push(asset);
        }

        return grouped;
    }

    private mergeCategorizedAssets(...sources: CategorizedAssets[]): CategorizedAssets {
        const merged = this.createEmptyCategorizedAssets();
        const byAddress = new Map<string, HyperliquidAsset>();

        for (const source of sources) {
            for (const category of Object.keys(source) as HyperliquidCategory[]) {
                for (const asset of source[category]) {
                    const existing = byAddress.get(asset.address);
                    if (!existing || asset.market_cap > existing.market_cap) {
                        byAddress.set(asset.address, asset);
                    }
                }
            }
        }

        for (const asset of byAddress.values()) {
            merged[asset.category].push(asset);
        }

        return merged;
    }

    private createEmptyCategorizedAssets(): CategorizedAssets {
        return {
            crypto: [],
            stocks: [],
            indices: [],
            commodities: []
        };
    }

    private extractSymbol(name: string): string {
        const [, symbol] = name.split(':');
        return symbol ?? name;
    }

    private resolveConfiguredCategory(name: string): HyperliquidCategory | null {
        return configuredCategoryByName.get(name.toLowerCase()) ?? null;
    }
}

export const hyperliquidService = new HyperliquidService();
