import { useQuery } from "@tanstack/react-query";

import type { TransactionsHeatmapPoint } from "../types";
import { useTimeSeries } from "@/features/time-series/hooks/useTimeSeries";

export function useTransactionHeatmap() {
  const { data: rawTimeSeriesData } = useTimeSeries("hourly");

  return useQuery<TransactionsHeatmapPoint[]>({
    queryKey: ["transaction-heatmap-data", rawTimeSeriesData],
    queryFn: async () => {
      if (!rawTimeSeriesData) {
        return [];
      }
      return rawTimeSeriesData.map((point) => {
        const date = new Date(point.timestamp * 1000);
        return {
          day: date.toISOString().slice(0, 10),
          hour: date.getUTCHours(),
          transactionCount: Number(point.avgTransactionCount),
          arkivEntityKey: point.arkivEntityKey,
        };
      });
    },
  });
}
