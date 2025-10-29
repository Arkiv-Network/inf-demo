import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { BlockDetail } from "../types";

export function useBlockDetails(
  blockNumber: number | null
): UseQueryResult<BlockDetail> {
  return useQuery({
    queryKey: ["block-details", blockNumber],
    enabled: blockNumber !== null,
    queryFn: async () => {
      if (blockNumber === null) {
        throw new Error("A block number is required to fetch details");
      }

      throw new Error(`Block #${blockNumber.toLocaleString()} not found`);
    },
  });
}
