#!/usr/bin/env bun

/**
 * Clean stats data from Arkiv since a given timestamp or delete a specific entity.
 *
 * Usage:
 *   bun clean.ts --timestamp TIMESTAMP              # Clean all stats (hourly and daily) since timestamp
 *   bun clean.ts --timestamp TIMESTAMP --type hourly # Clean only hourly stats since timestamp
 *   bun clean.ts --timestamp TIMESTAMP --type daily  # Clean only daily stats since timestamp
 *   bun clean.ts --entity-key ENTITY_KEY             # Delete a specific entity by its key
 *
 * Options:
 *   --dry-run                             # Dry run, don't delete anything
 *
 * Timestamp can be provided as:
 *   - Unix timestamp in seconds (e.g., 1704067200)
 *   - ISO 8601 date string (e.g., 2024-01-01T00:00:00Z)
 */

import {
	createPublicClient,
	createWalletClient,
	type Entity,
	http,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { kaolin, localhost } from "@arkiv-network/sdk/chains";
import { eq, gt } from "@arkiv-network/sdk/query";
import type { Chain } from "viem";
import { defineChain } from "viem";
import { DATA_VERSION } from "./src/arkiv";

type AggregatedDataType = "hourly" | "daily";

const chains = {
	kaolin: kaolin,
	localhost: localhost,
	infurademo: defineChain({
		id: 60138453045,
		name: "InfuraDemo",
		network: "infurademo",
		nativeCurrency: {
			name: "Ethereum",
			symbol: "ETH",
			decimals: 18,
		},
		rpcUrls: {
			default: {
				http: ["https://infurademo.hoodi.arkiv.network/rpc"],
			},
		},
	}),
} as Record<string, Chain>;

const arkivWalletClient = createWalletClient({
	chain: chains[process.env.ARKIV_CHAIN as keyof typeof chains],
	transport: http(),
	account: privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as `0x${string}`),
});

const arkivPublicClient = createPublicClient({
	chain: chains[process.env.ARKIV_CHAIN as keyof typeof chains],
	transport: http(),
});

/**
 * Parse timestamp from command line argument
 * Supports Unix timestamp (seconds) or ISO 8601 date string
 */
function parseTimestamp(timestampStr: string): number {
	// Try parsing as Unix timestamp (seconds)
	const unixTimestamp = parseInt(timestampStr, 10);
	if (!Number.isNaN(unixTimestamp) && unixTimestamp > 0) {
		return unixTimestamp;
	}

	// Try parsing as ISO 8601 date string
	const date = new Date(timestampStr);
	if (!Number.isNaN(date.getTime())) {
		return Math.floor(date.getTime() / 1000);
	}

	throw new Error(
		`Invalid timestamp format: ${timestampStr}. Use Unix timestamp (seconds) or ISO 8601 date string.`,
	);
}

/**
 * Query stats entities since the given timestamp
 */
async function getStatsEntitiesSinceTimestamp(
	timestamp: number,
	statsType?: AggregatedDataType,
): Promise<Entity[]> {
	const limit = 1000;
	const whereConditions = [
		eq("project", "EthDemo"),
		gt("EthDemo_statsTimestamp", timestamp),
		eq("EthDemo_dataType", "stats"),
		eq("EthDemo_version", DATA_VERSION),
	];

	if (statsType) {
		whereConditions.push(eq("EthDemo_statsType", statsType));
	}

	const query = await arkivPublicClient
		.buildQuery()
		.where(whereConditions)
		.withAttributes()
		.withPayload()
		.limit(limit);

	const entities: Entity[] = [];
	const result = await query.fetch();
	entities.push(...result.entities);

	while (result.hasNextPage()) {
		await result.next();
		entities.push(...result.entities);
	}

	return entities;
}

/**
 * Delete a single entity by its key
 */
async function deleteEntityByKey(
	entityKey: string,
	dryRun?: boolean,
): Promise<void> {
	const key = entityKey.startsWith("0x")
		? (entityKey as `0x${string}`)
		: (`0x${entityKey}` as `0x${string}`);

	console.log(`\n🗑️  Deleting entity: ${key}`);

	if (dryRun) {
		console.log("   (Dry run - would delete this entity)");
		return;
	}

	try {
		await arkivWalletClient.deleteEntity({ entityKey: key });
		console.log(`\n✅ Successfully deleted entity: ${key}`);
	} catch (error) {
		console.error(`\n❌ Failed to delete entity ${key}:`, error);
		throw error;
	}
}

/**
 * Delete entities in batches
 */
async function deleteEntities(entities: Entity[]): Promise<void> {
	if (entities.length === 0) {
		console.log("No entities to delete.");
		return;
	}

	const batchSize = 100;
	let deletedCount = 0;

	console.log(
		`\n🗑️  Deleting ${entities.length} entities in batches of ${batchSize}...`,
	);

	for (let i = 0; i < entities.length; i += batchSize) {
		const batch = entities.slice(i, i + batchSize);
		const deletes = batch.map((entity) => ({
			entityKey: entity.key as `0x${string}`,
		}));

		try {
			await arkivWalletClient.mutateEntities({
				deletes,
			});
			deletedCount += batch.length;
			console.log(
				`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entities (total: ${deletedCount}/${entities.length})`,
			);
		} catch (error) {
			console.error(
				`  ✗ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`,
				error,
			);
			throw error;
		}
	}

	console.log(`\n✅ Successfully deleted ${deletedCount} entities.`);
}

/**
 * Main cleanup function
 */
async function cleanStats(
	timestamp: number,
	statsType?: AggregatedDataType,
	dryRun?: boolean,
) {
	const timestampDate = new Date(timestamp * 1000);
	console.log(`\n🧹 Cleaning stats data since ${timestampDate.toISOString()}`);
	if (statsType) {
		console.log(`   Stats type: ${statsType}`);
	} else {
		console.log(`   Stats type: all (hourly and daily)`);
	}

	try {
		// Query for stats entities
		console.log("\n📊 Querying stats entities...");
		const entities = await getStatsEntitiesSinceTimestamp(timestamp, statsType);
		console.log(`   Found ${entities.length} entities to delete`);

		if (entities.length === 0) {
			console.log("\n✅ No stats data found to clean.");
			return;
		}

		// Show summary of what will be deleted
		const hourlyCount = entities.filter(
			(e) =>
				e.attributes.find((a) => a.key === "EthDemo_statsType")?.value ===
				"hourly",
		).length;
		const dailyCount = entities.filter(
			(e) =>
				e.attributes.find((a) => a.key === "EthDemo_statsType")?.value ===
				"daily",
		).length;

		if (!statsType) {
			console.log(`   - Hourly stats: ${hourlyCount}`);
			console.log(`   - Daily stats: ${dailyCount}`);
		}

		if (dryRun) {
			// show all entities
			entities.forEach((entity) => {
				console.log(entity.key);
				console.log(entity.toText());
			});
			process.exit(0);
		}
		// Confirm deletion
		console.log("\n⚠️  This will permanently delete the above entities.");
		console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...");
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Delete entities
		await deleteEntities(entities);

		console.log("\n🎉 Cleanup completed successfully!");
	} catch (error) {
		console.error("\n❌ Error during cleanup:", error);
		process.exit(1);
	}
}

//
// CLI argument parsing
//
function printUsageAndExit() {
	console.error(
		"Usage: bun clean.ts [--timestamp TIMESTAMP | --entity-key KEY] [options]\n" +
			"  --timestamp TIMESTAMP   Unix timestamp (seconds) or ISO 8601 date string\n" +
			"  --entity-key KEY        Entity key to delete (0x-prefixed hex string)\n" +
			"  --type TYPE             Optional: 'hourly' or 'daily' (only with --timestamp, default: both)\n" +
			"  --dry-run               Dry run, don't delete anything",
	);
	process.exit(1);
}

const args = process.argv.slice(2);
const timestampIdx = args.indexOf("--timestamp");
const entityKeyIdx = args.indexOf("--entity-key");
const typeIdx = args.indexOf("--type");
const dryRun = args.includes("--dry-run");

// Validate that either timestamp or entity-key is provided, but not both
if (timestampIdx === -1 && entityKeyIdx === -1) {
	console.error("❌ Missing required argument: --timestamp or --entity-key");
	printUsageAndExit();
}

if (timestampIdx !== -1 && entityKeyIdx !== -1) {
	console.error(
		"❌ Cannot use both --timestamp and --entity-key. Use one or the other.",
	);
	printUsageAndExit();
}

// Handle entity-key mode
if (entityKeyIdx !== -1) {
	const entityKey = args[entityKeyIdx + 1];
	if (!entityKey) {
		console.error("❌ Missing entity key value");
		printUsageAndExit();
	}

	if (typeIdx !== -1) {
		console.error(
			"❌ --type option is only valid with --timestamp, not with --entity-key",
		);
		printUsageAndExit();
	}

	(async () => {
		try {
			if (dryRun) {
				console.log("🧹 Dry run, not deleting anything");
			}
			await deleteEntityByKey(entityKey, dryRun);
			console.log("\n🎉 Entity deletion completed successfully!");
		} catch (error) {
			console.error("❌ Error:", error);
			process.exit(1);
		}
	})();
} else {
	// Handle timestamp mode
	const timestampStr = args[timestampIdx + 1];
	if (!timestampStr) {
		console.error("❌ Missing timestamp value");
		printUsageAndExit();
	}

	let statsType: AggregatedDataType | undefined;
	if (typeIdx !== -1) {
		const typeValue = args[typeIdx + 1];
		if (typeValue !== "hourly" && typeValue !== "daily") {
			console.error("❌ Invalid stats type. Must be 'hourly' or 'daily'");
			printUsageAndExit();
		}
		statsType = typeValue as AggregatedDataType;
	}

	(async () => {
		try {
			if (dryRun) {
				console.log("🧹 Dry run, not deleting anything");
			}
			const timestamp = parseTimestamp(timestampStr);
			await cleanStats(timestamp, statsType, dryRun);
		} catch (error) {
			console.error("❌ Error:", error);
			process.exit(1);
		}
	})();
}
