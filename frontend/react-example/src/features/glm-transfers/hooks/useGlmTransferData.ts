import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { GlmTransferDailyPoint, GlmTransferHourlyPoint } from "../types";
import { useTimeSeries } from "@/features/time-series/hooks/useTimeSeries";

export function useGlmTransferData(
	timeframe: "daily",
): UseQueryResult<GlmTransferDailyPoint[]>;
export function useGlmTransferData(
	timeframe: "hourly",
): UseQueryResult<GlmTransferHourlyPoint[]>;
export function useGlmTransferData(
	timeframe: "daily" | "hourly",
): UseQueryResult<GlmTransferDailyPoint[] | GlmTransferHourlyPoint[]> {
	const { data: rawTimeSeriesData } = useTimeSeries(timeframe);
	return useQuery({
		queryKey: ["glm-transfer-data", timeframe, rawTimeSeriesData],
		queryFn: async () => {
			if (!rawTimeSeriesData) {
				return [];
			}
			if (timeframe === "daily") {
				return rawTimeSeriesData.map((point) => {
					const date = new Date(point.timestamp * 1000);
					return {
						date: date.toISOString().slice(0, 10),
						transferCount: point.totalGLMTransfersCount,
						transferVolume: point.totalGLMTransfersAmount,
						arkivEntityKey: point.arkivEntityKey,
					};
				});
			}
			return rawTimeSeriesData.map((point) => {
				return {
					timestamp: point.timestamp * 1000,
					transferCount: point.totalGLMTransfersCount,
					transferVolume: point.totalGLMTransfersAmount,
					arkivEntityKey: point.arkivEntityKey,
				};
			});
		},
	});
}
