import { asc, eq } from "@arkiv-network/sdk/query";
import { useQuery } from "@tanstack/react-query";
import { useArkivClient } from "@/features/arkiv-client/hooks/useArkivClient";
import { BlockDetailSchema } from "../types";
import { useLatestBlocks } from "./useLatestBlocks";
import { useMemo } from "react";

export type BlockRange = {
	minBlockNumber: number;
	maxBlockNumber: number;
};

export function useBlockRange() {
	const { client, entityOwner, protocolVersion } = useArkivClient();
	const { data: latestBlocks, isError: isErrorLatest } = useLatestBlocks();

	const {
		data: earliestBlockNumber,
		isPending: isLoadingEarliest,
		isError: isErrorEarliest,
	} = useQuery({
		queryKey: ["earliest-block", entityOwner, protocolVersion],
		staleTime: Number.POSITIVE_INFINITY,
		queryFn: async () => {
			const earliestBlockQuery = await client
				.buildQuery()
				.where([
					eq("project", "EthDemo"),
					eq("EthDemo_version", protocolVersion),
					eq("EthDemo_dataType", "blockdata"),
				])
				.orderBy(asc("EthDemo_blockTimestamp", "number"))
				.limit(1)
				.ownedBy(entityOwner)
				.withPayload()
				.fetch();

			if (earliestBlockQuery.entities.length === 0) {
				throw new Error("No blocks found in Arkiv");
			}

			const earliestEntity = earliestBlockQuery.entities[0];
			if (!earliestEntity) {
				throw new Error("No earliest block entity found");
			}

			const earliestBlock = BlockDetailSchema.parse({
				arkivEntityKey: earliestEntity.key,
				...earliestEntity.toJson(),
			});

			return Number(earliestBlock.blockNumber);
		},
	});

	// Combine earliest block with latest blocks data
	const blockRange = useMemo<BlockRange | undefined>(() => {
		if (!latestBlocks || latestBlocks.length === 0 || !earliestBlockNumber) {
			return undefined;
		}

		const latestBlock = latestBlocks[0];
		if (!latestBlock) {
			return undefined;
		}

		return {
			minBlockNumber: earliestBlockNumber,
			maxBlockNumber: Number(latestBlock.blockNumber),
		};
	}, [latestBlocks, earliestBlockNumber]);

	return {
		data: blockRange,
		isPending: isLoadingEarliest || !latestBlocks,
		isError: isErrorEarliest || isErrorLatest,
	};
}
