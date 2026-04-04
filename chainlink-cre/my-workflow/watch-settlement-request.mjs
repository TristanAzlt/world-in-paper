import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, http, parseAbiItem } from "viem";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const WORKFLOW_DIR = dirname(SCRIPT_PATH);
const PROJECT_ROOT = dirname(WORKFLOW_DIR);
const WORKFLOW_FOLDER = basename(WORKFLOW_DIR);
const PROJECT_CONFIG_PATH = resolve(PROJECT_ROOT, "project.yaml");
const WORKFLOW_CONFIG_PATH = resolve(WORKFLOW_DIR, "workflow.yaml");
const DEFAULT_TARGET = "staging-settings";
const DEFAULT_TRIGGER_INDEX = 0;
const DEFAULT_POLL_INTERVAL_MS = 4_000;
const DEFAULT_CRE_BINARY = "cre";
const SETTLEMENT_REQUEST_EVENT = parseAbiItem(
  "event SettlementRequest(uint256 indexed tradeId, uint256 indexed gameId, string asset_address, uint8 origin, bool isBuy, uint256 amount)",
);

function printHelp() {
  console.log(`Usage:
  node ./watch-settlement-request.mjs [options]

Options:
  --target <name>              CRE target from workflow.yaml/project.yaml (default: ${DEFAULT_TARGET})
  --rpc-url <url>              Override RPC URL used to watch SettlementRequest logs
  --contract-address <addr>    Override WorldInPaper contract address
  --from-block <number>        Start polling from a specific block number
  --poll-interval-ms <ms>      Polling interval in milliseconds (default: ${DEFAULT_POLL_INTERVAL_MS})
  --trigger-index <index>      CRE trigger index (default: ${DEFAULT_TRIGGER_INDEX})
  --fixed-log-index <index>    Force the EVM log index sent to CRE (useful if you really want 0)
  --cre-bin <path>             CRE binary to execute (default: ${DEFAULT_CRE_BINARY})
  --no-broadcast               Run CRE simulation without --broadcast
  --once                       Exit after the first detected event is processed
  --help                       Show this message

Examples:
  node ./watch-settlement-request.mjs
  node ./watch-settlement-request.mjs --fixed-log-index 0
  node ./watch-settlement-request.mjs --target production-settings --rpc-url https://worldchain-mainnet.g.alchemy.com/public
`);
}

function parseArgs(argv) {
  const options = {
    target: DEFAULT_TARGET,
    triggerIndex: DEFAULT_TRIGGER_INDEX,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    broadcast: true,
    once: false,
    help: false,
    creBin: process.env.CRE_BINARY || DEFAULT_CRE_BINARY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--no-broadcast") {
      options.broadcast = false;
      continue;
    }

    if (arg === "--once") {
      options.once = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
    if (nextValue === undefined) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--target":
        options.target = nextValue;
        break;
      case "--rpc-url":
        options.rpcUrl = nextValue;
        break;
      case "--contract-address":
        options.contractAddress = nextValue;
        break;
      case "--from-block":
        options.fromBlock = BigInt(nextValue);
        break;
      case "--poll-interval-ms":
        options.pollIntervalMs = Number.parseInt(nextValue, 10);
        break;
      case "--trigger-index":
        options.triggerIndex = Number.parseInt(nextValue, 10);
        break;
      case "--fixed-log-index":
        options.fixedLogIndex = Number.parseInt(nextValue, 10);
        break;
      case "--cre-bin":
        options.creBin = nextValue;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }

    index += 1;
  }

  if (!Number.isInteger(options.pollIntervalMs) || options.pollIntervalMs <= 0) {
    throw new Error(`Invalid --poll-interval-ms value: ${options.pollIntervalMs}`);
  }
  if (!Number.isInteger(options.triggerIndex) || options.triggerIndex < 0) {
    throw new Error(`Invalid --trigger-index value: ${options.triggerIndex}`);
  }
  if (
    options.fixedLogIndex !== undefined &&
    (!Number.isInteger(options.fixedLogIndex) || options.fixedLogIndex < 0)
  ) {
    throw new Error(`Invalid --fixed-log-index value: ${options.fixedLogIndex}`);
  }

  return options;
}

function getTopLevelYamlBlock(content, targetName) {
  const lines = content.split(/\r?\n/);
  const block = [];
  let inBlock = false;

  for (const line of lines) {
    const topLevelMatch = /^([A-Za-z0-9_-]+):\s*$/.exec(line.trim()) && !line.startsWith(" ");
    if (topLevelMatch) {
      const [name] = line.trim().split(":");
      if (name === targetName) {
        inBlock = true;
        continue;
      }
      if (inBlock) {
        break;
      }
    }

    if (inBlock) {
      block.push(line);
    }
  }

  if (block.length === 0) {
    throw new Error(`Target "${targetName}" not found`);
  }

  return block;
}

function readYamlScalar(filePath, targetName, key) {
  const content = readFileSync(filePath, "utf8");
  const block = getTopLevelYamlBlock(content, targetName);
  const match = block
    .map((line) => line.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`)))
    .find(Boolean);

  if (!match) {
    throw new Error(`Key "${key}" not found for target "${targetName}" in ${filePath}`);
  }

  return match[1].replace(/^['"]|['"]$/g, "");
}

function resolveTargetConfig(targetName) {
  const configRelativePath = readYamlScalar(WORKFLOW_CONFIG_PATH, targetName, "config-path");
  const rpcUrl = readYamlScalar(PROJECT_CONFIG_PATH, targetName, "url");
  const configPath = resolve(WORKFLOW_DIR, configRelativePath);
  const workflowConfig = JSON.parse(readFileSync(configPath, "utf8"));

  return {
    configPath,
    rpcUrl,
    contractAddress: workflowConfig.contractAddress,
  };
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function logWithTimestamp(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function queueKey(log) {
  return `${log.transactionHash}:${log.logIndex}`;
}

async function runSimulation(options, item) {
  const eventIndex = options.fixedLogIndex ?? Number(item.logIndex);
  const args = [
    "workflow",
    "simulate",
    WORKFLOW_FOLDER,
    "-T",
    options.target,
    "--non-interactive",
    "--trigger-index",
    String(options.triggerIndex),
    "--evm-tx-hash",
    item.transactionHash,
    "--evm-event-index",
    String(eventIndex),
  ];

  if (options.broadcast) {
    args.push("--broadcast");
  }

  logWithTimestamp(
    `Launching CRE simulation for tx=${item.transactionHash} eventIndex=${eventIndex} block=${item.blockNumber}`,
  );

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(options.creBin, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (signal) {
        rejectPromise(new Error(`CRE simulation terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        rejectPromise(new Error(`CRE simulation failed with exit code ${code}`));
        return;
      }
      resolvePromise();
    });
  });

  logWithTimestamp(`CRE simulation finished for tx=${item.transactionHash}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const targetConfig = resolveTargetConfig(options.target);
  const rpcUrl = options.rpcUrl || process.env.CRE_MONITOR_RPC_URL || targetConfig.rpcUrl;
  const contractAddress = options.contractAddress || targetConfig.contractAddress;

  if (!rpcUrl) {
    throw new Error("No RPC URL available. Use --rpc-url or configure project.yaml.");
  }
  if (!contractAddress) {
    throw new Error("No contract address available. Use --contract-address or configure config JSON.");
  }

  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  let nextBlock = options.fromBlock;
  if (nextBlock === undefined) {
    nextBlock = (await client.getBlockNumber()) + 1n;
  }

  const queue = [];
  const seen = new Set();
  let processing = false;
  let shuttingDown = false;

  const processQueue = async () => {
    if (processing) {
      return;
    }

    processing = true;

    while (queue.length > 0) {
      if (shuttingDown) {
        break;
      }

      const item = queue.shift();
      if (!item) {
        continue;
      }

      try {
        await runSimulation(options, item);
      } catch (error) {
        console.error(error);
      }

      if (options.once) {
        shuttingDown = true;
        break;
      }
    }

    processing = false;
  };

  const enqueueLogs = (logs) => {
    for (const log of logs) {
      if (!log.transactionHash || log.logIndex === undefined || log.blockNumber === null) {
        continue;
      }

      const id = queueKey(log);
      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      queue.push({
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        transactionHash: log.transactionHash,
      });
      logWithTimestamp(
        `Detected SettlementRequest tx=${log.transactionHash} logIndex=${log.logIndex} block=${log.blockNumber}`,
      );
    }

    void processQueue();
  };

  process.once("SIGINT", () => {
    shuttingDown = true;
    logWithTimestamp("Stopping watcher after current work finishes (SIGINT received).");
  });
  process.once("SIGTERM", () => {
    shuttingDown = true;
    logWithTimestamp("Stopping watcher after current work finishes (SIGTERM received).");
  });

  logWithTimestamp(`Watching ${contractAddress} for SettlementRequest events`);
  logWithTimestamp(`RPC URL: ${rpcUrl}`);
  logWithTimestamp(`CRE target: ${options.target}`);
  logWithTimestamp(
    options.fixedLogIndex === undefined
      ? "CRE will use each event's real logIndex."
      : `CRE will force evm-event-index=${options.fixedLogIndex}.`,
  );

  while (!shuttingDown) {
    try {
      const latestBlock = await client.getBlockNumber();
      if (latestBlock >= nextBlock) {
        const logs = await client.getLogs({
          address: contractAddress,
          event: SETTLEMENT_REQUEST_EVENT,
          fromBlock: nextBlock,
          toBlock: latestBlock,
        });

        enqueueLogs(logs);
        nextBlock = latestBlock + 1n;
      }
    } catch (error) {
      console.error(error);
    }

    if (shuttingDown) {
      break;
    }

    await sleep(options.pollIntervalMs);
  }

  while (processing) {
    await sleep(250);
  }

  logWithTimestamp("Watcher stopped.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
