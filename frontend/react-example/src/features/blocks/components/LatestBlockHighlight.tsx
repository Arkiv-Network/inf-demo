import { HighlightCard } from "@/components/HighlightCard";
import { useLatestBlocks } from "../hooks/useLatestBlocks";

export function LatestBlockHighlight() {
  const { data, isLoading, isError } = useLatestBlocks();
  const latestBlock = data?.[0];

  if (isLoading) {
    return (
      <HighlightCard
        title="Latest block"
        value={
          <span className="block h-8 w-32 animate-pulse rounded bg-slate-400 mt-3" />
        }
      />
    );
  }

  if (isError || !latestBlock) {
    return <HighlightCard title="Latest block" value="Unavailable" isError />;
  }

  return (
    <HighlightCard title="Latest block" value={`#${latestBlock.blockNumber}`} />
  );
}
