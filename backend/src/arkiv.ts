import {
	createWalletClient as createArkivClient,
	type Entity,
	http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { kaolin, localhost } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { jsonToPayload, stringToPayload } from "@arkiv-network/sdk/utils";
import type { Block, Chain } from "viem";
import { defineChain } from "viem";

const MONTH_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

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
				key: "InfuraDemo_data",
				value: "latestBlockNumber",
			},
		],
	});
}

async function updateLatestBlockNumber(blockNumber: bigint) {
	const latestBlockNumberEntity = await getLatestBlockNumberEntity();
	if (!latestBlockNumberEntity) {
		throw new Error("Latest block number entity not found");
	}
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
				key: "InfuraDemo_data",
				value: "latestBlockNumber",
			},
		],
	});
}
async function getLatestBlockNumberEntity(): Promise<Entity | null> {
	const result = await arkivClient
		.buildQuery()
		.where([
			eq("project", "InfuraDemo"),
			eq("InfuraDemo_data", "latestBlockNumber"),
		])
		.limit(1)
		.withPayload()
		.fetch();
	return result.entities.length > 0 ? result.entities[0] : null;
}

export async function storeBlock(block: Block, gasPrice: bigint) {
	try {
		const receipt = await arkivClient.createEntity({
			payload: jsonToPayload({
				blockNumber: block.number?.toString(),
				blockHash: block.hash,
				parentHash: block.parentHash,
				timestamp: Number(block.timestamp / 1000n), // convert to seconds
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
					value: Number(block.timestamp / 1000n), // convert to seconds
				},
				{
					key: "InfuraDemo_version",
					value: "0.1",
				},
			],
			expiresIn: MONTH_IN_SECONDS,
		});
		console.info("Block stored successfully:", receipt);

		// Store latest block number if it is higher than the latest block number in Arkiv
		const latestBlockNumber = await getLatestBlockNumber();
		if (latestBlockNumber && block.number && block.number > latestBlockNumber) {
			await updateLatestBlockNumber(block.number);
		} else if (!latestBlockNumber && block.number) {
			await storeLatestBlockNumber(block.number);
		}
	} catch (error) {
		console.error("Error in storeBlock:", error);
	}
}

export async function getLatestBlockNumber(): Promise<bigint | null> {
	const result = await getLatestBlockNumberEntity();
	console.debug("result from query - latestBlockNumber", result);
	return result ? BigInt(result.toText()) : null;
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
			.withPayload();
		if (blockNumber) {
			query.where([
				eq("project", "InfuraDemo"),
				eq("InfuraDemo_blockNumber", blockNumber.toString()),
			]);
		} else {
			query.where([eq("project", "InfuraDemo")]);
		}
		const result = await query.fetch();
		console.debug("result from query", result);
		return result.entities ? result.entities[0] : null;
	} catch (error) {
		console.error("Error in getBlock:", error);
		return null;
	}
}
