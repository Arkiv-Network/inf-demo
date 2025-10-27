import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { MOCK_BLOCK_DETAILS } from "../data/mock-blocks";
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

      const block = MOCK_BLOCK_DETAILS.find(
        (item) => item.number === blockNumber
      );
      if (!block) {
        throw new Error(`Block #${blockNumber.toLocaleString()} not found`);
      }

      return block;
    },
  });
}
