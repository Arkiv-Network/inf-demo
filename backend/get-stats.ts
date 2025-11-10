import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
	getLatestBlockNumber,
	getOldestBlockNumber,
} from "./src/arkiv";

//console.info = () => {};
console.debug = () => {};

async function getStats() {
	const stats = await getAggregatedDataSinceTimestamp({
		timestamp: 0,
		endTimestamp: Math.floor(Date.now() / 1000),
		aggType: "hourly",
	});
	console.log(stats);
}

async function getBlocks() {
	// Last stored block number
	const lastStoredBlockNumber = await getLatestBlockNumber();
	console.log("Last stored block number:", lastStoredBlockNumber);

	const oldestBlockNumber = await getOldestBlockNumber();
	console.log("Oldest block number:", oldestBlockNumber);

	const blocks = await getBlocksSinceTimestamp(0);
	// for (const block of blocks) {
	// console.log(
	// 	blocks[0].transactionCount,
	// 	block.blockNumber,
	// 	new Date(block.timestamp * 1000).toISOString(),
	// );
	// }
	console.log(`Total blocks: ${blocks.length}`);
}

getStats();
getBlocks();
