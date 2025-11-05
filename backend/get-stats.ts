import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
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
	const blocks = await getBlocksSinceTimestamp(0);
	for (const block of blocks) {
		// console.log(
		// 	block.transactionCount,
		// 	block.blockNumber,
		// 	new Date(block.timestamp * 1000).toISOString(),
		// );
	}
	console.log(`Total blocks: ${blocks.length}`);
}

getStats();
getBlocks();
