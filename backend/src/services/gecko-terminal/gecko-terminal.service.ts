import type { Origin } from '../../types/origin';
import { GECKOTERMINAL_NETWORK_BY_ORIGIN } from '../../types/origin';
import {
    geckoTokenIncludedSchema,
    geckoTrendingPoolsSchema,
    outputAssetSchema,
    type AssetToken,
    type GeckoTokenIncluded
} from './gecko-terminal.schema';

const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2';

export class GeckoTerminalService {
    async getTrendingAssetsByOrigin(origin: Origin): Promise<AssetToken[]> {
        const network = GECKOTERMINAL_NETWORK_BY_ORIGIN[origin];

        if (!network) {
            throw new Error(`Unsupported GeckoTerminal origin: ${origin}`);
        }

        const url = new URL(`${GECKOTERMINAL_BASE_URL}/networks/${network}/trending_pools`);
        url.searchParams.set('include', 'base_token,quote_token,dex');
        url.searchParams.set('include_gt_community_data', 'false');
        url.searchParams.set('page', '1');
        url.searchParams.set('duration', '24h');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`GeckoTerminal HTTP ${response.status}`);
        }

        const payload = geckoTrendingPoolsSchema.parse(await response.json());

        const includedTokens = (payload.included ?? []).filter(
            (item): item is GeckoTokenIncluded => geckoTokenIncludedSchema.safeParse(item).success
        );
        const tokenById = new Map(includedTokens.map((token) => [token.id, token]));

        const deduped = new Map<string, AssetToken>();

        for (const pool of payload.data) {
            const baseTokenId = pool.relationships.base_token.data.id;
            const token = tokenById.get(baseTokenId);

            if (!token) {
                continue;
            }

            const image = token.attributes.image_url;
            const priceRaw = pool.attributes.base_token_price_usd;
            const marketCapRaw = pool.attributes.market_cap_usd;

            if (!image || !priceRaw || !marketCapRaw) {
                continue;
            }

            const price = Number(priceRaw);
            const marketCap = Number(marketCapRaw);

            if (!Number.isFinite(price) || !Number.isFinite(marketCap)) {
                continue;
            }

            const candidate = outputAssetSchema.safeParse({
                origin,
                address: token.attributes.address,
                name: token.attributes.name,
                symbol: token.attributes.symbol,
                image,
                price,
                market_cap: marketCap
            });

            if (!candidate.success) {
                continue;
            }

            const key = candidate.data.address.toLowerCase();
            const existing = deduped.get(key);
            if (!existing || candidate.data.market_cap > existing.market_cap) {
                deduped.set(key, candidate.data);
            }
        }

        return [...deduped.values()];
    }
}

export const geckoTerminalService = new GeckoTerminalService();
