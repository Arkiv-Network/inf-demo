import { useQuery } from "@tanstack/react-query";

import { BlockDetailSchema, type BlockDetail } from "../types";
import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { eq, gte } from "@arkiv-network/sdk/query";

export function useLatestBlocks() {
  const { client, entityOwner, protocolVersion } = useArkivClient();

  return useQuery<BlockDetail[]>({
    queryKey: ["latest-blocks", entityOwner, protocolVersion],
    refetchInterval: 60_000, // refetch every 60 seconds
    queryFn: async () => {
      const interval5MinAgo = Math.floor(Date.now() / 1000 - 5 * 60);

      const latestBlocks = await client
        .buildQuery()
        .where([
          eq("project", "InfDemo"),
          eq("InfDemo_version", protocolVersion),
          eq("InfDemo_dataType", "blockdata"),
          gte("InfDemo_blockTimestamp", interval5MinAgo),
        ])
        .ownedBy(entityOwner)
        .withPayload()
        .fetch();

      if (latestBlocks.entities.length === 0) {
        console.error(
          "No latest blocks found in Arkiv response:",
          latestBlocks
        );
        throw new Error("No latest blocks found in Arkiv");
      }

      const blocks = latestBlocks.entities
        .map((entity) => {
          try {
            return BlockDetailSchema.parse({
              arkivEntityKey: entity.key,
              ...entity.toJson(),
            });
          } catch (err) {
            console.error(
              `Error parsing block detail for entity ${entity.key}:`,
              err,
              "that block will be skipped."
            );
            return null;
          }
        })
        .filter(
          (blockOrNull): blockOrNull is BlockDetail => blockOrNull !== null
        );

      blocks.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      return blocks.slice(0, 10);
    },
  });
}
