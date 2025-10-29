import * as z from "zod/v4";

export const BlockDetailSchema = z.object({
  arkivEntityKey: z.string(),
  blockNumber: z.string(),
  blockHash: z.string(),
  parentHash: z.string(),
  timestamp: z.number(),
  miner: z.string(),
  transactionCount: z.number(),
  gasUsed: z.string(),
  gasLimit: z.string(),
  baseFeePerGas: z.string(),
  size: z.string(),
});

export type BlockDetail = z.infer<typeof BlockDetailSchema>;
