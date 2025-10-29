import {
	createWalletClient as createArkivClient,
	type Entity,
	http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { kaolin, localhost } from "@arkiv-network/sdk/chains";
import { eq, gt } from "@arkiv-network/sdk/query";
import { jsonToPayload, stringToPayload } from "@arkiv-network/sdk/utils";
import type { Block, Chain } from "viem";
import { defineChain } from "viem";
import type { AggregatedDataSchema, BlockSchema } from "./types";
import { aggregatedDataSchema, blockSchema } from "./types";

const MONTH_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days
const WEEK_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const DATA_VERSION = "0.3";

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
		expiresIn: MONTH_IN_SECONDS,
		payload: stringToPayload(blockNumber.toString()),
		annotations: [
			{
				key: "project",
				value: "InfuraDemo",
			},
			{
				key: "InfuraDemo_dataType",
				value: "blocknumber",
			},
			{
				key: "InfuraDemo_version",
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
		payload: stringToPayload(blockNumber.toString()),
		annotations: [
			{
				key: "project",
				value: "InfuraDemo",
			},
			{
				key: "InfuraDemo_dataType",
				value: "blocknumber",
			},
			{
				key: "InfuraDemo_version",
				value: DATA_VERSION,
			},
		],
	});
}
async function getLatestBlockNumberEntity(): Promise<Entity | null> {
	const result = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfuraDemo"),
			eq("InfuraDemo_dataType", "blocknumber"),
			eq("InfuraDemo_version", DATA_VERSION),
		])
		.limit(1)
		.withPayload()
		.fetch();
	return result.entities.length > 0 ? result.entities[0] : null;
}

export async function storeBlocks(blocks: Block[], gasPrice: bigint) {
	let latestEthBlockNumber = 0n;
	const receipt = await arkivClient.mutateEntities({
		creates: blocks.map((block) => {
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
				annotations: [
					{
						key: "project",
						value: "InfuraDemo",
					},
					{
						key: "InfuraDemo_blockNumber",
						value: block.number?.toString() ?? "",
					},
					{
						key: "InfuraDemo_blockHash",
						value: block.hash ?? "",
					},
					{
						key: "InfuraDemo_blockGasPrice",
						value: Number(gasPrice),
					},
					{
						key: "InfuraDemo_blockTimestamp",
						value: Number(block.timestamp),
					},
					{
						key: "InfuraDemo_dataType",
						value: "blockdata",
					},
					{
						key: "InfuraDemo_version",
						value: DATA_VERSION,
					},
				],
				expiresIn: MONTH_IN_SECONDS,
			};
		}),
	});

	console.info("Blocks stored successfully:", receipt);
	console.info("Latest Ethereum block number:", latestEthBlockNumber);
}

export async function getLatestBlockNumber(): Promise<bigint> {
	const last10Mins = Math.floor(Date.now() / 1000) - 10 * 60; // last 10 mins
	const blocks = await getBlocksSinceTimestamp(last10Mins);
	// get highest block number
	const highestBlockNumber = blocks.reduce(
		(max, block) => (max > block.blockNumber ? max : block.blockNumber),
		0n,
	);
	return highestBlockNumber;
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
				eq("project", "InfuraDemo"),
				eq("InfuraDemo_dataType", "blockdata"),
				eq("InfuraDemo_version", DATA_VERSION),
			]);
		if (blockNumber) {
			query.where([eq("InfuraDemo_blockNumber", blockNumber.toString())]);
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
): Promise<BlockSchema[]> {
	const query = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfuraDemo"),
			gt("InfuraDemo_blockTimestamp", timestamp),
			eq("InfuraDemo_dataType", "blockdata"),
			eq("InfuraDemo_version", DATA_VERSION),
		])
		.withPayload();
	const result = await query.fetch();
	return result.entities.map((entity) => blockSchema.parse(entity.toJson()));
}

export async function storeAggregatedData(
	aggregatedData: AggregatedDataSchema,
	timestamp: number,
	aggType: "hourly" | "daily",
) {
	const receipt = await arkivClient.createEntity({
		expiresIn: aggType === "hourly" ? WEEK_IN_SECONDS : MONTH_IN_SECONDS,
		payload: jsonToPayload({
			avgTransactionCount: aggregatedData.avgTransactionCount,
			avgGasPrice: aggregatedData.avgGasPrice.toString(),
		}),
		annotations: [
			{
				key: "project",
				value: "InfuraDemo",
			},
			{
				key: "InfuraDemo_dataType",
				value: "stats",
			},
			{
				key: "InfuraDemo_statsTimestamp",
				value: timestamp,
			},
			{
				key: "InfuraDemo_version",
				value: DATA_VERSION,
			},
		],
	});
	console.debug("Aggregated data stored successfully:", receipt);

	return receipt;
}
