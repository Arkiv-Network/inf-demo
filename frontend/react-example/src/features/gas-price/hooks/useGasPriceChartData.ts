import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { MOCK_GAS_PRICE_TREND } from "../data/mock-gas-price";
import { type GasPriceHeatmapPoint, type GasPriceTrendPoint } from "../types";
import { useTimeSeries } from "@/features/time-series/hooks/useTimeSeries";

export function useGasPriceChartData(
  timeframe: "daily"
): UseQueryResult<GasPriceTrendPoint[]>;
export function useGasPriceChartData(
  timeframe: "hourly"
): UseQueryResult<GasPriceHeatmapPoint[]>;
export function useGasPriceChartData(
  timeframe: "daily" | "hourly"
): UseQueryResult<GasPriceTrendPoint[] | GasPriceHeatmapPoint[]> {
  const { data: rawTimeSeriesData } = useTimeSeries(timeframe);
  return useQuery({
    queryKey: ["gas-price-chart-data", timeframe, rawTimeSeriesData],
    queryFn: async () => {
      if (!rawTimeSeriesData) {
        return [];
      }
      if (timeframe === "daily") {
        return MOCK_GAS_PRICE_TREND;
      }
      return rawTimeSeriesData.map((point) => {
        const date = new Date(point.timestamp * 1000);
        return {
          day: date.toISOString().slice(0, 10),
          hour: date.getUTCHours(),
          averageGasPriceGwei: Number(point.avgGasPrice) / 1_000_000_000,
          arkivEntityKey: point.arkivEntityKey,
        };
      });
    },
  });
}
