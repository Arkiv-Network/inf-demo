import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { eq, gte } from "@arkiv-network/sdk/query";
import { TimeSeriesStatsSchema, type HourlyStats } from "../types";
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
      const timestampWeekAgo = Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60);
      const stats = await client
        .buildQuery()
        .where([
          eq("project", "InfDemo"),
          eq("InfDemo_version", protocolVersion),
          eq("InfDemo_dataType", "stats"),
          eq("InfDemo_statsType", timeframe),
          gte("InfDemo_statsTimestamp", timestampWeekAgo),
        ])
        .limit(timeframe === "daily" ? 30 : 7 * 24)
        .ownedBy(entityOwner)
        .withPayload()
        .withAttributes()
        .fetch();
      return stats.entities
        .map((entity) => {
          try {
            return TimeSeriesStatsSchema.parse({
              arkivEntityKey: entity.key,
              timestamp: entity.attributes.find(
                (a) => a.key === "InfDemo_statsTimestamp"
              )?.value,
              ...JSON.parse(entity.toText()),
            });
          } catch (error) {
            console.error(
              `Failed to parse ${timeframe} stats entity:`,
              error,
              "it will be skipped. Entity key:",
              entity.key
            );
            return null;
          }
        })
        .filter((point): point is HourlyStats => point !== null);
    },
  });
}
