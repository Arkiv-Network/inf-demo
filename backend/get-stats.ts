import { formatGwei } from "viem";
import { aggregateDataLastHour } from "./src/aggregate";
import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
	getLatestBlockNumber,
	getOldestBlockNumber,
} from "./src/arkiv";
import { getGLMTransfersForBlockRange } from "./src/eth";

//console.info = () => {};
console.debug = () => {};

async function getStats(sinceTimestamp?: number, endTimestamp?: number) {
	console.log("Getting hourly stats...");
	const hourlyStats = await getAggregatedDataSinceTimestamp({
		timestamp: sinceTimestamp ?? 0,
		endTimestamp: endTimestamp ?? Math.floor(Date.now() / 1000),
		aggType: "hourly",
	});
	console.log("Hourly stats found:", hourlyStats.length);
	hourlyStats.forEach((stat) => {
		console.log(stat);
	});

	console.log("Getting daily stats...");
	const dailyStats = await getAggregatedDataSinceTimestamp({
		timestamp: sinceTimestamp ?? 0,
		endTimestamp: endTimestamp ?? Math.floor(Date.now() / 1000),
		aggType: "daily",
	});
	console.log("Daily stats found:", dailyStats.length);
	dailyStats.forEach((stat) => {
		console.log(stat);
	});
}

async function getBlocks(sinceTimestamp?: number, endTimestamp?: number) {
	// Last stored block number
	const lastStoredBlockNumber = await getLatestBlockNumber();
	console.log("Last stored block number:", lastStoredBlockNumber);

	const oldestBlockNumber = await getOldestBlockNumber();
	console.log("Oldest block number:", oldestBlockNumber);

	const blocks = await getBlocksSinceTimestamp(
		sinceTimestamp ?? 0,
		endTimestamp,
	);
	for (const block of blocks) {
		console.log(
			block.transactionCount,
			block.blockNumber,
			new Date(block.timestamp * 1000).toISOString(),
			formatGwei(block.gasPrice),
		);
	}
	console.log(`Total blocks: ${blocks.length}`);
}

async function getGLMTransfers(fromBlock?: bigint, toBlock?: bigint) {
	// Last stored block number
	const lastStoredBlockNumber = toBlock ?? (await getLatestBlockNumber());
	console.log("Last stored block number:", lastStoredBlockNumber);

	const oldestBlockNumber = fromBlock ?? (await getOldestBlockNumber());
	console.log("Oldest block number:", oldestBlockNumber);

	if (lastStoredBlockNumber === 0n) {
		console.log("No blocks stored");
		return;
	}

	const transfers = await getGLMTransfersForBlockRange(
		fromBlock ?? lastStoredBlockNumber - 1000n,
		toBlock ?? lastStoredBlockNumber,
	);

	// Print summary
	transfers.forEach((t) => {
		if (t.transferCount > 0) {
			console.log(
				`Block ${t.blockNumber}: ${t.transferCount} transfers, ` +
					`${t.totalTransferredInGLM} GLM total`,
			);
		}
	});
}

getStats();
getBlocks();
getGLMTransfers();
