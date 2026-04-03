import {
  bytesToHex,
  ConsensusAggregationByFields,
  cre,
  getNetwork,
  type HTTPSendRequester,
  logTriggerConfig,
  median,
  prepareReportRequest,
  type Runtime,
  TxStatus,
  type EVMLog,
} from "@chainlink/cre-sdk";
import {
  type Hex,
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toHex,
} from "viem";
import { z } from "zod";

// ============================================================
// Config
// ============================================================

export const configSchema = z.object({
  contractAddress: z.string(),
  chainSelectorName: z.string(),
  gasLimit: z.string(),
});

type Config = z.infer<typeof configSchema>;

// ============================================================
// Constants — must match smart contract enum Origin
// ============================================================

const ORIGIN = {
  SOLANA: 0,
  BASE: 1,
  ETHEREUM: 2,
  BSC: 3,
  WORLD: 4,
  HYPERLIQUID: 5,
} as const;

// USDC address per EVM chain (all 6 decimals)
const USDC: Record<number, string> = {
  [ORIGIN.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [ORIGIN.ETHEREUM]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [ORIGIN.BSC]: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  [ORIGIN.WORLD]: "0x79A02482A880bCE3B13e09Da970dC34db4CD24d1",
};

// Uniswap chain IDs
const CHAIN_ID: Record<number, number> = {
  [ORIGIN.BASE]: 8453,
  [ORIGIN.ETHEREUM]: 1,
  [ORIGIN.BSC]: 56,
  [ORIGIN.WORLD]: 480,
};

const USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const DUMMY_SWAPPER = "0x0000000000000000000000000000000000000001";

// SettlementRequest(uint256 indexed tradeId, string assetId, uint8 origin, bool isBuy, uint256 amount)
const SETTLEMENT_REQUEST_SIG = keccak256(toHex("SettlementRequest(uint256,string,uint8,bool,uint256)"));

// ============================================================
// Price Fetchers — all return USD price per 1 token
// ============================================================

interface PriceResult {
  price: number;
}

// --- Hyperliquid ---

const resolveSpotKey = (sendRequester: HTTPSendRequester, symbol: string): string | null => {
  const resp = sendRequester
    .sendRequest({
      method: "POST",
      url: "https://api.hyperliquid.xyz/info",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotMeta" }),
    })
    .result();

  if (resp.statusCode !== 200) return null;

  const meta = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
  const tokens: Array<{ index: number; name: string }> = meta.tokens || [];
  const universe: Array<{
    tokens: number[];
    index: number;
    name: string;
    isCanonical: boolean;
  }> = meta.universe || [];

  const token = tokens.find((t) => t.name.toUpperCase() === symbol.toUpperCase());
  if (!token) return null;

  const pair = universe.find((u) => u.tokens[0] === token.index);
  if (!pair) return null;

  return pair.isCanonical ? pair.name : `@${pair.index}`;
};

/**
 * Hyperliquid — mid price from allMids.
 * Tries crypto perps first, then spot (via spotMeta), then tradfi (dex:xyz).
 */
const fetchHyperliquidPrice = (sendRequester: HTTPSendRequester, symbol: string): PriceResult => {
  const resp = sendRequester
    .sendRequest({
      method: "POST",
      url: "https://api.hyperliquid.xyz/info",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" }),
    })
    .result();

  if (resp.statusCode !== 200) throw new Error(`Hyperliquid HTTP ${resp.statusCode}`);

  const prices = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
  let mid = prices[symbol];

  if (!mid && !symbol.startsWith("@")) {
    const spotKey = resolveSpotKey(sendRequester, symbol);
    if (spotKey) mid = prices[spotKey];
  }

  if (!mid) {
    const xyzResp = sendRequester
      .sendRequest({
        method: "POST",
        url: "https://api.hyperliquid.xyz/info",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "allMids", dex: "xyz" }),
      })
      .result();

    if (xyzResp.statusCode === 200) {
      const xyzPrices = JSON.parse(Buffer.from(xyzResp.body).toString("utf-8"));
      mid = xyzPrices[`xyz:${symbol}`] || xyzPrices[symbol];
    }
  }

  if (!mid) throw new Error(`No price for "${symbol}" on Hyperliquid`);

  return { price: parseFloat(mid) };
};

// --- Uniswap (EVM chains: Base, Ethereum, BSC, World) ---

const fetchUniswapQuote = (
  sendRequester: HTTPSendRequester,
  tokenAddress: string,
  isBuy: boolean,
  amount: string,
  apiKey: string,
  origin: number,
): PriceResult => {
  const chainId = CHAIN_ID[origin];
  const usdc = USDC[origin];
  if (!chainId || !usdc) throw new Error(`Unsupported Uniswap chain for origin ${origin}`);

  const tokenIn = isBuy ? usdc : tokenAddress;
  const tokenOut = isBuy ? tokenAddress : usdc;

  const resp = sendRequester
    .sendRequest({
      method: "POST",
      url: "https://trade-api.gateway.uniswap.org/v1/quote",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        type: "EXACT_INPUT",
        amount,
        tokenIn,
        tokenOut,
        tokenInChainId: chainId,
        tokenOutChainId: chainId,
        swapper: DUMMY_SWAPPER,
      }),
    })
    .result();

  if (resp.statusCode !== 200) {
    throw new Error(`Uniswap API HTTP ${resp.statusCode}`);
  }

  const data = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
  const inAmt = Number(data.quote.input.amount);
  const outAmt = Number(data.quote.output.amount);

  // Get decimals from the route response
  const firstHop = data.quote.route[0][0];
  const inDecimals = Number(firstHop.tokenIn.decimals);
  const lastHop = data.quote.route[0][data.quote.route[0].length - 1];
  const outDecimals = Number(lastHop.tokenOut.decimals);

  if (isBuy) {
    const usdcIn = inAmt / 10 ** inDecimals;
    const tokensOut = outAmt / 10 ** outDecimals;
    return { price: usdcIn / tokensOut };
  } else {
    const tokensIn = inAmt / 10 ** inDecimals;
    const usdcOut = outAmt / 10 ** outDecimals;
    return { price: usdcOut / tokensIn };
  }
};

// --- Jupiter (Solana) ---

const getSolanaTokenDecimals = (sendRequester: HTTPSendRequester, mintAddress: string): number => {
  const resp = sendRequester
    .sendRequest({
      method: "POST",
      url: SOLANA_RPC,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [mintAddress, { encoding: "jsonParsed" }],
      }),
    })
    .result();

  if (resp.statusCode !== 200) throw new Error(`Solana RPC HTTP ${resp.statusCode}`);

  const data = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
  return data.result.value.data.parsed.info.decimals;
};

const fetchJupiterQuote = (
  sendRequester: HTTPSendRequester,
  mintAddress: string,
  isBuy: boolean,
  amount: string,
): PriceResult => {
  const tokenDecimals = getSolanaTokenDecimals(sendRequester, mintAddress);
  const tokenScale = 10 ** tokenDecimals;

  const inputMint = isBuy ? USDC_SOL : mintAddress;
  const outputMint = isBuy ? mintAddress : USDC_SOL;

  const resp = sendRequester
    .sendRequest({
      method: "GET",
      url: `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`,
    })
    .result();

  if (resp.statusCode !== 200) throw new Error(`Jupiter HTTP ${resp.statusCode}`);

  const data = JSON.parse(Buffer.from(resp.body).toString("utf-8"));
  const inAmt = Number(data.inAmount);
  const outAmt = Number(data.outAmount);

  if (isBuy) {
    return { price: (inAmt / 1e6) / (outAmt / tokenScale) };
  } else {
    return { price: (outAmt / 1e6) / (inAmt / tokenScale) };
  }
};

// --- Dispatcher ---

const fetchQuote = (
  sendRequester: HTTPSendRequester,
  assetId: string,
  origin: number,
  isBuy: boolean,
  amount: string,
  uniswapApiKey: string,
): PriceResult => {
  switch (origin) {
    case ORIGIN.SOLANA:
      return fetchJupiterQuote(sendRequester, assetId, isBuy, amount);
    case ORIGIN.BASE:
    case ORIGIN.ETHEREUM:
    case ORIGIN.BSC:
    case ORIGIN.WORLD:
      return fetchUniswapQuote(sendRequester, assetId, isBuy, amount, uniswapApiKey, origin);
    case ORIGIN.HYPERLIQUID:
      return fetchHyperliquidPrice(sendRequester, assetId);
    default:
      throw new Error(`Unknown origin: ${origin}`);
  }
};

// ============================================================
// Workflow Handler
// ============================================================

const onSettlementRequest = (runtime: Runtime<Config>, log: EVMLog) => {
  const config = runtime.config;

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: false,
  });
  if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`);

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Read Uniswap API key from secrets
  const uniswapApiKey = runtime.getSecret({ id: "UNISWAP_API_KEY" }).result().value;

  // --- Decode event ---
  const tradeId = BigInt(bytesToHex(log.topics[1]) as Hex);

  const [assetId, origin, isBuy, amount] = decodeAbiParameters(
    parseAbiParameters("string assetId, uint8 origin, bool isBuy, uint256 amount"),
    bytesToHex(log.data) as Hex,
  );

  runtime.log(`SettlementRequest: trade=${tradeId} asset=${assetId} origin=${origin} isBuy=${isBuy} amount=${amount}`);

  // --- Fetch quote with DON consensus (median) ---
  const httpClient = new cre.capabilities.HTTPClient();
  const quoteResult = httpClient
    .sendRequest(
      runtime,
      fetchQuote,
      ConsensusAggregationByFields<PriceResult>({
        price: median,
      }),
    )(assetId, Number(origin), isBuy, amount.toString(), uniswapApiKey)
    .result();

  runtime.log(`Price: $${quoteResult.price} per token (${isBuy ? "BUY" : "SELL"})`);

  // --- Encode report: (uint256 tradeId, uint256 price) — USD per token, 8 decimals ---
  const priceScaled = BigInt(Math.round(quoteResult.price * 1e8));

  const reportPayload = encodeAbiParameters(parseAbiParameters("uint256, uint256"), [
    tradeId,
    priceScaled,
  ]);

  const report = runtime.report(prepareReportRequest(reportPayload)).result();

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: config.contractAddress,
      report,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result();

  if (writeResult.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`writeReport failed: ${writeResult.errorMessage || writeResult.txStatus}`);
  }

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  runtime.log(`Report written: ${txHash}`);

  return txHash;
};

// ============================================================
// Init
// ============================================================

export function initWorkflow(config: Config) {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: false,
  });
  if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`);

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  return [
    cre.handler(
      evmClient.logTrigger(
        logTriggerConfig({
          addresses: [config.contractAddress as Hex],
          topics: [[SETTLEMENT_REQUEST_SIG]],
          confidence: "LATEST",
        }),
      ),
      onSettlementRequest,
    ),
  ];
}
