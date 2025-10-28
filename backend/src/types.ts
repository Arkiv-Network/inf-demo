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
