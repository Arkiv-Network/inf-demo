import {
	getBlock,
	getBulkGasPricesForBlocks,
	getEffectiveGasPriceForBlock,
	getGasPrice,
	getSuggestedGasPriceForBlock,
} from "./src/eth";

async function comparePrices() {
	const block = await getBlock();
	// measure time it takes to get the gas price
	let startTime = Date.now();
	const price = await getGasPrice();
	let endTime = Date.now();
	console.log(`Time taken to get gas price: ${endTime - startTime}ms`);

	startTime = Date.now();
	const suggestedGasPrice = await getSuggestedGasPriceForBlock(block.number);
	endTime = Date.now();
	console.log(
		`Time taken to get suggested gas price: ${endTime - startTime}ms`,
	);

	startTime = Date.now();
	const effectiveGasPrice = await getEffectiveGasPriceForBlock(block.number);
	endTime = Date.now();
	console.log(
		`Time taken to get effective gas price: ${endTime - startTime}ms`,
	);

	startTime = Date.now();
	const bulkGasPrices = await getBulkGasPricesForBlocks(
		block.number - 100n,
		block.number,
	);
	endTime = Date.now();
	console.log(`Time taken to get bulk gas prices: ${endTime - startTime}ms`);
	return {
		price,
		suggestedGasPrice,
		effectiveGasPrice,
		bulkGasPrices: bulkGasPrices[bulkGasPrices.length - 1],
	};
}

comparePrices().then((result) => {
	console.log(result);
});
