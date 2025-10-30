import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { eq, gte } from "@arkiv-network/sdk/query";
import { HourlyStatsSchema, type HourlyStats } from "../types";
import { useQuery } from "@tanstack/react-query";

/**
 * Time series data for both gas prices and transactions is stored in the same
 * records, so this generic hook can be reused by both features.
 */
export function useTimeSeries(timeframe: "daily" | "hourly") {
  const { client, entityOwner, protocolVersion } = useArkivClient();
  return useQuery({
    queryKey: ["time-series-data", entityOwner, protocolVersion, timeframe],
    queryFn: async () => {
      // TODO: add daily timeframe
      if (timeframe === "daily") {
        return [];
      }
      const timestampWeekAgo = Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60);
      const stats = await client
        .buildQuery()
        .where([
          eq("project", "InfuraDemo"),
          eq("InfuraDemo_version", protocolVersion),
          eq("InfuraDemo_dataType", "stats"),
          eq("InfuraDemo_statsType", "hourly"),
          gte("InfuraDemo_statsTimestamp", timestampWeekAgo),
        ])
        .ownedBy(entityOwner)
        .withPayload()
        .withAnnotations()
        .fetch();
      return stats.entities
        .map((entity) => {
          try {
            return HourlyStatsSchema.parse({
              arkivEntityKey: entity.key,
              timestamp: entity.annotations.find(
                (a) => a.key === "InfuraDemo_statsTimestamp"
              )?.value,
              ...JSON.parse(entity.toText()),
            });
          } catch (error) {
            console.error(
              "Failed to parse hourly stats entity:",
              error,
              "it will be skipped."
            );
            return null;
          }
        })
        .filter((point): point is HourlyStats => point !== null);
    },
  });
}
