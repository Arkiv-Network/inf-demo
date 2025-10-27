import { useQuery } from "@tanstack/react-query";

import { MOCK_TRANSACTIONS_HEATMAP } from "../data/mock-transactions";
import type { TransactionsHeatmapPoint } from "../types";

export function useTransactionHeatmap() {
  return useQuery<TransactionsHeatmapPoint[]>({
    queryKey: ["transactions", "heatmap"],
    queryFn: async () => MOCK_TRANSACTIONS_HEATMAP,
  });
}
