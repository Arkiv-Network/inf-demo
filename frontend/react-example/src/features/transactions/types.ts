export type TransactionsDailyPoint = {
  date: string;
  transactionCount: number;
  uniqueAddresses: number;
  averageGasPriceGwei: number;
};

export type TransactionsHeatmapPoint = {
  day: string;
  hour: number;
  transactionCount: number;
};
