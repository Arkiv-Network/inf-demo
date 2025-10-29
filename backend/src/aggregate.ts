import { getBlocksSinceTimestamp, storeAggregatedData } from "./arkiv";
import { aggregatedDataSchema } from "./types";

export async function aggregateDataLastHour() {
	// get current timestamp in seconds
	const currentTimestamp = Math.floor(Date.now() / 1000);
	// get timestamp 1 hour ago
	const oneHourAgo = currentTimestamp - 1 * 60 * 60;
	console.info("One hour ago timestamp:", oneHourAgo);
	// get all blocks from the last hour
	const blocks = await getBlocksSinceTimestamp(oneHourAgo);
	console.info("Blocks found:", blocks.length);
	// aggregate the data
	const aggregatedData = {
		avgTransactionCount: 0,
		avgGasPrice: 0n,
	};
	for (const block of blocks) {
		aggregatedData.avgTransactionCount += block.transactionCount;
		aggregatedData.avgGasPrice += block.gasPrice;
	}
	aggregatedData.avgTransactionCount =
		aggregatedData.avgTransactionCount > 0
			? aggregatedData.avgTransactionCount / blocks.length
			: 0;
	aggregatedData.avgGasPrice =
		aggregatedData.avgGasPrice > 0n
			? aggregatedData.avgGasPrice / BigInt(blocks.length)
			: 0n;

	await storeAggregatedData(aggregatedData, currentTimestamp, "hourly");

	return aggregatedData;
}
