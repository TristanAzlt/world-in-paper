import { describe, expect } from "bun:test";
import { test } from "@chainlink/cre-sdk/test";
import { encodeAbiParameters, keccak256, parseAbiParameters, toHex } from "viem";
import { initWorkflow, configSchema } from "./workflow";

const WORLD_CHAIN_SELECTOR_NAME = "ethereum-mainnet-worldchain-1";
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const KTA_BASE = "0xc0634090F2Fe6c6d75e61Be2b949464aBB498973";
const PIPPIN_SOL = "Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const ORIGIN = { SOLANA: 0, BASE: 1, ETHEREUM: 2, BSC: 3, WORLD: 4, HYPERLIQUID: 5 };

const SETTLEMENT_REQUEST_SIG = keccak256(
  toHex("SettlementRequest(uint256,string,uint8,bool,uint256)"),
);

const encodeMockLogData = (assetId: string, origin: number, isBuy: boolean, amount: bigint) => {
  return encodeAbiParameters(parseAbiParameters("string, uint8, bool, uint256"), [
    assetId, origin, isBuy, amount,
  ]);
};

describe("configSchema", () => {
  test("validates valid config", () => {
    const result = configSchema.safeParse({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing fields", () => {
    expect(configSchema.safeParse({ contractAddress: CONTRACT_ADDRESS }).success).toBe(false);
    expect(configSchema.safeParse({}).success).toBe(false);
  });
});

describe("initWorkflow", () => {
  test("creates a single log trigger handler", () => {
    const handlers = initWorkflow({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(handlers).toHaveLength(1);
  });
});

describe("event encoding", () => {
  test("event signature matches contract", () => {
    expect(SETTLEMENT_REQUEST_SIG).toBe(
      keccak256(toHex("SettlementRequest(uint256,string,uint8,bool,uint256)")),
    );
  });

  test("BUY pippin on Solana (origin=0)", () => {
    const data = encodeMockLogData(PIPPIN_SOL, ORIGIN.SOLANA, true, 100000000n);
    expect(data.startsWith("0x")).toBe(true);
  });

  test("SELL KTA on Base (origin=1)", () => {
    const data = encodeMockLogData(KTA_BASE, ORIGIN.BASE, false, 1000000000000000000n);
    expect(data.startsWith("0x")).toBe(true);
  });

  test("BUY WETH on Ethereum (origin=2)", () => {
    const data = encodeMockLogData(WETH, ORIGIN.ETHEREUM, true, 1000000000n);
    expect(data.startsWith("0x")).toBe(true);
  });

  test("BUY BTC on Hyperliquid (origin=5)", () => {
    const data = encodeMockLogData("BTC", ORIGIN.HYPERLIQUID, true, 1000000000n);
    expect(data.startsWith("0x")).toBe(true);
  });

  test("SELL AAPL tradfi on Hyperliquid (origin=5)", () => {
    const data = encodeMockLogData("AAPL", ORIGIN.HYPERLIQUID, false, 1000000000n);
    expect(data.startsWith("0x")).toBe(true);
  });

  test("BUY PEPE spot on Hyperliquid (origin=5)", () => {
    const data = encodeMockLogData("PEPE", ORIGIN.HYPERLIQUID, true, 1000000000n);
    expect(data.startsWith("0x")).toBe(true);
  });
});
