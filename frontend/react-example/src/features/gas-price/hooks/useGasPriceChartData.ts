import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  MOCK_GAS_PRICE_HEATMAP,
  MOCK_GAS_PRICE_TREND,
} from "../data/mock-gas-price";
import type { GasPriceHeatmapPoint, GasPriceTrendPoint } from "../types";

export function useGasPriceChartData(
  timeframe: "daily"
): UseQueryResult<GasPriceTrendPoint[]>;
export function useGasPriceChartData(
  timeframe: "hourly"
): UseQueryResult<GasPriceHeatmapPoint[]>;
export function useGasPriceChartData(
  timeframe: "daily" | "hourly"
): UseQueryResult<GasPriceTrendPoint[] | GasPriceHeatmapPoint[]> {
  return useQuery({
    queryKey: ["gas-price-chart-data", timeframe],
    queryFn: async () =>
      timeframe === "daily" ? MOCK_GAS_PRICE_TREND : MOCK_GAS_PRICE_HEATMAP,
  });
}
