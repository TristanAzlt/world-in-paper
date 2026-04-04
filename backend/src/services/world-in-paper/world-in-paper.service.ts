import { JsonRpcProvider, isAddress, type BigNumberish } from 'ethers';
import { env } from '../../config';
import type { WorldInPaper, WorldInPaperAbi } from '../../types/typechain/WorldInPaperAbi';
import { WorldInPaperAbi__factory } from '../../types/typechain/factories/WorldInPaperAbi__factory';

export class WorldInPaperService {
    private readonly provider: JsonRpcProvider;
    private readonly contract: WorldInPaperAbi;

    constructor(rpcUrl = env.RPC_URL, contractAddress = env.CONTRACT_ADDRESS) {
        if (!isAddress(contractAddress)) {
            throw new Error(`Invalid contract address: ${contractAddress}`);
        }

        this.provider = new JsonRpcProvider(rpcUrl);
        this.contract = WorldInPaperAbi__factory.connect(contractAddress, this.provider);
    }

    async getGame(gameId: BigNumberish): Promise<WorldInPaper.GameViewStructOutput> {
        return this.contract.getGame(gameId);
    }

    async getGamePlayers(gameId: BigNumberish): Promise<string[]> {
        return this.contract.getGamePlayers(gameId);
    }

    async getGameTrades(gameId: BigNumberish): Promise<WorldInPaper.TradeStructOutput[]> {
        return this.contract.getGameTrades(gameId);
    }

    async getGameTradeCount(gameId: BigNumberish): Promise<bigint> {
        return this.contract.getGameTradeCount(gameId);
    }

    async getGameRanking(gameId: BigNumberish): Promise<WorldInPaper.GameRankingEntryViewStructOutput[]> {
        return this.contract.getGameRanking(gameId);
    }

    async getPlayerPortfolio(gameId: BigNumberish, player: string): Promise<WorldInPaper.PlayerPortfolioViewStructOutput> {
        return this.contract.getPlayerPortfolio(gameId, player);
    }

    async getTotalSettlementRequestsCreated(): Promise<bigint> {
        return this.contract.getTotalSettlementRequestsCreated();
    }

    async getLatestBlockNumber() {
        return this.provider.getBlockNumber();
    }
}

export const worldInPaperService = new WorldInPaperService();