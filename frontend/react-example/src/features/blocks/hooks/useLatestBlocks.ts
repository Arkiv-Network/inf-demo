import { eq } from "@arkiv-network/sdk/query";
import { useQuery } from "@tanstack/react-query";
import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { type BlockDetail, BlockDetailSchema } from "../types";

export function useLatestBlocks() {
	const { client, entityOwner, protocolVersion } = useArkivClient();

	return useQuery<BlockDetail[]>({
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
				.orderBy("EthDemo_blockTimestamp", "number", true)
				.limit(10)
				.ownedBy(entityOwner)
				.withPayload()
				.fetch();

			if (latestBlocks.entities.length === 0) {
				console.error(
					"No latest blocks found in Arkiv response:",
					latestBlocks,
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
							"that block will be skipped.",
						);
						return null;
					}
				})
				.filter(
					(blockOrNull): blockOrNull is BlockDetail => blockOrNull !== null,
				);

			return blocks;
		},
	});
}
