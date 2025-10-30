import { useQuery } from "@tanstack/react-query";

import type { TransactionsDailyPoint } from "../types";
import { useTimeSeries } from "@/features/time-series/hooks/useTimeSeries";

export function useTransactionHistory() {
  const { data: rawTimeSeriesData } = useTimeSeries("daily");
  return useQuery<TransactionsDailyPoint[]>({
    queryKey: ["transactions", "daily", rawTimeSeriesData],
    queryFn: async () => {
      if (!rawTimeSeriesData) {
        return [];
      }
      return rawTimeSeriesData.map((point) => {
        const date = new Date(point.timestamp * 1000);
        return {
          date: date.toISOString().slice(0, 10),
          transactionCount: point.totalTransactionCount,
          arkivEntityKey: point.arkivEntityKey,
        };
      });
    },
  });
}
