import type { BlockDetail, BlockSummary } from "../types";

const BASE_TIMESTAMP = Date.UTC(2025, 9, 27, 15, 45, 0);

const MINER_ADDRESSES = [
  "0x829bd824b016326a401d083b33d092293333a830",
  "0x00192fb10df37c9fb26829eb2cc623cd1bf599e8",
  "0x48c17b5c5b964b13285632d32c744b3c73d0c6b8",
  "0xf35074bbd0a9aee46f4ea137971feec024ab704e",
  "0x1ca6a5b5cd35616d0df09cf99b1f0adf6b75a82b",
];

const GAS_LIMIT = 30_000_000;

function makeHash(prefix: string, number: number) {
  const hex = number.toString(16).padStart(6, "0");
  const seed = `${prefix}${hex}`;
  return `0x${(seed + "f".repeat(64)).slice(0, 64)}`;
}

function buildBlock(index: number): BlockDetail {
  const blockNumber = 21_000_950 - index;
  const timestamp = new Date(BASE_TIMESTAMP - index * 12_000).toISOString();
  const miner = MINER_ADDRESSES[index % MINER_ADDRESSES.length];
  const gasUsageRatio = 0.56 + (index % 6) * 0.07;
  const gasUsed = Math.round(GAS_LIMIT * Math.min(gasUsageRatio, 0.97));
  const transactionCount = 180 + ((index * 23) % 220);
  const baseFeePerGasGwei = Number((22.4 + (index % 7) * 1.8).toFixed(2));
  const sizeBytes = 1_620_000 + index * 34_250;
  const rewardEth = Number((1.96 + (index % 4) * 0.03).toFixed(3));
  const uncleCount = index % 3 === 0 ? 1 : 0;

  return {
    number: blockNumber,
    hash: makeHash("ab", blockNumber),
    parentHash: makeHash("cd", blockNumber - 1),
    timestamp,
    miner,
    transactionCount,
    gasUsed,
    gasLimit: GAS_LIMIT,
    baseFeePerGasGwei,
    sizeBytes,
    rewardEth,
    uncleCount,
  };
}

export const MOCK_BLOCK_DETAILS: BlockDetail[] = Array.from(
  { length: 12 },
  (_, index) => buildBlock(index)
);

export const MOCK_LATEST_BLOCKS: BlockSummary[] = MOCK_BLOCK_DETAILS;
