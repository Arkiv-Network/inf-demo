import { useQuery } from "@tanstack/react-query";

import { BlockDetailSchema, type BlockDetail } from "../types";
import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { eq, lte } from "@arkiv-network/sdk/query";
import * as z from "zod/v4";

const LatestBlockSchema = z.number();

export function useLatestBlocks() {
  const { client, entityOwner, protocolVersion } = useArkivClient();

  return useQuery<BlockDetail[]>({
    queryKey: ["latest-blocks", entityOwner, protocolVersion],
    refetchInterval: 60_000, // refetch every 60 seconds
    queryFn: async () => {
      const lastBlock = await client
        .buildQuery()
        .where([
          eq("project", "InfuraDemo"),
          eq("InfuraDemo_data", "latestBlockNumber"),
          eq("InfuraDemo_version", protocolVersion),
        ])
        .ownedBy(entityOwner)
        .withPayload()
        .fetch();

      let latestBlockNumber;

      try {
        // Write and delete operations may be eventually consistent, so it's possible we fetch more than
        // one entity marked as latestBlockNumber. We take the highest block number in that case.
        latestBlockNumber = Math.max(
          ...lastBlock.entities.map((entity) => {
            const parsed = LatestBlockSchema.parse(JSON.parse(entity.toText()));
            return parsed;
          })
        );
      } catch (err) {
        console.error("Error parsing latest block number from Arkiv:", err);
        throw new Error("No latest block number found in Arkiv");
      }

      if (!latestBlockNumber) {
        throw new Error("No latest block number found in Arkiv");
      }

      const latest10Blocks = await client
        .buildQuery()
        .where([
          eq("project", "InfuraDemo"),
          eq("InfuraDemo_version", protocolVersion),
          lte("InfuraDemo_blockNumber", String(latestBlockNumber)), // this is a string annotation
        ])
        .ownedBy(entityOwner)
        .withPayload()
        .limit(10)
        .fetch();

      if (latest10Blocks.entities.length === 0) {
        console.error(
          "No latest blocks found in Arkiv response:",
          latest10Blocks
        );
        throw new Error("No latest blocks found in Arkiv");
      }

      const blocks = latest10Blocks.entities
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

      return blocks;
    },
  });
}
