import { HighlightCard } from "@/components/HighlightCard";
import { useMemo } from "react";
import { useTransactionHistory } from "../hooks/useTransactionHistory";

export default function AverageTransactionsHighlight() {
  const { data, isLoading, isError } = useTransactionHistory();
  const average = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    const total = data.reduce((sum, point) => sum + point.transactionCount, 0);
    return total / data.length;
  }, [data]);

  if (isLoading || !average) {
    return (
      <HighlightCard
        title="Avg Daily Transactions"
        value={
          <span className="block h-8 w-32 animate-pulse rounded bg-slate-400 mt-3" />
        }
      />
    );
  }

  if (isError || isNaN(average)) {
    return (
      <HighlightCard
        title="Avg Daily Transactions"
        value="Unavailable"
        isError
      />
    );
  }

  return (
    <HighlightCard
      title="Avg Daily Transactions"
      value={average.toLocaleString()}
    />
  );
}
