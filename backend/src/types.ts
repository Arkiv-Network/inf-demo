import type { Block as ViemBlock } from "viem";
import * as z from "zod";

export const blockSchema = z.object({
	blockNumber: z.string().transform((val) => BigInt(val)),
	blockHash: z.string(),
	parentHash: z.string(),
	timestamp: z.number(),
	transactionCount: z.number(),
	gasPrice: z.string().transform((val) => BigInt(val)),
	gasUsed: z.string().transform((val) => BigInt(val)),
	gasLimit: z.string().transform((val) => BigInt(val)),
	baseFeePerGas: z.string().transform((val) => BigInt(val)),
	miner: z.string(),
	size: z.string().transform((val) => BigInt(val)),
});

export type BlockSchema = z.infer<typeof blockSchema>;

export const aggregatedDataSchema = z.object({
	totalTransactionCount: z.number(),
	avgGasPrice: z.string().transform((val) => BigInt(val)),
	totalGLMTransfersCount: z.number(),
	totalGLMTransfersAmount: z.number(),
});

export type AggregatedDataSchema = z.infer<typeof aggregatedDataSchema>;

export type DataType = "stats" | "blockdata" | "blocknumber";

export type BlockWithGasPrice = ViemBlock & {
	gasPrice: bigint;
};
