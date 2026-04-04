import { Router } from 'express';
import { z } from 'zod';
import { WorldInPaperService } from '../services/world-in-paper/world-in-paper.service';
import { verifyZod } from '../utils/verify-zod';

const paginationQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).default(20)
});

const userGamesQuerySchema = z.object({
    user: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
    limit: z.coerce.number().int().positive().max(100).default(20)
});

const gameRankingQuerySchema = z.object({
    gameId: z.coerce.number().int().positive()
});

const gamePortfolioQuerySchema = z.object({
    gameId: z.coerce.number().int().positive(),
    user: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address')
});

type GameViewOutput = {
    id: string;
    name: string;
    entryAmount: string;
    startingWIPBalance: string;
    startTime: string;
    endTime: string;
    maxPlayers: number;
    playerCount: number;
    creator: string;
    exists: boolean;
};

export class GamesRoute {
    public router: Router = Router();

    constructor(private readonly worldInPaperService: WorldInPaperService) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/recent', this.getRecentGames);
        this.router.get('/created', this.getCreatedGames);
        this.router.get('/joined', this.getJoinedGames);
        this.router.get('/ranking', this.getGameRanking);
        this.router.get('/portfolio', this.getPlayerPortfolio);
    }

    private getRecentGames = async (req: any, res: any) => {
        const validated = verifyZod(paginationQuerySchema, req.query);
        if (!validated.success) {
            return res.status(400).json({ error: 'Invalid query', details: validated.errors });
        }

        try {
            const games = await this.worldInPaperService.getRecentGames(validated.data.limit);
            const payloadGames = games.map((game) => this.formatGame(game));
            return res.status(200).json({ games: payloadGames });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch recent games',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    private getCreatedGames = async (req: any, res: any) => {
        const validated = verifyZod(userGamesQuerySchema, req.query);
        if (!validated.success) {
            return res.status(400).json({ error: 'Invalid query', details: validated.errors });
        }

        try {
            const games = await this.worldInPaperService.getCreatedGames(validated.data.user, validated.data.limit);
            const payloadGames = games.map((game) => this.formatGame(game));
            return res.status(200).json({ user: validated.data.user, games: payloadGames });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch created games',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    private getJoinedGames = async (req: any, res: any) => {
        const validated = verifyZod(userGamesQuerySchema, req.query);
        if (!validated.success) {
            return res.status(400).json({ error: 'Invalid query', details: validated.errors });
        }

        try {
            const games = await this.worldInPaperService.getJoinedGames(validated.data.user, validated.data.limit);
            const payloadGames = games.map((game) => this.formatGame(game));
            return res.status(200).json({ user: validated.data.user, games: payloadGames });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch joined games',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    private getGameRanking = async (req: any, res: any) => {
        const validated = verifyZod(gameRankingQuerySchema, req.query);
        if (!validated.success) {
            return res.status(400).json({ error: 'Invalid query', details: validated.errors });
        }

        try {
            const ranking = await this.worldInPaperService.getGameRanking(validated.data.gameId);
            return res.status(200).json({
                gameId: String(validated.data.gameId),
                ranking: ranking.map((entry) => ({
                    player: entry.player,
                    place: entry.place.toString(),
                    wipBalance: entry.wipBalance.toString()
                }))
            });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch ranking',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    private getPlayerPortfolio = async (req: any, res: any) => {
        const validated = verifyZod(gamePortfolioQuerySchema, req.query);
        if (!validated.success) {
            return res.status(400).json({ error: 'Invalid query', details: validated.errors });
        }

        try {
            const portfolio = await this.worldInPaperService.getPlayerPortfolio(validated.data.gameId, validated.data.user);

            return res.status(200).json({
                gameId: portfolio.gameId.toString(),
                player: portfolio.player,
                wipBalance: portfolio.wipBalance.toString(),
                claimed: portfolio.claimed,
                claimableAmount: portfolio.claimableAmount.toString(),
                tokens: portfolio.tokens.map((token) => ({
                    asset_address: token.asset_address,
                    origin: token.origin.toString(),
                    balance: token.balance.toString(),
                    trades: token.trades.map((trade) => ({
                        id: trade.id.toString(),
                        trader: trade.trader,
                        asset_address: trade.asset_address,
                        origin: trade.origin.toString(),
                        isBuy: trade.isBuy,
                        amountIn: trade.amountIn.toString(),
                        amountOut: trade.amountOut.toString()
                    }))
                }))
            });
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch portfolio',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    private formatGame(game: any): GameViewOutput {
        return {
            id: game.id.toString(),
            name: game.name,
            entryAmount: game.entryAmount.toString(),
            startingWIPBalance: game.startingWIPBalance.toString(),
            startTime: game.startTime.toString(),
            endTime: game.endTime.toString(),
            maxPlayers: Number(game.maxPlayers),
            playerCount: Number(game.playerCount),
            creator: game.creator,
            exists: Boolean(game.exists)
        };
    }
}
