import { useQuery } from "@tanstack/react-query";

import { MOCK_TRANSACTIONS_DAILY } from "../data/mock-transactions";
import type { TransactionsDailyPoint } from "../types";

export function useTransactionHistory() {
  return useQuery<TransactionsDailyPoint[]>({
    queryKey: ["transactions", "daily"],
    queryFn: async () => MOCK_TRANSACTIONS_DAILY,
  });
}
