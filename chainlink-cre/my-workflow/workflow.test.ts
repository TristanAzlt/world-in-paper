import { describe, expect } from "bun:test";
import { test } from "@chainlink/cre-sdk/test";
import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toHex,
  type Hex,
} from "viem";
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
    assetId,
    origin,
    isBuy,
    amount,
  ]);
};

// ============================================================
// Config validation
// ============================================================

describe("configSchema", () => {
  test("validates valid config", () => {
    const result = configSchema.safeParse({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing contractAddress", () => {
    const result = configSchema.safeParse({
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing chainSelectorName", () => {
    const result = configSchema.safeParse({
      contractAddress: CONTRACT_ADDRESS,
      gasLimit: "500000",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing gasLimit", () => {
    const result = configSchema.safeParse({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty object", () => {
    expect(configSchema.safeParse({}).success).toBe(false);
  });
});

// ============================================================
// Workflow init
// ============================================================

describe("initWorkflow", () => {
  test("creates a single log trigger handler", () => {
    const handlers = initWorkflow({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(handlers).toHaveLength(1);
  });

  test("handler function is defined", () => {
    const handlers = initWorkflow({
      contractAddress: CONTRACT_ADDRESS,
      chainSelectorName: WORLD_CHAIN_SELECTOR_NAME,
      gasLimit: "500000",
    });
    expect(typeof handlers[0].fn).toBe("function");
  });

  test("throws on invalid chain selector", () => {
    expect(() =>
      initWorkflow({
        contractAddress: CONTRACT_ADDRESS,
        chainSelectorName: "invalid-chain",
        gasLimit: "500000",
      }),
    ).toThrow("Network not found");
  });
});

// ============================================================
// Event signature
// ============================================================

describe("event signature", () => {
  test("matches SettlementRequest(uint256,string,uint8,bool,uint256)", () => {
    expect(SETTLEMENT_REQUEST_SIG).toBe(
      keccak256(toHex("SettlementRequest(uint256,string,uint8,bool,uint256)")),
    );
  });

  test("is a valid 32-byte hex hash", () => {
    expect(SETTLEMENT_REQUEST_SIG).toMatch(/^0x[a-f0-9]{64}$/);
  });
});

// ============================================================
// Event encoding + decoding roundtrip
// ============================================================

describe("event encoding roundtrip", () => {
  const cases = [
    {
      name: "BUY BTC on Hyperliquid",
      assetId: "BTC",
      origin: ORIGIN.HYPERLIQUID,
      isBuy: true,
      amount: 1000000000n,
    },
    {
      name: "SELL ETH on Hyperliquid",
      assetId: "ETH",
      origin: ORIGIN.HYPERLIQUID,
      isBuy: false,
      amount: 5000000000000000000n,
    },
    {
      name: "BUY @12 spot on Hyperliquid",
      assetId: "@12",
      origin: ORIGIN.HYPERLIQUID,
      isBuy: true,
      amount: 500000000n,
    },
    {
      name: "SELL xyz:AAPL tradfi",
      assetId: "xyz:AAPL",
      origin: ORIGIN.HYPERLIQUID,
      isBuy: false,
      amount: 100000000n,
    },
    {
      name: "BUY pippin on Solana",
      assetId: PIPPIN_SOL,
      origin: ORIGIN.SOLANA,
      isBuy: true,
      amount: 100000000n,
    },
    {
      name: "SELL KTA on Base",
      assetId: KTA_BASE,
      origin: ORIGIN.BASE,
      isBuy: false,
      amount: 1000000000000000000n,
    },
    {
      name: "BUY WETH on Ethereum",
      assetId: WETH,
      origin: ORIGIN.ETHEREUM,
      isBuy: true,
      amount: 2000000000n,
    },
    {
      name: "SELL token on BSC",
      assetId: "0x0000000000000000000000000000000000000042",
      origin: ORIGIN.BSC,
      isBuy: false,
      amount: 10000000000000000000n,
    },
    {
      name: "BUY token on World",
      assetId: "0x0000000000000000000000000000000000000099",
      origin: ORIGIN.WORLD,
      isBuy: true,
      amount: 50000000n,
    },
  ];

  for (const { name, assetId, origin, isBuy, amount } of cases) {
    test(`${name}: encode → decode preserves all fields`, () => {
      const encoded = encodeMockLogData(assetId, origin, isBuy, amount);

      const [decodedAsset, decodedOrigin, decodedIsBuy, decodedAmount] = decodeAbiParameters(
        parseAbiParameters("string, uint8, bool, uint256"),
        encoded as Hex,
      );

      expect(decodedAsset).toBe(assetId);
      expect(Number(decodedOrigin)).toBe(origin);
      expect(decodedIsBuy).toBe(isBuy);
      expect(decodedAmount).toBe(amount);
    });
  }
});

// ============================================================
// Price scaling (18 decimals)
// ============================================================

describe("price scaling to 18 decimals", () => {
  const scalePrice = (price: number) => BigInt(Math.round(price * 1e18));
  // Allow tiny float drift (< 0.0001% relative error)
  const closeTo = (actual: bigint, expected: bigint) => {
    const diff = actual > expected ? actual - expected : expected - actual;
    expect(diff < expected / 1000000n || diff < 1000n).toBe(true);
  };

  test("BTC ~84000 USD scales without losing value", () => {
    const scaled = scalePrice(83949.5);
    closeTo(scaled, 83949500000000000000000n);
  });

  test("ETH ~2060 USD scales without losing value", () => {
    const scaled = scalePrice(2060.45);
    closeTo(scaled, 2060450000000000000000n);
  });

  test("micro-cap token 0.0000000001 USD does not round to zero", () => {
    const scaled = scalePrice(0.0000000001);
    expect(scaled).toBe(100000000n);
    expect(scaled > 0n).toBe(true);
  });

  test("very small token 0.00001234 USD", () => {
    const scaled = scalePrice(0.00001234);
    expect(scaled).toBe(12340000000000n);
  });

  test("stablecoin ~1 USD", () => {
    const scaled = scalePrice(1.0001);
    closeTo(scaled, 1000100000000000000n);
  });

  test("AAPL ~254 USD", () => {
    const scaled = scalePrice(254.61);
    closeTo(scaled, 254610000000000000000n);
  });
});

// ============================================================
// Report encoding
// ============================================================

describe("report encoding", () => {
  test("encodes (tradeId, price) as two uint256", () => {
    const tradeId = 42n;
    const priceScaled = BigInt(Math.round(2060.45 * 1e18));

    const encoded = encodeAbiParameters(parseAbiParameters("uint256, uint256"), [
      tradeId,
      priceScaled,
    ]);

    const [decodedTradeId, decodedPrice] = decodeAbiParameters(
      parseAbiParameters("uint256, uint256"),
      encoded as Hex,
    );

    expect(decodedTradeId).toBe(42n);
    // Float precision: allow tiny drift
    const diff =
      decodedPrice > 2060450000000000000000n
        ? decodedPrice - 2060450000000000000000n
        : 2060450000000000000000n - decodedPrice;
    expect(diff < 1000000000000n).toBe(true);
  });

  test("handles tradeId = 0", () => {
    const encoded = encodeAbiParameters(parseAbiParameters("uint256, uint256"), [
      0n,
      1000000000000000000n,
    ]);
    const [tradeId, price] = decodeAbiParameters(
      parseAbiParameters("uint256, uint256"),
      encoded as Hex,
    );
    expect(tradeId).toBe(0n);
    expect(price).toBe(1000000000000000000n);
  });

  test("handles very large tradeId", () => {
    const largeId = 999999999n;
    const encoded = encodeAbiParameters(parseAbiParameters("uint256, uint256"), [largeId, 100n]);
    const [tradeId] = decodeAbiParameters(parseAbiParameters("uint256, uint256"), encoded as Hex);
    expect(tradeId).toBe(largeId);
  });
});

// ============================================================
// Origin enum coverage
// ============================================================

describe("origin enum", () => {
  test("all origins have distinct values", () => {
    const values = Object.values(ORIGIN);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  test("origins are sequential from 0", () => {
    expect(ORIGIN.SOLANA).toBe(0);
    expect(ORIGIN.BASE).toBe(1);
    expect(ORIGIN.ETHEREUM).toBe(2);
    expect(ORIGIN.BSC).toBe(3);
    expect(ORIGIN.WORLD).toBe(4);
    expect(ORIGIN.HYPERLIQUID).toBe(5);
  });

  test("all origins encode as valid uint8", () => {
    for (const value of Object.values(ORIGIN)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(256);
    }
  });
});
