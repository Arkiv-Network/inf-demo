import { useContext } from "react";
import { arkivClientContext } from "../context/arkivClientContext";

export function useArkivClient() {
  const context = useContext(arkivClientContext);
  if (!context) {
    throw new Error(
      "useArkivClient must be used within an ArkivClientProvider"
    );
  }
  const client = context.client;
  if (!client) {
    throw new Error("Arkiv client is not initialized");
  }
  return {
    client,
    entityOwner: context.entityOwner,
    protocolVersion: context.protocolVersion,
  };
}
