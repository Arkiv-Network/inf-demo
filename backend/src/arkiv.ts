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
const DATA_VERSION = "0.2";

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
				key: "InfuraDemo_data",
				value: "latestBlockNumber",
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
			eq("InfuraDemo_data", "latestBlockNumber"),
			eq("InfuraDemo_version", DATA_VERSION),
		])
		.limit(1)
		.withPayload()
		.fetch();
	return result.entities.length > 0 ? result.entities[0] : null;
}

export async function storeBlocks(blocks: Block[], gasPrice: bigint) {
	try {
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

		// Store latest block number if it is higher than the latest block number in Arkiv
		const latestBlockNumber = await getLatestBlockNumber();
		if (latestBlockNumber && latestEthBlockNumber > latestBlockNumber) {
			await updateLatestBlockNumber(latestEthBlockNumber);
		} else if (!latestBlockNumber && latestEthBlockNumber) {
			await storeLatestBlockNumber(latestEthBlockNumber);
		}
	} catch (error) {
		console.error("Error in storeBlock:", error);
	}
}

export async function getLatestBlockNumber(): Promise<bigint> {
	const result = await getLatestBlockNumberEntity();
	console.debug("result from query - latestBlockNumber", result);
	return result ? BigInt(result.toText()) : 0n;
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
				eq("InfuraDemo_version", DATA_VERSION),
			]);
		} else {
			query.where([
				eq("project", "InfuraDemo"),
				eq("InfuraDemo_version", DATA_VERSION),
			]);
		}
		const result = await query.fetch();
		console.debug("result from query", result);
		return result.entities ? result.entities[0] : null;
	} catch (error) {
		console.error("Error in getBlock:", error);
		return null;
	}
}
