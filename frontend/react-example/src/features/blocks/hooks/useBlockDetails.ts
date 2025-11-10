import { eq } from "@arkiv-network/sdk/query";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { type BlockDetail, BlockDetailSchema } from "../types";

export function useBlockDetails(
	blockNumber: string | null,
): UseQueryResult<BlockDetail> {
	const { client, entityOwner, protocolVersion } = useArkivClient();
	return useQuery({
		queryKey: ["block-details", entityOwner, protocolVersion, blockNumber],
		enabled: blockNumber !== null,
		queryFn: async () => {
			if (blockNumber === null) {
				throw new Error("A block number is required to fetch details");
			}

			const blockDetail = await client
				.buildQuery()
				.where([
					eq("EthDemo_blockNumber", blockNumber),
					eq("EthDemo_dataType", "blockdata"),
					eq("project", "EthDemo"),
					eq("EthDemo_version", protocolVersion),
				])
				.withPayload()
				.ownedBy(entityOwner)
				.fetch();
			const entity = blockDetail.entities[0];
			if (!entity) {
				throw new Error(`Block #${blockNumber} not found`);
			}
			return BlockDetailSchema.parse({
				arkivEntityKey: entity.key,
				...entity.toJson(),
			});
		},
	});
}
