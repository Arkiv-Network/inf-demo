import type { GasPriceTrendPoint } from "../types";

const DAY_IN_MS = 86_400_000;
const BASE_DATE = Date.UTC(2025, 9, 27, 0, 0, 0);

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const MOCK_GAS_PRICE_TREND: GasPriceTrendPoint[] = Array.from(
  { length: 30 },
  (_, index) => {
    const currentDate = new Date(BASE_DATE - (29 - index) * DAY_IN_MS);
    const seasonalWave = Math.cos((index / 6) * Math.PI);
    const average = round(28 + seasonalWave * 4 + (index % 5) * 0.6);
    const p95 = round(average + 11 + Math.sin(index) * 2.5);
    const minimum = round(Math.max(average - 9, 12));

    return {
      date: currentDate.toISOString().slice(0, 10),
      averageGasPriceGwei: average,
      p95GasPriceGwei: p95,
      minimumGasPriceGwei: minimum,
    };
  }
);
