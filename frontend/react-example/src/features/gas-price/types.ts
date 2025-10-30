export type GasPriceTrendPoint = {
  date: string;
  averageGasPriceGwei: number;
  arkivEntityKey?: string;
};

export type GasPriceHeatmapPoint = {
  day: string;
  hour: number;
  averageGasPriceGwei: number;
  arkivEntityKey?: string;
};
