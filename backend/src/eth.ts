import {
	createPublicClient,
	formatEther,
	formatGwei,
	formatUnits,
	type Hex,
	http,
	parseAbi,
	parseEther,
	parseUnits,
} from "viem";
import { mainnet } from "viem/chains";
import type { BlockWithGasPrice } from "./types";

// GLM token contract address (Golem on Ethereum mainnet)
const GLM_ADDRESS = "0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429";

// Standard ERC20 Transfer event ABI
const erc20Abi = parseAbi([
	"event Transfer(address indexed from, address indexed to, uint256 value)",
]);

console.info("ETH_RPC_URL", process.env.ETH_RPC_URL);
const ethClient = createPublicClient({
	chain: mainnet,
	transport: process.env.ETH_RPC_URL ? http(process.env.ETH_RPC_URL) : http(),
});

export async function getBlock(
	hash?: Hex,
	blockNumber?: bigint,
	withGasPrice?: boolean,
): Promise<BlockWithGasPrice | null> {
	// do 3 retries
	for (let i = 0; i < 3; i++) {
		try {
			return {
				...(await ethClient.getBlock(
					hash
						? { blockHash: hash }
						: blockNumber
							? { blockNumber }
							: undefined,
				)),
				gasPrice: withGasPrice
					? (await getSuggestedGasPriceForBlock(blockNumber)).suggestedGasPrice
					: 0n,
			};
		} catch (error) {
			console.error("Error in getBlock:", error);
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
	return null;
}

export async function getGasPrice(): Promise<bigint> {
	return await ethClient.getGasPrice();
}

// Get effective gas price for a historical block
export async function getEffectiveGasPriceForBlock(blockNumber: bigint) {
	const block = await ethClient.getBlock({
		blockNumber,
		includeTransactions: true, // Must include transactions
	});

	if (!block.transactions || block.transactions.length === 0) {
		return null; // No transactions in block
	}

	// Get transaction receipts to calculate effective gas prices
	const effectivePrices: bigint[] = [];

	for (const tx of block.transactions) {
		try {
			const receipt = await ethClient.getTransactionReceipt({
				hash: tx.hash,
			});

			// effectiveGasPrice is the actual price paid per gas unit
			if (receipt.effectiveGasPrice) {
				effectivePrices.push(receipt.effectiveGasPrice);
			}
		} catch (_) {
			console.error(`Failed to get receipt for tx ${tx.hash}`);
		}
	}

	if (effectivePrices.length === 0) {
		return null;
	}

	// Calculate median (most representative)
	const sorted = effectivePrices.sort((a, b) => (a < b ? -1 : 1));
	const median = sorted[Math.floor(sorted.length / 2)];

	// Calculate average
	const average =
		effectivePrices.reduce((sum, price) => sum + price, 0n) /
		BigInt(effectivePrices.length);

	// Get min and max
	const min = sorted[0];
	const max = sorted[sorted.length - 1];

	return {
		blockNumber: block.number,
		timestamp: block.timestamp,
		baseFeePerGas: block.baseFeePerGas,
		effectiveGasPrice: {
			median,
			average,
			min,
			max,
			medianGwei: formatGwei(median),
			averageGwei: formatGwei(average),
			minGwei: formatGwei(min),
			maxGwei: formatGwei(max),
		},
		transactionCount: effectivePrices.length,
	};
}

// More efficient version using eth_feeHistory
export async function getSuggestedGasPriceForBlock(blockNumber: bigint) {
	// Use feeHistory to get historical gas price data
	const feeHistory = await ethClient.getFeeHistory({
		blockCount: 1,
		blockNumber: blockNumber,
		rewardPercentiles: [50],
	});

	const baseFeePerGas = BigInt(feeHistory.baseFeePerGas[0]);
	const priorityFee = BigInt(feeHistory.reward[0][0]);
	const suggestedGasPrice = baseFeePerGas + priorityFee;

	return {
		blockNumber,
		baseFeePerGas,
		priorityFee,
		suggestedGasPrice,
		suggestedGasPriceGwei: formatGwei(suggestedGasPrice),
	};
}

export async function getBulkGasPricesForBlocks(
	startBlock: bigint,
	endBlock: bigint,
) {
	const blockCount = Number(endBlock - startBlock + 1n);

	const feeHistory = await ethClient.getFeeHistory({
		blockCount: blockCount,
		blockNumber: endBlock,
		rewardPercentiles: [25, 50, 75], // 25th, 50th, 75th percentiles
	});

	const results = [];
	for (let i = 0; i < blockCount; i++) {
		const blockNum = startBlock + BigInt(i);
		const baseFee = BigInt(feeHistory.baseFeePerGas[i]);
		const priorityFee50th = BigInt(feeHistory.reward[i][1]); // 50th percentile
		const suggestedPrice = baseFee + priorityFee50th;

		results.push({
			blockNumber: blockNum,
			suggestedGasPrice: suggestedPrice,
			suggestedGasPriceGwei: formatGwei(suggestedPrice),
		});
	}

	return results;
}

// Get GLM transfers for a specific block
export async function getGLMTransfersForBlock(blockNumber: bigint) {
	const logs = await ethClient.getLogs({
		address: GLM_ADDRESS,
		event: erc20Abi[0], // Transfer event
		fromBlock: blockNumber,
		toBlock: blockNumber,
	});

	let totalTransferred = 0n;
	const transfers = [];

	for (const log of logs) {
		const { from, to, value } = log.args;

		transfers.push({
			from,
			to,
			value,
			valueInGLM: formatUnits(value, 18), // GLM has 18 decimals
			transactionHash: log.transactionHash,
		});

		totalTransferred += value;
	}

	return {
		blockNumber,
		transferCount: transfers.length,
		totalTransferred,
		totalTransferredInGLM: formatUnits(totalTransferred, 18),
		transfers,
	};
}

export async function getGLMTransfersForBlockRange(
	startBlock: bigint,
	endBlock: bigint,
) {
	const fromBlock = startBlock <= endBlock ? startBlock : endBlock;
	const toBlock = startBlock <= endBlock ? endBlock : startBlock;
	console.debug("Getting GLM transfers for block range:", fromBlock, toBlock);
	// Query all transfers in the range at once (more efficient)
	const logs = await ethClient.getLogs({
		address: GLM_ADDRESS,
		event: erc20Abi[0],
		fromBlock: fromBlock,
		toBlock: toBlock,
	});

	// Group by block number
	const transfersByBlock = new Map<bigint, typeof logs>();

	for (const log of logs) {
		const blockNum = log.blockNumber;
		if (!transfersByBlock.has(blockNum)) {
			transfersByBlock.set(blockNum, []);
		}
		transfersByBlock.get(blockNum)?.push(log);
	}

	// Calculate totals per block
	const results = [];
	for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
		const blockLogs = transfersByBlock.get(blockNum) || [];
		const totalTransferred = blockLogs.reduce(
			(sum, log) => sum + log.args.value,
			0n,
		);

		results.push({
			blockNumber: blockNum,
			transferCount: blockLogs.length,
			totalTransferred,
			totalTransferredInGLM: Number(formatEther(totalTransferred)),
		});
	}

	return results;
}
