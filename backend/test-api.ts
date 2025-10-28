#!/usr/bin/env bun

/**
 * Simple test script to demonstrate the API endpoints
 * Run with: bun test-api.ts
 */

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Infura Demo Backend API\n');

  try {
    // Test health check
    console.log('1. Testing health check endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');

    // Test collectData endpoint
    console.log('2. Testing collectData endpoint...');
    const collectResponse = await fetch(`${BASE_URL}/collectData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: 'Sample blockchain transaction data',
        timestamp: new Date().toISOString(),
        source: 'api',
        metadata: {
          network: 'ethereum',
          blockNumber: 12345
        }
      })
    });
    const collectData = await collectResponse.json();
    console.log('✅ Data collected:', collectData);
    console.log('');

    // Test aggregateData endpoint
    console.log('3. Testing aggregateData endpoint...');
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    
    const aggregateResponse = await fetch(
      `${BASE_URL}/aggregateData?startDate=${startDate}&endDate=${endDate}&source=api&groupBy=hour&limit=5`
    );
    const aggregateData = await aggregateResponse.json();
    console.log('✅ Data aggregated:', JSON.stringify(aggregateData, null, 2));
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Make sure the server is running with: bun run dev');
  }
}

// Run the tests
testAPI();
