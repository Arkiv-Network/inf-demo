import { createPublicClient, http } from "@arkiv-network/sdk";
import { ARKIV_CHAIN } from "../constants";

export function getArkivClient() {
  const publicClient = createPublicClient({
    transport: http(),
    chain: ARKIV_CHAIN,
  });

  return publicClient;
}
