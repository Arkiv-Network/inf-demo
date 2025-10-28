import { createPublicClient, type Hex, http } from "viem";
import { mainnet } from "viem/chains";

const ethClient = createPublicClient({
	chain: mainnet,
	transport: http(),
});

export async function getBlock(hash?: Hex) {
	return await ethClient.getBlock(hash ? { blockHash: hash } : undefined);
}

export async function getGasPrice(): Promise<bigint> {
	return await ethClient.getGasPrice();
}
