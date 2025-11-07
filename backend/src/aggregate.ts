import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
	storeAggregatedData,
} from "./arkiv";

export async function aggregateDataLastHour(referenceTimestamp?: number) {
	// get current timestamp in seconds
	const _currentTimestamp = referenceTimestamp ?? Math.floor(Date.now() / 1000);
	const currentTimestamp = Math.floor(_currentTimestamp / 3600) * 3600;
	// get timestamp 1 hour ago
	const oneHourAgo = currentTimestamp - 1 * 60 * 60;
	console.info("One hour ago timestamp:", oneHourAgo);

	// get hourly stats from the last hour
	const hourlyStats = await getAggregatedDataSinceTimestamp({
		timestamp: oneHourAgo,
		endTimestamp: referenceTimestamp ? currentTimestamp : undefined,
		aggType: "hourly",
	});
	console.info("Hourly stats found:", hourlyStats.length);

	if (hourlyStats.length > 0) {
		console.info("Hourly stats already exist, returning them");
		return hourlyStats[0];
	}

	// get all blocks from the last hour
	const blocks = await getBlocksSinceTimestamp(oneHourAgo, referenceTimestamp);
	console.info("Blocks found:", blocks.length);
	if (blocks.length < 200) {
		console.info(
			"Less than 200 blocks found, full hour definitely not complete, returning zero aggregated data",
		);
		return {
			totalTransactionCount: 0,
			avgGasPrice: 0n,
		};
	}

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

export async function aggregateDataLastDay(referenceTimestamp?: number) {
	// get current timestamp in seconds
	const currentTimestamp = referenceTimestamp ?? Math.floor(Date.now() / 1000);
	// get timestamp 1 day ago
	const oneDayAgo = currentTimestamp - 1 * 24 * 60 * 60;
	console.info("One day ago timestamp:", oneDayAgo);

	// get daily stats from the last day
	const dailyStats = await getAggregatedDataSinceTimestamp({
		timestamp: oneDayAgo,
		endTimestamp: referenceTimestamp ? currentTimestamp : undefined,
		aggType: "daily",
	});
	console.info("Daily stats found:", dailyStats.length);

	if (dailyStats.length > 0) {
		console.info("Daily stats already exist, returning them");
		return dailyStats[0];
	}

	// get all hourly stats from the last day
	const hourlyStats = await getAggregatedDataSinceTimestamp({
		timestamp: oneDayAgo,
		endTimestamp: referenceTimestamp ? currentTimestamp : undefined,
		aggType: "hourly",
	});
	console.info("Hourly stats found:", hourlyStats.length);

	// aggregate the data
	const dailyAggregatedData = {
		totalTransactionCount: 0,
		avgGasPrice: 0n,
	};

	if (hourlyStats.length < 24) {
		console.info(
			"Hourly stats found less than 24, returning zero daily aggregated data",
		);
		return dailyAggregatedData;
	}
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
