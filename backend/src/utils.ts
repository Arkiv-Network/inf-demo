export function calculateBaseFee(
  parentGasUsed: bigint,
  parentBaseFee: bigint
): bigint {
  const TARGET_GAS = 15_000_000n; // Target gas per block
  const MAX_CHANGE_DENOMINATOR = 8n; // 12.5% max change
  
  const gasUsedDelta = parentGasUsed - TARGET_GAS;
  const baseFeeDelta = (parentBaseFee * gasUsedDelta) / TARGET_GAS / MAX_CHANGE_DENOMINATOR;
  
  return parentBaseFee + baseFeeDelta > 0n ? parentBaseFee + baseFeeDelta : 1n; // Minimum 1 wei
}