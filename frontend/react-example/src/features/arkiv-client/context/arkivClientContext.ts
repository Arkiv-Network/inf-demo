import type { PublicArkivClient } from "@arkiv-network/sdk";
import { createContext } from "react";

export const arkivClientContext = createContext<{
  client: PublicArkivClient | null;
  entityOwner: `0x${string}`;
  protocolVersion: string;
}>({
  client: null,
  entityOwner: "0x",
  protocolVersion: "",
});
