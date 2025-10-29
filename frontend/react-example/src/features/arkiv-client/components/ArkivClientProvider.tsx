import { useState } from "react";
import { getArkivClient } from "../helpers/getArkivClient";
import { arkivClientContext } from "../context/arkivClientContext";
import { ENTITY_OWNER, PROTOCOL_VERSION } from "../constants";

export function ArkivClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(getArkivClient);

  return (
    <arkivClientContext.Provider
      value={{
        client,
        entityOwner: ENTITY_OWNER,
        protocolVersion: PROTOCOL_VERSION,
      }}
    >
      {children}
    </arkivClientContext.Provider>
  );
}
