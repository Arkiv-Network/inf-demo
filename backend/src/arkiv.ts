import {
	createPublicClient,
	createWalletClient,
	type Entity,
	http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { kaolin, localhost } from "@arkiv-network/sdk/chains";
import { eq, gt, lte } from "@arkiv-network/sdk/query";
import { jsonToPayload } from "@arkiv-network/sdk/utils";
import type { Chain } from "viem";
import { defineChain } from "viem";
import type { BlockWithGasPrice } from "./types";
import {
	type AggregatedDataSchema,
	aggregatedDataSchema,
	type BlockSchema,
	blockSchema,
} from "./types";

const MONTH_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days
const WEEK_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const DATA_VERSION = "0.11";

type AggregatedDataType = "hourly" | "daily";

const chains = {
	kaolin: kaolin,
	localhost: localhost,
	infurademo: defineChain({
		id: 60138453045,
		name: "InfuraDemo",
		network: "infurademo",
		nativeCurrency: {
			name: "Ethereum",
			symbol: "ETH",
			decimals: 18,
		},
		rpcUrls: {
			default: {
				http: ["https://infurademo.hoodi.arkiv.network/rpc"],
			},
		},
	}),
} as Record<string, Chain>;

const arkivWalletClient = createWalletClient({
	chain: chains[process.env.ARKIV_CHAIN as keyof typeof chains],
	transport: http(),
	account: privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as `0x${string}`),
});

const arkivPublicClient = createPublicClient({
	chain: chains[process.env.ARKIV_CHAIN as keyof typeof chains],
	transport: http(),
});

export async function storeBlocks(blocks: BlockWithGasPrice[]) {
	let latestEthBlockNumber = 0n;
	const batchSize = 100;
	// store blocks in batches of 100
	console.info(
		"Storing blocks in batches of:",
		batchSize,
		"blocks to store:",
		blocks.length,
	);
	for (let i = 0; i < blocks.length; i += batchSize) {
		const batch = blocks.slice(i, i + batchSize);
		console.info("Storing batch of:", batch.length, "blocks");
		const receipt = await arkivWalletClient.mutateEntities({
			creates: batch.map((block) => {
				const blockNumber = block.number ?? 0n;
				if (blockNumber > latestEthBlockNumber) {
					latestEthBlockNumber = blockNumber;
				}
				return {
					payload: jsonToPayload({
						blockNumber: blockNumber.toString(),
						blockHash: block.hash,
						parentHash: block.parentHash,
						timestamp: Number(block.timestamp),
						transactionCount: block.transactions.length,
						gasPrice: block.gasPrice.toString(),
						gasUsed: block.gasUsed.toString(),
						gasLimit: block.gasLimit.toString(),
						baseFeePerGas: block.baseFeePerGas?.toString(),
						miner: block.miner,
						size: block.size.toString(),
					}),
					contentType: "application/json" as const,
					attributes: [
						{
							key: "project",
							value: "EthDemo",
						},
						{
							key: "EthDemo_blockNumber",
							value: block.number?.toString() ?? "",
						},
						{
							key: "EthDemo_blockHash",
							value: block.hash ?? "",
						},
						{
							key: "EthDemo_blockGasPrice",
							value: Number(block.gasPrice),
						},
						{
							key: "EthDemo_blockTimestamp",
							value: Number(block.timestamp),
						},
						{
							key: "EthDemo_dataType",
							value: "blockdata",
						},
						{
							key: "EthDemo_version",
							value: DATA_VERSION,
						},
					],
					expiresIn: MONTH_IN_SECONDS,
				};
			}),
		});
		console.info("Blocks stored successfully:", receipt);
	}

	console.info("Latest Ethereum block number:", latestEthBlockNumber);
}

async function getLatestOrOldestBlockNumber(latest: boolean): Promise<bigint> {
	const query = await arkivPublicClient
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			eq("EthDemo_dataType", "blockdata"),
			eq("EthDemo_version", DATA_VERSION),
		])
		.limit(1)
		.withAttributes()
		.orderBy("EthDemo_blockNumber", "string", latest)
		.fetch();
	return query.entities.length > 0
		? BigInt(
				query.entities[0].attributes.find(
					(attribute) => attribute.key === "EthDemo_blockNumber",
				)?.value,
			)
		: 0n;
}
export async function getLatestBlockNumber(): Promise<bigint> {
	return getLatestOrOldestBlockNumber(true);
}

export async function getOldestBlockNumber(): Promise<bigint> {
	return getLatestOrOldestBlockNumber(false);
}

export async function getBlock(blockNumber?: number): Promise<Entity | null> {
	const storeOwnerAddress = privateKeyToAccount(
		process.env.ARKIV_PRIVATE_KEY as `0x${string}`,
	).address;
	console.debug("storeOwnerAddress", storeOwnerAddress);
	try {
		const query = await arkivPublicClient
			.buildQuery()
			.ownedBy(storeOwnerAddress)
			.limit(1)
			.withPayload()
			.where([
				eq("project", "EthDemo"),
				eq("EthDemo_dataType", "blockdata"),
				eq("EthDemo_version", DATA_VERSION),
			]);
		if (blockNumber) {
			query.where([eq("EthDemo_blockNumber", blockNumber.toString())]);
		}
		const result = await query.fetch();
		console.debug("result from query", result);
		return result.entities ? result.entities[0] : null;
	} catch (error) {
		console.error("Error in getBlock:", error);
		return null;
	}
}

export async function getBlocksSinceTimestamp(
	timestamp: number,
	endTimestamp?: number,
): Promise<BlockSchema[]> {
	const lastBlockNumber = await arkivPublicClient.getBlockNumber();
	console.warn("Last block number:", lastBlockNumber.toString());
	const limit = 1000;
	const query = await arkivPublicClient
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			gt("EthDemo_blockTimestamp", timestamp),
			eq("EthDemo_dataType", "blockdata"),
			eq("EthDemo_version", DATA_VERSION),
		])
		.withPayload()
		.limit(limit);
	if (endTimestamp) {
		query.where([lte("EthDemo_blockTimestamp", endTimestamp)]);
	}
	const entities = [];
	const result = await query.fetch();
	entities.push(...result.entities);
	while (result.hasNextPage()) {
		await result.next();
		entities.push(...result.entities);
	}
	console.info("Blocks found:", entities.length);
	return entities.map((entity) => blockSchema.parse(entity.toJson()));
}

export async function storeAggregatedData(
	aggregatedData: AggregatedDataSchema,
	timestamp: number,
	aggType: AggregatedDataType,
) {
	const receipt = await arkivWalletClient.createEntity({
		expiresIn: aggType === "hourly" ? WEEK_IN_SECONDS : MONTH_IN_SECONDS,
		contentType: "application/json",
		payload: jsonToPayload({
			totalTransactionCount: aggregatedData.totalTransactionCount,
			avgGasPrice: aggregatedData.avgGasPrice.toString(),
			totalGLMTransfersCount: aggregatedData.totalGLMTransfersCount,
			totalGLMTransfersAmount: aggregatedData.totalGLMTransfersAmount,
		}),
		attributes: [
			{
				key: "project",
				value: "EthDemo",
			},
			{
				key: "EthDemo_dataType",
				value: "stats",
			},
			{
				key: "EthDemo_statsType",
				value: aggType,
			},
			{
				key: "EthDemo_statsTimestamp",
				value: timestamp,
			},
			{
				key: "EthDemo_version",
				value: DATA_VERSION,
			},
		],
	});
	console.debug("Aggregated data stored successfully:", receipt);

	return receipt;
}

export async function getAggregatedDataSinceTimestamp({
	timestamp,
	endTimestamp,
	aggType,
}: {
	timestamp: number;
	endTimestamp?: number;
	aggType: AggregatedDataType;
}): Promise<AggregatedDataSchema[]> {
	const query = await arkivPublicClient
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			gt("EthDemo_statsTimestamp", timestamp),
			eq("EthDemo_dataType", "stats"),
			eq("EthDemo_statsType", aggType),
			eq("EthDemo_version", DATA_VERSION),
		])
		.withPayload();

	if (endTimestamp) {
		query.where([lte("EthDemo_statsTimestamp", endTimestamp)]);
	}

	const result = await query.fetch();
	return result.entities.map((entity) =>
		aggregatedDataSchema.parse(entity.toJson()),
	);
}
