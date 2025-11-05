import * as z from "zod/v4";

export const TimeSeriesStatsSchema = z.object({
  arkivEntityKey: z.string(),
  avgGasPrice: z.string(),
  totalTransactionCount: z.number(),
  timestamp: z.number(),
});

export type HourlyStats = z.infer<typeof TimeSeriesStatsSchema>;
