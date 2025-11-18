import {
	eq,
	gte,
} from "https://esm.sh/@arkiv-network/sdk@0.3.2-dev.1/query?target=es2022&bundle-deps";
import {
	createPublicClient,
	http,
} from "https://esm.sh/@arkiv-network/sdk@0.3.2-dev.1?target=es2022&bundle-deps";

const ARKIV_CHAIN = {
	id: 60138453045,
	name: "Arkiv EthDemo Testnet",
	nativeCurrency: {
		decimals: 18,
		name: "Ether",
		symbol: "ETH",
	},
	rpcUrls: {
		default: {
			http: ["https://mendoza.hoodi.arkiv.network/rpc"],
			webSocket: ["wss://mendoza.hoodi.arkiv.network/rpc/ws"],
		},
	},
};

const ENTITY_OWNER = "0xF46E23f6a6F6336D4C64D5D1c95599bF77a536f0";
const PROTOCOL_VERSION = "0.8";

const client = createPublicClient({
	transport: http(),
	chain: ARKIV_CHAIN,
});

function normalizeBlockDetail(entity) {
	const payload = entity.toJson();
	if (!payload) {
		return null;
	}

	const blockNumber = payload.EthDemo_blockNumber ?? payload.blockNumber;
	const timestampRaw = payload.EthDemo_blockTimestamp ?? payload.timestamp;
	if (blockNumber === undefined || timestampRaw === undefined) {
		return null;
	}

	const timestamp = Number(timestampRaw);
	if (!Number.isFinite(timestamp)) {
		return null;
	}

	const ensureString = (value) =>
		value === undefined || value === null ? "" : String(value);

	const toNumber = (value, fallback = 0) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	return {
		arkivEntityKey: entity.key,
		blockNumber: String(blockNumber),
		blockHash: ensureString(payload.EthDemo_blockHash ?? payload.blockHash),
		parentHash: ensureString(payload.EthDemo_parentHash ?? payload.parentHash),
		timestamp,
		miner: ensureString(
			payload.EthDemo_miner ?? payload.miner ?? payload.coinbase,
		),
		transactionCount: toNumber(
			payload.EthDemo_transactionCount ?? payload.transactionCount,
		),
		gasPrice: ensureString(payload.EthDemo_gasPrice ?? payload.gasPrice),
		gasUsed: ensureString(payload.EthDemo_gasUsed ?? payload.gasUsed),
		gasLimit: ensureString(payload.EthDemo_gasLimit ?? payload.gasLimit),
		baseFeePerGas: ensureString(
			payload.EthDemo_baseFeePerGas ?? payload.baseFeePerGas,
		),
		size: ensureString(payload.EthDemo_size ?? payload.size),
	};
}

async function fetchLatestBlocks() {
	const response = await client
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			eq("EthDemo_version", PROTOCOL_VERSION),
			eq("EthDemo_dataType", "blockdata"),
		])
		.limit(10)
		.orderBy("EthDemo_blockTimestamp", "number", true)
		.ownedBy(ENTITY_OWNER)
		.withPayload()
		.fetch();

	if (!response || !Array.isArray(response.entities)) {
		throw new Error("Unexpected response shape from Arkiv");
	}

	const blocks = response.entities
		.map(normalizeBlockDetail)
		.filter((block) => block !== null);

	if (!blocks.length) {
		throw new Error("No latest blocks available in Arkiv");
	}

	return blocks;
}

async function fetchBlockDetails(blockNumber) {
	if (!blockNumber) {
		throw new Error("Block number is required");
	}

	const response = await client
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			eq("EthDemo_version", PROTOCOL_VERSION),
			eq("EthDemo_dataType", "blockdata"),
			eq("EthDemo_blockNumber", String(blockNumber)),
		])
		.ownedBy(ENTITY_OWNER)
		.withPayload()
		.fetch();

	const entity = response.entities[0];
	if (!entity) {
		throw new Error(`Block #${blockNumber} was not found in Arkiv`);
	}

	const normalized = normalizeBlockDetail(entity);
	if (!normalized) {
		throw new Error("Received block data could not be parsed");
	}

	return normalized;
}

async function fetchStats(timeframe) {
	if (timeframe !== "daily" && timeframe !== "hourly") {
		throw new Error("Timeframe must be either daily or hourly");
	}

	const timestampWeekAgo = Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60);

	const response = await client
		.buildQuery()
		.where([
			eq("project", "EthDemo"),
			eq("EthDemo_version", PROTOCOL_VERSION),
			eq("EthDemo_dataType", "stats"),
			eq("EthDemo_statsType", timeframe),
			gte("EthDemo_statsTimestamp", timestampWeekAgo),
		])
		.limit(timeframe === "daily" ? 30 : 7 * 24)
		.ownedBy(ENTITY_OWNER)
		.withPayload()
		.withAttributes()
		.fetch();

	if (!response || !Array.isArray(response.entities)) {
		throw new Error("Unexpected response shape from Arkiv");
	}

	const points = [];

	const toNumber = (value, fallback = 0) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	for (const entity of response.entities) {
		try {
			const attributes = Array.isArray(entity.attributes)
				? entity.attributes
				: [];
			const timestampAnnotation = attributes.find(
				(annotation) => annotation.key === "EthDemo_statsTimestamp",
			);
			const timestamp = Number(timestampAnnotation?.value ?? 0);
			if (!Number.isFinite(timestamp)) {
				continue;
			}
			const payload = JSON.parse(entity.toText());
			const avgGasPriceRaw = payload.avgGasPrice ?? payload.averageGasPrice;
			const totalTxRaw =
				payload.totalTransactionCount ?? payload.transactionCount ?? 0;
			const glmCountRaw =
				payload.totalGLMTransfersCount ?? payload.glmTransferCount ?? 0;
			const glmAmountRaw =
				payload.totalGLMTransfersAmount ?? payload.glmTransferVolume ?? 0;

			const avgGasPrice = Number(avgGasPriceRaw);
			const totalTransactionCount = Number(totalTxRaw);

			if (
				!Number.isFinite(avgGasPrice) ||
				!Number.isFinite(totalTransactionCount)
			) {
				continue;
			}

			const totalGLMTransfersCount = toNumber(glmCountRaw);
			const totalGLMTransfersAmount = toNumber(glmAmountRaw);

			points.push({
				arkivEntityKey: entity.key,
				timestamp,
				avgGasPrice,
				totalTransactionCount,
				totalGLMTransfersCount,
				totalGLMTransfersAmount,
			});
		} catch (error) {
			console.error("Failed to parse stats entity", error);
		}
	}

	points.sort((a, b) => a.timestamp - b.timestamp);

	return points;
}

export { fetchLatestBlocks, fetchBlockDetails, fetchStats };
