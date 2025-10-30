import { HighlightCard } from "@/components/HighlightCard";
import { useGasPriceChartData } from "../hooks/useGasPriceChartData";
import { useMemo } from "react";

export default function AverageGasPriceHighlight() {
  const { data, isLoading, isError } = useGasPriceChartData("daily");
  const average = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    const total = data.reduce(
      (sum, point) => sum + point.averageGasPriceGwei,
      0
    );
    return total / data.length;
  }, [data]);

  if (isLoading || !average) {
    return (
      <HighlightCard
        title="Avg Gas (30d)"
        value={
          <span className="block h-8 w-32 animate-pulse rounded bg-slate-400 mt-3" />
        }
      />
    );
  }

  if (isError || isNaN(average)) {
    return <HighlightCard title="Avg Gas (30d)" value="Unavailable" isError />;
  }

  return (
    <HighlightCard title="Avg Gas (30d)" value={`${average.toFixed(3)} Gwei`} />
  );
}
