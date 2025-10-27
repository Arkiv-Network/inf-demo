import type { GasPriceHeatmapPoint, GasPriceTrendPoint } from "../types";

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

export const MOCK_GAS_PRICE_HEATMAP: GasPriceHeatmapPoint[] = Array.from(
  { length: 7 },
  (_, dayIndex) => {
    const currentDate = new Date(BASE_DATE - (6 - dayIndex) * DAY_IN_MS);
    const dayKey = currentDate.toISOString().slice(0, 10);

    return Array.from({ length: 24 }, (_, hour) => {
      const diurnalCycle = Math.sin((hour / 24) * Math.PI * 2) * 6;
      const baseline = 21 + dayIndex * 0.9;
      const averageGasPriceGwei = round(baseline + diurnalCycle + hour * 0.08);

      return {
        day: dayKey,
        hour,
        averageGasPriceGwei,
      };
    });
  }
).flat();
