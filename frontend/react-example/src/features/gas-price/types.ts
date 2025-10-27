export type GasPriceTrendPoint = {
  date: string;
  averageGasPriceGwei: number;
  p95GasPriceGwei: number;
  minimumGasPriceGwei: number;
};

export type GasPriceHeatmapPoint = {
  day: string;
  hour: number;
  averageGasPriceGwei: number;
};
