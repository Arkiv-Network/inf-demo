export type BlockSummary = {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: string;
  miner: string;
  transactionCount: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGasGwei: number;
};

export type BlockDetail = BlockSummary & {
  sizeBytes: number;
  rewardEth: number;
  uncleCount: number;
};
