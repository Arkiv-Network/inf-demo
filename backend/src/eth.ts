import { createPublicClient, type Hex, http } from "viem";
import { mainnet } from "viem/chains";

const ethClient = createPublicClient({
	chain: mainnet,
	transport: process.env.ETH_RPC_URL ? http(process.env.ETH_RPC_URL) : http(),
});
console.info("ETH_RPC_URL", process.env.ETH_RPC_URL);

export async function getBlock(hash?: Hex, blockNumber?: bigint) {
	// do 3 retries
	for (let i = 0; i < 3; i++) {
		try {
			return await ethClient.getBlock(
				hash ? { blockHash: hash } : blockNumber ? { blockNumber } : undefined,
			);
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
