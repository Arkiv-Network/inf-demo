import { Hono } from "hono";
import { cors } from "hono/cors";
import { aggregateDataLastDay, aggregateDataLastHour } from "./aggregate";
import { getLatestBlockNumber, storeBlocks } from "./arkiv";
import { getBlock as getBlockOnEth, getGasPrice } from "./eth";

const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Health check endpoint
app.get("/", (c) => {
	return c.json({
		message: "Infura Demo Backend API",
		version: "1.0.0",
		endpoints: ["/collectData", "/aggregateData"],
	});
});

// collectData endpoint
app.get("/collectData", async (c) => {
	try {
		let latestBlockOnEth = await getBlockOnEth();
		const latestBlockNumberOnArkiv = await getLatestBlockNumber();
		const gasPrice = await getGasPrice();
		console.info(
			"latestBlockOnEth",
			latestBlockOnEth?.number,
			"latestBlockOnArkiv",
			latestBlockNumberOnArkiv,
			"gasPrice",
			gasPrice,
		);

		// Fill missed blocks between latestBlockOnEth and latestBlockOnArkiv
		console.info(
			"Filling missed blocks between latestBlockOnEth and latestBlockOnArkiv",
		);
		let done = latestBlockOnEth.number === latestBlockNumberOnArkiv;
		const blocksToStore = [];
		while (!done) {
			blocksToStore.push(latestBlockOnEth);
			console.info("Block to store added:", latestBlockOnEth.number);
			if (
				!latestBlockNumberOnArkiv ||
				latestBlockOnEth.number - 1n === latestBlockNumberOnArkiv
			) {
				done = true;
			} else {
				latestBlockOnEth = await getBlockOnEth(latestBlockOnEth.parentHash);
				console.info("Get parent block to store next", latestBlockOnEth.number);
			}
		}
		await storeBlocks(blocksToStore, gasPrice);
		console.info(
			"Blocks stored successfully. Amount of blocks stored:",
			blocksToStore.length,
		);

		return c.json({
			success: true,
			message: "Data collected successfully",
		});
	} catch (error) {
		console.error("Error in collectData:", error);
		return c.json(
			{
				error: "Failed to process data collection request",
			},
			500,
		);
	}
});

// aggregateData endpoint
app.get("/aggregateData", async (c) => {
	try {
		const aggregatedData = await aggregateDataLastHour();
		const dailyAggregatedData = await aggregateDataLastDay();
		return c.json({
			success: true,
			data: {
				totalTransactionCount: aggregatedData.totalTransactionCount,
				avgGasPrice: aggregatedData.avgGasPrice.toString(),
				totalTransactionCountDaily: dailyAggregatedData.totalTransactionCount,
				avgGasPriceDaily: dailyAggregatedData.avgGasPrice.toString(),
			},
		});
	} catch (error) {
		console.error("Error in aggregateData:", error);
		return c.json(
			{
				error: "Failed to aggregate data",
			},
			500,
		);
	}
});

// Error handling middleware
app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json(
		{
			error: "Internal server error",
		},
		500,
	);
});

// 404 handler
app.notFound((c) => {
	return c.json(
		{
			error: "Endpoint not found",
		},
		404,
	);
});

const port = process.env.PORT || 3001;

console.log(`🚀 Server starting on port ${port}`);

export default {
	port,
	fetch: app.fetch,
	idleTimeout: 120,
};
