import {
	createWalletClient as createArkivClient,
	type Entity,
	http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { kaolin, localhost } from "@arkiv-network/sdk/chains";
import { eq, gt, lte } from "@arkiv-network/sdk/query";
import { jsonToPayload, stringToPayload } from "@arkiv-network/sdk/utils";
import type { Block, Chain } from "viem";
import { defineChain, hexToString } from "viem";
import {
	type AggregatedDataSchema,
	aggregatedDataSchema,
	type BlockSchema,
	blockSchema,
} from "./types";

const MONTH_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days
const WEEK_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const DATA_VERSION = "0.7";

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

const arkivClient = createArkivClient({
	chain: chains[process.env.ARKIV_CHAIN as keyof typeof chains],
	transport: http(),
	account: privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as `0x${string}`),
});

async function storeLatestBlockNumber(blockNumber: bigint) {
	await arkivClient.createEntity({
		contentType: "application/json",
		expiresIn: MONTH_IN_SECONDS,
		payload: stringToPayload(blockNumber.toString()),
		attributes: [
			{
				key: "project",
				value: "InfDemo",
			},
			{
				key: "InfDemo_dataType",
				value: "blocknumber",
			},
			{
				key: "InfDemo_version",
				value: DATA_VERSION,
			},
		],
	});
}

async function updateLatestBlockNumber(blockNumber: bigint) {
	const latestBlockNumberEntity = await getLatestBlockNumberEntity();
	if (!latestBlockNumberEntity) {
		throw new Error("Latest block number entity not found");
	}
	console.info(
		"Updating latest block number:",
		latestBlockNumberEntity.toText(),
		"to:",
		blockNumber,
	);
	await arkivClient.updateEntity({
		entityKey: latestBlockNumberEntity.key,
		expiresIn: MONTH_IN_SECONDS,
		contentType: "application/json",
		payload: stringToPayload(blockNumber.toString()),
		attributes: [
			{
				key: "project",
				value: "InfDemo",
			},
			{
				key: "InfDemo_dataType",
				value: "blocknumber",
			},
			{
				key: "InfDemo_version",
				value: DATA_VERSION,
			},
		],
	});
}
async function getLatestBlockNumberEntity(): Promise<Entity | null> {
	const result = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfDemo"),
			eq("InfDemo_dataType", "blocknumber"),
			eq("InfDemo_version", DATA_VERSION),
		])
		.limit(1)
		.withPayload()
		.fetch();
	return result.entities.length > 0 ? result.entities[0] : null;
}

export async function storeBlocks(blocks: Block[], gasPrice: bigint) {
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
		const receipt = await arkivClient.mutateEntities({
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
						gasPrice: gasPrice.toString(),
						gasUsed: block.gasUsed.toString(),
						gasLimit: block.gasLimit.toString(),
						baseFeePerGas: block.baseFeePerGas?.toString(),
						miner: block.miner,
						size: block.size.toString(),
					}),
					contentType: "application/json",
					attributes: [
						{
							key: "project",
							value: "InfDemo",
						},
						{
							key: "InfDemo_blockNumber",
							value: block.number?.toString() ?? "",
						},
						{
							key: "InfDemo_blockHash",
							value: block.hash ?? "",
						},
						{
							key: "InfDemo_blockGasPrice",
							value: Number(gasPrice),
						},
						{
							key: "InfDemo_blockTimestamp",
							value: Number(block.timestamp),
						},
						{
							key: "InfDemo_dataType",
							value: "blockdata",
						},
						{
							key: "InfDemo_version",
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

export async function getLatestBlockNumber(): Promise<bigint> {
	const last1day = Math.floor(Date.now() / 1000) - 60 * 60 * 24; // last 24 hours
	console.info(
		"Getting latest block number for last 24 hours, timestamp:",
		new Date(last1day * 1000).toISOString(),
	);
	const blocks = await getBlocksSinceTimestamp(last1day);
	console.info("Blocks found for last 24 hours:", blocks.length);
	// get highest block number
	const highestBlockNumber = blocks.reduce(
		(max, block) => (max > block.blockNumber ? max : block.blockNumber),
		0n,
	);
	return highestBlockNumber;
}

export async function getOldestBlockNumber() {
	const last30days = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30; // last 30 days
	const blocks = await getBlocksSinceTimestamp(last30days);
	console.info("Blocks found:", blocks.length);

	// get lowest block number
	const lowestBlockNumber = blocks.reduce(
		(min, block) => (min < block.blockNumber ? min : block.blockNumber),
		BigInt(Number.MAX_SAFE_INTEGER),
	);
	return blocks.length > 0 ? lowestBlockNumber : 0n;
}

export async function getBlock(blockNumber?: number): Promise<Entity | null> {
	const storeOwnerAddress = privateKeyToAccount(
		process.env.ARKIV_PRIVATE_KEY as `0x${string}`,
	).address;
	console.debug("storeOwnerAddress", storeOwnerAddress);
	try {
		const query = await arkivClient
			.buildQuery()
			.ownedBy(storeOwnerAddress)
			.limit(1)
			.withPayload()
			.where([
				eq("project", "InfDemo"),
				eq("InfDemo_dataType", "blockdata"),
				eq("InfDemo_version", DATA_VERSION),
			]);
		if (blockNumber) {
			query.where([eq("InfDemo_blockNumber", blockNumber.toString())]);
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
	const lastBlockNumber = await arkivClient.getBlockNumber();
	console.warn("Last block number:", lastBlockNumber.toString());
	const limit = 1000;
	const query = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfDemo"),
			gt("InfDemo_blockTimestamp", timestamp),
			eq("InfDemo_dataType", "blockdata"),
			eq("InfDemo_version", DATA_VERSION),
		])
		.withPayload()
		//.validAtBlock(lastBlockNumber - 2n)
		.limit(limit);
	if (endTimestamp) {
		query.where([lte("InfDemo_blockTimestamp", endTimestamp)]);
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
	const receipt = await arkivClient.createEntity({
		expiresIn: aggType === "hourly" ? WEEK_IN_SECONDS : MONTH_IN_SECONDS,
		contentType: "application/json",
		payload: jsonToPayload({
			totalTransactionCount: aggregatedData.totalTransactionCount,
			avgGasPrice: aggregatedData.avgGasPrice.toString(),
		}),
		attributes: [
			{
				key: "project",
				value: "InfDemo",
			},
			{
				key: "InfDemo_dataType",
				value: "stats",
			},
			{
				key: "InfDemo_statsType",
				value: aggType,
			},
			{
				key: "InfDemo_statsTimestamp",
				value: timestamp,
			},
			{
				key: "InfDemo_version",
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
	const query = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfDemo"),
			gt("InfDemo_statsTimestamp", timestamp),
			eq("InfDemo_dataType", "stats"),
			eq("InfDemo_statsType", aggType),
			eq("InfDemo_version", DATA_VERSION),
		])
		.withPayload();

	if (endTimestamp) {
		query.where([lte("InfDemo_statsTimestamp", endTimestamp)]);
	}

	const result = await query.fetch();
	return result.entities.map((entity) =>
		aggregatedDataSchema.parse(entity.toJson()),
	);
}
