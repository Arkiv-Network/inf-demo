import { useQuery } from "@tanstack/react-query";

import { MOCK_LATEST_BLOCKS } from "../data/mock-blocks";
import type { BlockSummary } from "../types";

export function useLatestBlocks() {
  return useQuery<BlockSummary[]>({
    queryKey: ["latest-blocks"],
    queryFn: async () => MOCK_LATEST_BLOCKS,
  });
}
