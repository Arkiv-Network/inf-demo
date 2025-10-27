import { useQuery } from "@tanstack/react-query";
const MOCK_BLOCK_DETAILS = {
  // add anything you want here
};

export function useBlockDetails(blockHash: string) {
  return useQuery({
    queryKey: ["block-details", blockHash],
    queryFn: async () => {
      return MOCK_BLOCK_DETAILS;
    },
  });
}
