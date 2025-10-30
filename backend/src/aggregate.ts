import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
	storeAggregatedData,
} from "./arkiv";

export async function aggregateDataLastHour() {
	// get current timestamp in seconds
	const currentTimestamp = Math.floor(Date.now() / 1000);
	// get timestamp 1 hour ago
	const oneHourAgo = currentTimestamp - 1 * 60 * 60;
	console.info("One hour ago timestamp:", oneHourAgo);

	// get hourly stats from the last hour
	const hourlyStats = await getAggregatedDataSinceTimestamp(
		oneHourAgo,
		"hourly",
	);
	console.info("Hourly stats found:", hourlyStats.length);
	if (hourlyStats.length > 0) {
		console.info("Hourly stats already exist, returning them");
		return hourlyStats[0];
	}
	// get all blocks from the last hour
	const blocks = await getBlocksSinceTimestamp(oneHourAgo);
	console.info("Blocks found:", blocks.length);
	// aggregate the data
	const aggregatedData = {
		totalTransactionCount: 0,
		avgGasPrice: 0n,
	};
	for (const block of blocks) {
		aggregatedData.totalTransactionCount += block.transactionCount;
		aggregatedData.avgGasPrice += block.gasPrice;
	}
	aggregatedData.avgGasPrice =
		aggregatedData.avgGasPrice > 0n
			? aggregatedData.avgGasPrice / BigInt(blocks.length)
			: 0n;

	await storeAggregatedData(aggregatedData, currentTimestamp, "hourly");

	return aggregatedData;
}

export async function aggregateDataLastDay() {
	// get current timestamp in seconds
	const currentTimestamp = Math.floor(Date.now() / 1000);
	// get timestamp 1 day ago
	const oneDayAgo = currentTimestamp - 1 * 24 * 60 * 60;
	console.info("One day ago timestamp:", oneDayAgo);

	// get daily stats from the last day
	const dailyStats = await getAggregatedDataSinceTimestamp(oneDayAgo, "daily");
	console.info("Daily stats found:", dailyStats.length);

	if (dailyStats.length > 0) {
		console.info("Daily stats already exist, returning them");
		return dailyStats[0];
	}

	// get all hourly stats from the last day
	const hourlyStats = await getAggregatedDataSinceTimestamp(
		oneDayAgo,
		"hourly",
	);
	console.info("Hourly stats found:", hourlyStats.length);
	// aggregate the data
	const dailyAggregatedData = {
		totalTransactionCount: 0,
		avgGasPrice: 0n,
	};
	for (const stat of hourlyStats) {
		dailyAggregatedData.totalTransactionCount += stat.totalTransactionCount;
		dailyAggregatedData.avgGasPrice += stat.avgGasPrice;
	}
	dailyAggregatedData.avgGasPrice =
		dailyAggregatedData.avgGasPrice > 0n
			? dailyAggregatedData.avgGasPrice / BigInt(hourlyStats.length)
			: 0n;

	await storeAggregatedData(dailyAggregatedData, currentTimestamp, "daily");

	return dailyAggregatedData;
}
