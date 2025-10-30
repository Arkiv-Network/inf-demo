export type TransactionsDailyPoint = {
  date: string;
  transactionCount: number;
  arkivEntityKey?: string;
};

export type TransactionsHeatmapPoint = {
  day: string;
  hour: number;
  transactionCount: number;
  arkivEntityKey?: string;
};
