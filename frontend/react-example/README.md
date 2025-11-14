# React Arkiv Demo

This directory contains a React-based dashboard that showcases how to read the state of the Ethereum blockchain stored on Arkiv. Every page fetches the data directly from an Arkiv RPC endpoint using the `@arkiv-network/sdk` package and renders the results using React, tailwindcss and shadcn/ui components.

## Using the Arkiv SDK

### 1. Setting up the Arkiv Client

First, create a public client by defining your chain configuration and initializing the client ([`getArkivClient.ts`](./src/features/arkiv-client/helpers/getArkivClient.ts)):

```typescript
import { createPublicClient, http } from "@arkiv-network/sdk";
import type { Chain } from "@arkiv-network/sdk";

const ARKIV_CHAIN: Chain = {
  id: 60138453045,
  name: "Arkiv EthDemo Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [`https://infurademo.hoodi.arkiv.network/rpc`],
      webSocket: [`wss://infurademo.hoodi.arkiv.network/rpc/ws`],
    },
  },
};

export function getArkivClient() {
  const publicClient = createPublicClient({
    transport: http(),
    chain: ARKIV_CHAIN,
  });

  return publicClient;
}
```

In this project, we use a non-standard Arkiv testnet called "Arkiv EthDemo Testnet" with a custom RPC endpoint. If you want to use any of the standard testnets, such as `kaolin` or `mendoza`, you can just import the predefined chain from the SDK:

```typescript
import { kaolin } from "@arkiv-network/sdk/chains";

const publicClient = createPublicClient({
  transport: http(),
  chain: kaolin,
});
```

### 2. Providing the Client to Your App

Wrap your application with a provider to make the Arkiv client available throughout your component tree ([`ArkivClientProvider.tsx`](./src/features/arkiv-client/components/ArkivClientProvider.tsx)):

```typescript
import { arkivClientContext } from "../context/arkivClientContext";

export function ArkivClientProvider({ children }: { children: React.ReactNode }) {
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
```

As your data evolves, it's a good practice to version your data schema. In this example, we pass a `protocolVersion` string to the provider, which is then used in queries to fetch the correct version of the data.

In this example we only want to fetch data for a specific entity owner, so we also specify an `entityOwner` value in the context.

### 3. Querying Data with the SDK

Use the Arkiv SDK's query builder to fetch entities. It's recommended to use a library like React Query to manage async data fetching and caching in your React app.
 Here's an example fetching the latest blocks ([`useLatestBlocks.ts`](./src/features/blocks/hooks/useLatestBlocks.ts)):

```typescript
import { desc, eq } from "@arkiv-network/sdk/query";
import { useQuery } from "@tanstack/react-query";

export function useLatestBlocks() {
  const { client, entityOwner, protocolVersion } = useArkivClient();

  return useQuery({
    queryKey: ["latest-blocks", entityOwner, protocolVersion],
    refetchInterval: 15_000, // refetch every 15 seconds
    queryFn: async () => {
      const latestBlocks = await client
        .buildQuery()
        .where([
          eq("project", "EthDemo"),
          eq("EthDemo_version", protocolVersion),
          eq("EthDemo_dataType", "blockdata"),
        ])
        .orderBy(desc("EthDemo_blockTimestamp", "number"))
        .limit(10)
        .ownedBy(entityOwner)
        .withPayload()
        .fetch();

      return latestBlocks.entities.map(entity => entity.toJson());
    },
  });
}
```

### 4. Validating Data with Zod

**Always validate data from external sources** to ensure type safety and catch unexpected formats. Define Zod schemas for your data types ([`types.ts`](./src/features/blocks/types.ts)):

```typescript
import * as z from "zod/v4";

export const BlockDetailSchema = z.object({
  arkivEntityKey: z.string(),
  blockNumber: z.string(),
  blockHash: z.string(),
  parentHash: z.string(),
  timestamp: z.number(),
  miner: z.string(),
  transactionCount: z.number(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  gasLimit: z.string(),
  baseFeePerGas: z.string(),
  size: z.string(),
});

export type BlockDetail = z.infer<typeof BlockDetailSchema>;
```

Then parse and validate the data in your query function:

```typescript
const blocks = latestBlocks.entities
  .map((entity) => {
    try {
      return BlockDetailSchema.parse({
        arkivEntityKey: entity.key,
        ...entity.toJson(),
      });
    } catch (err) {
      console.error(`Error parsing block detail for entity ${entity.key}:`, err);
      return null;
    }
  })
  .filter((blockOrNull): blockOrNull is BlockDetail => blockOrNull !== null);
```

This approach ensures that:

- Invalid data is caught early with clear error messages
- Your TypeScript types match the actual runtime data
- Unexpected API changes are detected immediately
- Bad entities can be gracefully skipped without breaking the entire query
