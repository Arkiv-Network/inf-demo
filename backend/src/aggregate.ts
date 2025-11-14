import {
	getAggregatedDataSinceTimestamp,
	getBlocksSinceTimestamp,
	storeAggregatedData,
} from "./arkiv";
import { getGLMTransfersForBlockRange } from "./eth";
import type { AggregatedDataSchema } from "./types";

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
			totalGLMTransfersCount: 0,
			totalGLMTransfersAmount: 0,
		} as AggregatedDataSchema;
	}

	// aggregate the data
	const aggregatedData = {
		totalTransactionCount: 0,
		avgGasPrice: 0n,
		totalGLMTransfersCount: 0,
		totalGLMTransfersAmount: 0,
	} as AggregatedDataSchema;

	// aggregate block data
	for (const block of blocks) {
		aggregatedData.totalTransactionCount += block.transactionCount;
		aggregatedData.avgGasPrice += block.gasPrice;
	}
	aggregatedData.avgGasPrice =
		aggregatedData.avgGasPrice > 0n
			? aggregatedData.avgGasPrice / BigInt(blocks.length)
			: 0n;

	// aggregate GLM transfers
	const glmTransfers = await getGLMTransfersForBlockRange(
		blocks[blocks.length - 1].blockNumber,
		blocks[0].blockNumber,
	);

	aggregatedData.totalGLMTransfersCount = glmTransfers.reduce(
		(sum, transfer) => sum + transfer.transferCount,
		0,
	);
	aggregatedData.totalGLMTransfersAmount = glmTransfers.reduce(
		(sum, transfer) => sum + transfer.totalTransferredInGLM,
		0,
	);

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
		totalGLMTransfersCount: 0,
		totalGLMTransfersAmount: 0,
	} as AggregatedDataSchema;

	if (hourlyStats.length < 24) {
		console.info(
			"Hourly stats found less than 24, returning zero daily aggregated data",
		);
		return dailyAggregatedData;
	}
	for (const stat of hourlyStats) {
		dailyAggregatedData.totalTransactionCount += stat.totalTransactionCount;
		dailyAggregatedData.avgGasPrice += stat.avgGasPrice;
		dailyAggregatedData.totalGLMTransfersCount += stat.totalGLMTransfersCount;
		dailyAggregatedData.totalGLMTransfersAmount += stat.totalGLMTransfersAmount;
	}
	dailyAggregatedData.avgGasPrice =
		dailyAggregatedData.avgGasPrice > 0n
			? dailyAggregatedData.avgGasPrice / BigInt(hourlyStats.length)
			: 0n;

	await storeAggregatedData(dailyAggregatedData, currentTimestamp, "daily");

	return dailyAggregatedData;
}
