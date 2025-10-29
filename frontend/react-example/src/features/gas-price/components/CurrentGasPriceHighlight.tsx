import { HighlightCard } from "@/components/HighlightCard";
import { useLatestBlocks } from "@/features/blocks/hooks/useLatestBlocks";

export default function CurrentGasPriceHighlight() {
  const { data, isLoading, isError } = useLatestBlocks();
  const latestBlock = data?.[0];

  if (isLoading) {
    return (
      <HighlightCard
        title="Current Gas Price"
        value={
          <span className="block h-8 w-32 animate-pulse rounded bg-slate-400 mt-3" />
        }
      />
    );
  }

  if (isError || !latestBlock) {
    return (
      <HighlightCard title="Current Gas Price" value="Unavailable" isError />
    );
  }

  return (
    <HighlightCard
      title="Current Gas Price"
      value={`${(Number(latestBlock.gasPrice) / 1_000_000_000).toFixed(
        3
      )} Gwei`}
    />
  );
}
