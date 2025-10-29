#!/usr/bin/env bun

/**
 * Simple test script to demonstrate the API endpoints
 * Run with: bun test-api.ts
 */

const BASE_URL = "http://localhost:3001";

async function testAPI() {
	console.log("🧪 Testing Infura Demo Backend API\n");

	try {
		// Test health check
		console.log("1. Testing health check endpoint...");
		const healthResponse = await fetch(`${BASE_URL}/`);
		const healthData = await healthResponse.json();
		console.log("✅ Health check:", healthData);
		console.log("");

		// Test collectData endpoint
		console.log("2. Testing collectData endpoint...");
		const collectResponse = await fetch(`${BASE_URL}/collectData`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const collectData = await collectResponse.json();
		console.log("✅ Data collected:", collectData);
		console.log("");

		// Test aggregateData endpoint
		console.log("3. Testing aggregateData endpoint...");
		const aggregateResponse = await fetch(`${BASE_URL}/aggregateData`);
		const aggregateData = await aggregateResponse.json();
		console.log("✅ Data aggregated:", JSON.stringify(aggregateData, null, 2));
		console.log("");

		console.log("🎉 All tests completed successfully!");
	} catch (error) {
		console.error("❌ Test failed:", error);
		console.log("\n💡 Make sure the server is running with: bun run dev");
	}
}

// Run the tests
testAPI();
