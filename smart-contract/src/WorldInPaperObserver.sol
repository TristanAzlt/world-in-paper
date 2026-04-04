// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {WorldInPaper} from "./WorldInPaper.sol";

contract WorldInPaperObserver {
    function getRecentGames(
        WorldInPaper world,
        uint256 limit
    ) external view returns (WorldInPaper.GameView[] memory games) {
        return _collectGamesByMode(world, address(0), limit, 0);
    }

    function getCreatedGames(
        WorldInPaper world,
        address creator,
        uint256 limit
    ) external view returns (WorldInPaper.GameView[] memory games) {
        return _collectGamesByMode(world, creator, limit, 1);
    }

    function getJoinedGames(
        WorldInPaper world,
        address player,
        uint256 limit
    ) external view returns (WorldInPaper.GameView[] memory games) {
        return _collectGamesByMode(world, player, limit, 2);
    }

    function getGameRanking(
        WorldInPaper world,
        uint256 gameId
    )
        external
        view
        returns (WorldInPaper.GameRankingEntryView[] memory ranking)
    {
        address[] memory sortedPlayers = _getSortedPlayers(world, gameId);
        uint256 playersLength = sortedPlayers.length;

        ranking = new WorldInPaper.GameRankingEntryView[](playersLength);
        for (uint256 i = 0; i < playersLength; ) {
            address player = sortedPlayers[i];
            ranking[i] = WorldInPaper.GameRankingEntryView({
                player: player,
                place: i + 1,
                wipBalance: world.getPlayerWipBalance(gameId, player)
            });

            unchecked {
                ++i;
            }
        }
    }

    function getPlayerPortfolio(
        WorldInPaper world,
        uint256 gameId,
        address player
    )
        external
        view
        returns (WorldInPaper.PlayerPortfolioView memory portfolio)
    {
        world.getGame(gameId);
        if (!world.hasJoined(gameId, player)) {
            revert WorldInPaper.NotGamePlayer(gameId, player);
        }

        portfolio.gameId = gameId;
        portfolio.player = player;
        portfolio.wipBalance = world.getPlayerWipBalance(gameId, player);
        portfolio.claimed = world.hasClaimed(gameId, player);
        portfolio.claimableAmount = _getClaimableAmount(world, gameId, player);
        portfolio.tokens = _getPortfolioTokens(world, gameId, player);
    }

    function _collectGamesByMode(
        WorldInPaper world,
        address user,
        uint256 limit,
        uint8 mode
    ) internal view returns (WorldInPaper.GameView[] memory games) {
        if (limit == 0) {
            return new WorldInPaper.GameView[](0);
        }

        uint256 nextGameId = world.nextGameId();
        if (nextGameId <= 1) {
            return new WorldInPaper.GameView[](0);
        }

        uint256 maxGameId;
        unchecked {
            maxGameId = nextGameId - 1;
        }

        if (limit > maxGameId) {
            limit = maxGameId;
        }

        WorldInPaper.GameView[] memory temp = new WorldInPaper.GameView[](
            limit
        );
        uint256 count;

        for (uint256 gameId = maxGameId; gameId >= 1 && count < limit; ) {
            WorldInPaper.GameView memory game = world.getGame(gameId);

            bool include;
            if (mode == 0) {
                include = game.exists;
            } else if (mode == 1) {
                include = game.exists && game.creator == user;
            } else {
                include = game.exists && world.hasJoined(gameId, user);
            }

            if (include) {
                temp[count] = game;
                unchecked {
                    ++count;
                }
            }

            if (gameId == 1) {
                break;
            }

            unchecked {
                --gameId;
            }
        }

        games = new WorldInPaper.GameView[](count);
        for (uint256 i = 0; i < count; ) {
            games[i] = temp[i];
            unchecked {
                ++i;
            }
        }
    }

    function _getClaimableAmount(
        WorldInPaper world,
        uint256 gameId,
        address player
    ) internal view returns (uint256 payout) {
        WorldInPaper.GameView memory game = world.getGame(gameId);
        if (
            block.timestamp < game.endTime || world.hasClaimed(gameId, player)
        ) {
            return 0;
        }

        (, uint256 rank) = _computeClaimPayout(world, gameId, player, game);
        uint256 winnerCount = game.playerCount / 2;
        if (rank < winnerCount) {
            return game.entryAmount * 2;
        }

        if (game.playerCount % 2 == 1 && rank == winnerCount) {
            return game.entryAmount;
        }

        return 0;
    }

    function _computeClaimPayout(
        WorldInPaper world,
        uint256 gameId,
        address player,
        WorldInPaper.GameView memory game
    ) internal view returns (uint256 payout, uint256 rank) {
        rank = _getPlayerRank(world, gameId, player);
        uint256 winnerCount = game.playerCount / 2;

        if (rank < winnerCount) {
            return (game.entryAmount * 2, rank);
        }

        if (game.playerCount % 2 == 1 && rank == winnerCount) {
            return (game.entryAmount, rank);
        }

        return (0, rank);
    }

    function _getPlayerRank(
        WorldInPaper world,
        uint256 gameId,
        address player
    ) internal view returns (uint256 rank) {
        address[] memory sortedPlayers = _getSortedPlayers(world, gameId);

        for (uint256 i = 0; i < sortedPlayers.length; ) {
            if (sortedPlayers[i] == player) {
                return i;
            }

            unchecked {
                ++i;
            }
        }

        revert WorldInPaper.NotGamePlayer(gameId, player);
    }

    function _getSortedPlayers(
        WorldInPaper world,
        uint256 gameId
    ) internal view returns (address[] memory sortedPlayers) {
        sortedPlayers = world.getGamePlayers(gameId);
        uint256 playersLength = sortedPlayers.length;

        for (uint256 i = 0; i < playersLength; ) {
            uint256 bestIdx = i;
            for (uint256 j = i + 1; j < playersLength; ) {
                if (
                    _isHigherRank(
                        world,
                        gameId,
                        sortedPlayers[j],
                        sortedPlayers[bestIdx]
                    )
                ) {
                    bestIdx = j;
                }

                unchecked {
                    ++j;
                }
            }

            if (bestIdx != i) {
                address tmp = sortedPlayers[i];
                sortedPlayers[i] = sortedPlayers[bestIdx];
                sortedPlayers[bestIdx] = tmp;
            }

            unchecked {
                ++i;
            }
        }
    }

    function _isHigherRank(
        WorldInPaper world,
        uint256 gameId,
        address candidate,
        address current
    ) internal view returns (bool) {
        uint256 candidateWip = world.getPlayerWipBalance(gameId, candidate);
        uint256 currentWip = world.getPlayerWipBalance(gameId, current);

        if (candidateWip > currentWip) {
            return true;
        }
        if (candidateWip < currentWip) {
            return false;
        }

        return candidate < current;
    }

    function _getPortfolioTokens(
        WorldInPaper world,
        uint256 gameId,
        address player
    ) internal view returns (WorldInPaper.PortfolioTokenView[] memory tokens) {
        WorldInPaper.Trade[] memory trades = world.getGameTrades(gameId);
        uint256 tradesLength = trades.length;

        bytes32[] memory assetKeys = new bytes32[](tradesLength);
        string[] memory assetAddresses = new string[](tradesLength);
        WorldInPaper.Origin[] memory origins = new WorldInPaper.Origin[](
            tradesLength
        );
        uint256[] memory balances = new uint256[](tradesLength);
        uint256[] memory tradeCounts = new uint256[](tradesLength);
        uint256[] memory tradeAssetIndexes = new uint256[](tradesLength);
        uint256 uniqueAssetsLength;

        for (uint256 i = 0; i < tradesLength; ) {
            WorldInPaper.Trade memory trade = trades[i];
            if (trade.trader == player) {
                bytes32 assetHash = keccak256(
                    abi.encodePacked(trade.asset_address, trade.origin)
                );
                (bool found, uint256 assetIndex) = _findAssetIndex(
                    assetKeys,
                    uniqueAssetsLength,
                    assetHash
                );

                if (!found) {
                    assetKeys[uniqueAssetsLength] = assetHash;
                    assetAddresses[uniqueAssetsLength] = trade.asset_address;
                    origins[uniqueAssetsLength] = trade.origin;
                    assetIndex = uniqueAssetsLength;
                    unchecked {
                        ++uniqueAssetsLength;
                    }
                }

                tradeAssetIndexes[i] = assetIndex + 1;
                if (trade.isBuy) {
                    balances[assetIndex] += trade.amountOut;
                } else if (balances[assetIndex] >= trade.amountIn) {
                    unchecked {
                        balances[assetIndex] -= trade.amountIn;
                    }
                } else {
                    balances[assetIndex] = 0;
                }

                unchecked {
                    ++tradeCounts[assetIndex];
                }
            }

            unchecked {
                ++i;
            }
        }

        tokens = new WorldInPaper.PortfolioTokenView[](uniqueAssetsLength);
        for (uint256 i = 0; i < uniqueAssetsLength; ) {
            tokens[i].asset_address = assetAddresses[i];
            tokens[i].origin = origins[i];
            tokens[i].balance = balances[i];
            tokens[i].trades = new WorldInPaper.Trade[](tradeCounts[i]);

            unchecked {
                ++i;
            }
        }

        uint256[] memory fillIndexes = new uint256[](uniqueAssetsLength);
        for (uint256 i = 0; i < tradesLength; ) {
            uint256 assetIndexPlusOne = tradeAssetIndexes[i];
            if (assetIndexPlusOne != 0) {
                uint256 assetIndex = assetIndexPlusOne - 1;
                uint256 fillIndex = fillIndexes[assetIndex];
                tokens[assetIndex].trades[fillIndex] = trades[i];

                unchecked {
                    fillIndexes[assetIndex] = fillIndex + 1;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    function _findAssetIndex(
        bytes32[] memory assetKeys,
        uint256 length,
        bytes32 assetKey
    ) internal pure returns (bool found, uint256 index) {
        for (uint256 i = 0; i < length; ) {
            if (assetKeys[i] == assetKey) {
                return (true, i);
            }

            unchecked {
                ++i;
            }
        }
    }
}
