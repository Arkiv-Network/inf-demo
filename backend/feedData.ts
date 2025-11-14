#!/usr/bin/env bun

/**
 * Feed data into Arkiv either historically or in real time.
 *
 * Usage:
 *   bun feedData.ts --history N    # feed N historical blocks before the oldest stored
 *   bun feedData.ts --realTime     # continuously collect new blocks in real time
 *   bun feedData.ts --stats        # generate stats for hours and days
 */

import { aggregateDataLastDay, aggregateDataLastHour } from "./src/aggregate";
import {
	getLatestBlockNumber,
	getOldestBlockNumber,
	storeBlocks,
} from "./src/arkiv";
import { getBlock as getEthBlock } from "./src/eth";
import type { BlockWithGasPrice } from "./src/types";

console.debug = () => {};

//
// Historical feed
//
async function feedHistory(numBlocks: number) {
	console.log(`🚀 Starting historical feed for last ${numBlocks} blocks\n`);
	let oldestBlockNumber = await getOldestBlockNumber();
	if (oldestBlockNumber === 0n) {
		console.log("No blocks found; getting latest block");
		const latestBlock = await getEthBlock(undefined, undefined, true);
		if (!latestBlock) {
			console.error("Failed to fetch latest block");
			return;
		}
		oldestBlockNumber = latestBlock.number;
	}
	console.log(
		`📦 Oldest stored Ethereum block: ${oldestBlockNumber?.toString()}`,
	);

	try {
		const blocksToStore: BlockWithGasPrice[] = [];
		const storedBlocks: BlockWithGasPrice[] = [];
		const batchSize = 100;
		let currentBlockNumber = oldestBlockNumber ? oldestBlockNumber - 1n : 0n;

		console.log(`\n📥 Fetching ${numBlocks} blocks...`);
		for (let i = 0; i < numBlocks; i++) {
			try {
				const block = await getEthBlock(undefined, currentBlockNumber, true);
				if (!block) throw new Error("Failed to fetch block");
				blocksToStore.push(block);
				console.log(
					`  ✓ Fetched block ${block.number} (${i + 1}/${numBlocks})`,
				);
				currentBlockNumber = currentBlockNumber - 1n;
				if (blocksToStore.length === batchSize) {
					await storeBlocks(blocksToStore);
					storedBlocks.push(...blocksToStore);
					blocksToStore.length = 0;
				}
			} catch (error) {
				console.error(
					`  ✗ Failed to fetch block ${currentBlockNumber}:`,
					error,
				);
				break;
			}
		}

		console.log("\n💾 Storing blocks in Arkiv...");
		if (blocksToStore.length > 0) {
			await storeBlocks(blocksToStore);
			storedBlocks.push(...blocksToStore);
			blocksToStore.length = 0;
		}
		console.log(`✅ Successfully stored ${storedBlocks.length} blocks\n`);
		if (storedBlocks.length === 0) {
			console.log("❌ No blocks stored; skipping aggregation");
			return;
		}

		const sortedBlocks = storedBlocks.sort(
			(a, b) => Number(a.timestamp) - Number(b.timestamp),
		);
		const startTimestamp = Number(sortedBlocks[0].timestamp);
		const endTimestamp = Number(
			sortedBlocks[sortedBlocks.length - 1].timestamp,
		);

		console.warn(
			`⏰ Blocks span from ${new Date(startTimestamp * 1000).toISOString()}`,
		);
		console.warn(`    to ${new Date(endTimestamp * 1000).toISOString()}\n`);

		console.log("\n🎉 Historical feed completed!");
		console.log(`   Total blocks: ${sortedBlocks.length}`);

		await feedStats(startTimestamp, endTimestamp);
	} catch (error) {
		console.error("❌ Error in feedHistory:", error);
		process.exit(1);
	}
}

// Feed stats for hours and days
async function feedStats(startTimestamp: number, endTimestamp: number) {
	console.log("📊 Generating hourly aggregations...");
	const uniqueHours = new Set<number>();
	for (
		let timestamp = startTimestamp;
		timestamp <= endTimestamp;
		timestamp += 3600
	) {
		const hourTimestamp = Math.floor(timestamp / 3600) * 3600;
		uniqueHours.add(hourTimestamp);
	}
	for (const hourTimestamp of Array.from(uniqueHours).sort()) {
		try {
			await aggregateDataLastHour(hourTimestamp + 3600);
			console.warn(
				`  ✓ Aggregated hour ${new Date(hourTimestamp * 1000).toISOString()}`,
			);
		} catch (error) {
			console.error(
				`  ✗ Failed to aggregate hour ${new Date(hourTimestamp * 1000).toISOString()}:`,
				error,
			);
		}
	}

	console.log("\n📅 Generating daily aggregations...");
	const uniqueDays = new Set<number>();
	for (
		let timestamp = startTimestamp;
		timestamp <= endTimestamp;
		timestamp += 86400
	) {
		const dayTimestamp = Math.floor(timestamp / 86400) * 86400;
		uniqueDays.add(dayTimestamp);
	}
	console.log(`  Found ${uniqueDays.size} unique days to aggregate`);
	for (const dayTimestamp of Array.from(uniqueDays).sort()) {
		try {
			await aggregateDataLastDay(dayTimestamp + 86400);
			console.log(
				`  ✓ Aggregated day ${new Date(dayTimestamp * 1000).toISOString()}`,
			);
		} catch (error) {
			console.error(
				`  ✗ Failed to aggregate day ${new Date(
					dayTimestamp * 1000,
				).toISOString()}:`,
				error,
			);
		}
	}

	console.log("\n🎉 Historical feed completed!");
	console.log(`   Hours aggregate attempts: ${uniqueHours.size}`);
	console.log(`   Days aggregate attempts: ${uniqueDays.size}`);
}

//
// Real-time feed (like the /collectData endpoint), with polling
//
async function collectLatestOnce() {
	let latestBlockOnEth = await getEthBlock(undefined, undefined, true);
	if (!latestBlockOnEth) {
		console.error("❌ Unable to fetch latest Ethereum block");
		return { stored: 0 };
	}
	const latestBlockNumberOnArkiv = await getLatestBlockNumber();
	console.info(
		"latestBlockOnEth",
		latestBlockOnEth?.number,
		"latestBlockOnArkiv",
		latestBlockNumberOnArkiv,
	);

	let done = latestBlockOnEth.number === latestBlockNumberOnArkiv;
	const blocksToStore: BlockWithGasPrice[] = [];
	while (!done) {
		blocksToStore.push(latestBlockOnEth);
		console.info("Block to store added:", latestBlockOnEth.number);
		if (
			!latestBlockNumberOnArkiv ||
			latestBlockOnEth.number - 1n === latestBlockNumberOnArkiv
		) {
			done = true;
		} else {
			const parent = await getEthBlock(
				latestBlockOnEth.parentHash,
				undefined,
				true,
			);
			if (!parent) {
				console.error("Failed to fetch parent block; stopping this cycle");
				break;
			}
			latestBlockOnEth = parent;
			console.info("Get parent block to store next", latestBlockOnEth.number);
		}
	}

	if (blocksToStore.length === 0) {
		console.log("✅ Up to date; no new blocks to store");
		return { stored: 0 };
	}

	// Store in batches of 100
	console.log("\n💾 Storing new blocks in Arkiv...");
	for (let i = 0; i < blocksToStore.length; i += 100) {
		const batch = blocksToStore.slice(i, i + 100);
		await storeBlocks(batch);
	}
	console.info(
		"Blocks stored successfully. Amount of blocks stored:",
		blocksToStore.length,
	);

	// Trigger last-hour and last-day aggregations once per cycle
	await aggregateDataLastHour();
	await aggregateDataLastDay();

	return { stored: blocksToStore.length };
}

async function feedRealTime() {
	console.log("🚀 Starting real-time feed (polling). Press Ctrl+C to stop.\n");
	const intervalMs = Number(process.env.POLL_INTERVAL_MS || 1_000);
	let lastCollectionTime = 0;
	while (true) {
		try {
			// check if 12 sec passed since last collection
			if (lastCollectionTime && Date.now() - lastCollectionTime < 12_000) {
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
				continue;
			}
			// measure time taken to collect latest once
			const startTime = Date.now();
			const { stored } = await collectLatestOnce();
			const endTime = Date.now();
			console.log(
				`Time taken to collect latest once: ${endTime - startTime}ms`,
			);

			if (stored > 0) {
				console.log(`✅ Stored ${stored} new blocks`);
			}

			lastCollectionTime = Date.now();
		} catch (error) {
			console.error("❌ Error during real-time collection:", error);
		}
	}
}

//
// CLI argument parsing
//
function printUsageAndExit() {
	console.error(
		"Usage: bun feedData.ts --history N | --realTime | --stats\n  --history N   Feed N historical blocks before the oldest stored\n  --realTime    Continuously collect new blocks\n  --stats       Generate stats for hours and days",
	);
	process.exit(1);
}

const args = process.argv.slice(2);
const hasRealTime = args.includes("--realTime");
const historyIdx = args.indexOf("--history");
const hasStats = args.includes("--stats");

console.log("hasRealTime", hasRealTime);
console.log("historyIdx", historyIdx);
console.log("hasStats", hasStats);
if (!hasRealTime && historyIdx === -1 && !hasStats) {
	console.error("Invalid arguments");
	printUsageAndExit();
}

(async () => {
	if (hasRealTime) {
		await feedRealTime();
		return;
	}

	if (hasStats) {
		// default last week for stats
		const lastWeek = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
		await feedStats(lastWeek, Math.floor(Date.now() / 1000));
		return;
	}

	const nStr = args[historyIdx + 1];
	const N = nStr ? parseInt(nStr, 10) : NaN;
	if (Number.isNaN(N) || N <= 0) {
		console.error(
			"❌ Invalid number of blocks. Please provide a positive integer.",
		);
		process.exit(1);
	}
	await feedHistory(N);
})();
