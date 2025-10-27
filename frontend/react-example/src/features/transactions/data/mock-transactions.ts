import type {
  TransactionsDailyPoint,
  TransactionsHeatmapPoint,
} from "../types";

const DAY_IN_MS = 86_400_000;
const BASE_DATE = Date.UTC(2025, 9, 27, 0, 0, 0);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const MOCK_TRANSACTIONS_DAILY: TransactionsDailyPoint[] = Array.from(
  { length: 30 },
  (_, index) => {
    const timestamp = new Date(BASE_DATE - (29 - index) * DAY_IN_MS);
    const seasonalWave = Math.sin((index / 5) * Math.PI);
    const transactionCount = Math.round(
      965_000 + seasonalWave * 75_000 + index * 1_250
    );
    const uniqueAddresses = Math.round(
      clamp(transactionCount * (0.42 + seasonalWave * 0.05), 310_000, 515_000)
    );
    const averageGasPriceGwei = Number(
      clamp(21 + seasonalWave * 4 + (index % 7) * 0.35, 18, 34).toFixed(2)
    );

    return {
      date: timestamp.toISOString().slice(0, 10),
      transactionCount,
      uniqueAddresses,
      averageGasPriceGwei,
    };
  }
);

export const MOCK_TRANSACTIONS_HEATMAP: TransactionsHeatmapPoint[] = Array.from(
  { length: 7 },
  (_, dayIndex) => {
    const dayTimestamp = new Date(BASE_DATE - (6 - dayIndex) * DAY_IN_MS);
    const dayKey = dayTimestamp.toISOString().slice(0, 10);

    return Array.from({ length: 24 }, (_, hour) => {
      const base = 420 + Math.sin((hour / 24) * Math.PI * 2) * 160;
      const demandAdjustment = 1 + dayIndex * 0.04;
      const transactionCount = Math.round(base * demandAdjustment);

      return {
        day: dayKey,
        hour,
        transactionCount,
      };
    });
  }
).flat();
