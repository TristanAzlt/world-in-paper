import { JsonRpcProvider, isAddress, type BigNumberish } from 'ethers';
import { env } from '../../config';
import type { WorldInPaper, WorldInPaperAbi } from '../../types/typechain/WorldInPaperAbi';
import type { WorldInPaper as WorldInPaperObserver, WorldInPaperObserverAbi } from '../../types/typechain/WorldInPaperObserverAbi';
import { WorldInPaperAbi__factory } from '../../types/typechain/factories/WorldInPaperAbi__factory';
import { WorldInPaperObserverAbi__factory } from '../../types/typechain/factories/WorldInPaperObserverAbi__factory';

export class WorldInPaperService {
    private readonly provider: JsonRpcProvider;
    private readonly worldContractAddress: string;
    private readonly worldContract: WorldInPaperAbi;
    private readonly observerContract: WorldInPaperObserverAbi;

    constructor(
        rpcUrl = env.RPC_URL,
        worldContractAddress = env.CONTRACT_ADDRESS,
        observerContractAddress = env.OBSERVER_CONTRACT_ADDRESS
    ) {
        if (!isAddress(worldContractAddress)) {
            throw new Error(`Invalid world contract address: ${worldContractAddress}`);
        }

        if (!isAddress(observerContractAddress)) {
            throw new Error(`Invalid observer contract address: ${observerContractAddress}`);
        }

        this.provider = new JsonRpcProvider(rpcUrl);
        this.worldContractAddress = worldContractAddress;
        this.worldContract = WorldInPaperAbi__factory.connect(worldContractAddress, this.provider);
        this.observerContract = WorldInPaperObserverAbi__factory.connect(observerContractAddress, this.provider);
    }

    async getGame(gameId: BigNumberish): Promise<WorldInPaper.GameViewStructOutput> {
        return this.worldContract.getGame(gameId);
    }

    async getRecentGames(limit: BigNumberish): Promise<WorldInPaper.GameViewStructOutput[]> {
        return this.observerContract.getRecentGames(this.worldContractAddress, limit);
    }

    async getCreatedGames(creator: string, limit: BigNumberish): Promise<WorldInPaper.GameViewStructOutput[]> {
        return this.observerContract.getCreatedGames(this.worldContractAddress, creator, limit);
    }

    async getJoinedGames(player: string, limit: BigNumberish): Promise<WorldInPaper.GameViewStructOutput[]> {
        return this.observerContract.getJoinedGames(this.worldContractAddress, player, limit);
    }

    async hasJoined(gameId: BigNumberish, player: string): Promise<boolean> {
        return this.worldContract.hasJoined(gameId, player);
    }

    async getNextGameId(): Promise<bigint> {
        return this.worldContract.nextGameId();
    }

    async getGamePlayers(gameId: BigNumberish): Promise<string[]> {
        return this.worldContract.getGamePlayers(gameId);
    }

    async getGameTrades(gameId: BigNumberish): Promise<WorldInPaper.TradeStructOutput[]> {
        return this.worldContract.getGameTrades(gameId);
    }

    async getGameTradeCount(gameId: BigNumberish): Promise<bigint> {
        return this.worldContract.getGameTradeCount(gameId);
    }

    async getGameRanking(gameId: BigNumberish): Promise<WorldInPaperObserver.GameRankingEntryViewStructOutput[]> {
        return this.observerContract.getGameRanking(this.worldContractAddress, gameId);
    }

    async getPlayerPortfolio(gameId: BigNumberish, player: string): Promise<WorldInPaperObserver.PlayerPortfolioViewStructOutput> {
        return this.observerContract.getPlayerPortfolio(this.worldContractAddress, gameId, player);
    }

    async getTotalSettlementRequestsCreated(): Promise<bigint> {
        return this.worldContract.getTotalSettlementRequestsCreated();
    }

    async getLatestBlockNumber() {
        return this.provider.getBlockNumber();
    }
}

export const worldInPaperService = new WorldInPaperService();