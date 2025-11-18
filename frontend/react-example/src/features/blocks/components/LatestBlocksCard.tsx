import { ArrowUpRight, ExternalLink } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "../helpers/formatTimestamp";
import { useLatestBlocks } from "../hooks/useLatestBlocks";

type LatestBlocksCardProps = {
	className?: string;
};

const TableHeaderRow = () => (
	<TableHeader>
		<TableRow className="bg-sky-100/70 text-sky-900">
			<TableHead className="w-[15%]">Block</TableHead>
			<TableHead className="w-[25%]">Timestamp</TableHead>
			<TableHead className="w-[25%]">Miner</TableHead>
			<TableHead className="w-[10%]">Tx Count</TableHead>
			<TableHead className="w-[25%]">Arkiv Entity</TableHead>
		</TableRow>
	</TableHeader>
);

const SkeletonRow = () => (
	<TableRow className="hover:bg-sky-100/40">
		<TableCell>
			<div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
		</TableCell>
		<TableCell>
			<div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
		</TableCell>
		<TableCell>
			<div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
		</TableCell>
		<TableCell>
			<div className="h-5 w-8 animate-pulse rounded bg-slate-200" />
		</TableCell>
		<TableCell>
			<div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
		</TableCell>
	</TableRow>
);

const EmptyRow = ({ children }: { children: React.ReactNode }) => (
	<TableRow className="h-[370px]">
		<TableCell colSpan={5} className="text-center py-32">
			{children}
		</TableCell>
	</TableRow>
);

const BlockListSkeleton = () => (
	<div className="space-y-3">
		{[...Array(4)].map((_, index) => (
			<div
				key={index}
				className="animate-pulse rounded-xl border border-sky-100 bg-white/70 p-4 shadow-sm"
			>
				<div className="flex flex-col gap-3">
					<div className="h-4 w-20 rounded bg-slate-200" />
					<div className="h-4 w-44 rounded bg-slate-200" />
					<div className="h-4 w-32 rounded bg-slate-200" />
					<div className="h-4 w-16 rounded bg-slate-200" />
					<div className="h-4 w-36 rounded bg-slate-200" />
				</div>
			</div>
		))}
	</div>
);

function formatEntitySnippet(value: string) {
	if (value.length <= 12) {
		return value;
	}
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function LatestBlocksCard({ className }: LatestBlocksCardProps) {
	const { data, isPending, isError, isFetching } = useLatestBlocks();

	return (
		<Card
			className={cn(
				"border-sky-200/70 bg-white/95 shadow-2xl shadow-sky-200/60 backdrop-blur",
				className,
			)}
		>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div>
						<CardTitle className="text-xl">Latest Blocks</CardTitle>
						<CardDescription>
							Real-time snapshots of the most recent blocks mined on Ethereum.
							Refreshes every 15 seconds.
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						{isFetching && !isPending && (
							<div className="flex items-center gap-1.5 text-xs text-sky-700">
								<div className="h-2 w-2 animate-pulse rounded-full bg-sky-600" />
								<span>Updating...</span>
							</div>
						)}
						<span className="rounded-full bg-sky-200/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-900">
							Live feed
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="hidden md:block">
					<Table className="text-sm">
						<TableHeaderRow />
						<TableBody>
							{isPending ? (
								[...Array(10)].map((_, i) => <SkeletonRow key={i} />)
							) : isError ? (
								<EmptyRow>
									<div className="text-sm text-destructive">
										Something went wrong. Please try again later.
									</div>
								</EmptyRow>
							) : !data?.length ? (
								<EmptyRow>
									<div className="text-sm text-muted-foreground">
										No block data is available yet.
									</div>
								</EmptyRow>
							) : (
								data.map((block) => (
									<TableRow
										key={block.blockHash}
										className="hover:bg-sky-100/40"
									>
										<TableCell className="font-semibold text-slate-900">
											#{block.blockNumber}
										</TableCell>
										<TableCell className="text-slate-600">
											{formatTimestamp(block.timestamp)}
										</TableCell>
										<TableCell>
											<a
												href={`https://etherscan.io/address/${block.miner}`}
												target="_blank"
												rel="noreferrer"
												title="View address on Etherscan"
												className="text-sky-700 hover:text-sky-900 inline-flex items-center justify-center gap-1"
											>
												<span className="hidden sm:inline">{`${block.miner.slice(
													0,
													8,
												)}…${block.miner.slice(-6)}`}</span>
												<ExternalLink className="size-4" />
											</a>
										</TableCell>
										<TableCell className="font-mono text-sm text-slate-900">
											{block.transactionCount.toLocaleString()}
										</TableCell>
										<TableCell>
											<a
												href={`https://explorer.mendoza.hoodi.arkiv.network/entity/${block.arkivEntityKey}?tab=data`}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center justify-center text-sky-700 hover:text-sky-900 gap-1"
												title="View entity in Arkiv Explorer"
											>
												<span className="hidden sm:inline">{`${block.arkivEntityKey.slice(
													0,
													8,
												)}…${block.arkivEntityKey.slice(-6)}`}</span>
												<ExternalLink className="size-4" />
											</a>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				<div className="md:hidden">
					{isPending ? (
						<BlockListSkeleton />
					) : isError ? (
						<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
							Something went wrong. Please try again later.
						</div>
					) : !data?.length ? (
						<div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-muted-foreground">
							No block data is available yet.
						</div>
					) : (
						<div className="space-y-3">
							{data.map((block) => (
								<article
									key={block.blockHash}
									className="rounded-xl border border-sky-100 bg-white/80 p-4 shadow-sm shadow-sky-100/70"
								>
									<div className="flex flex-col gap-3 text-sm">
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
												Block
											</span>
											<span className="font-semibold text-slate-900">
												#{block.blockNumber}
											</span>
										</div>
										<div className="flex items-start justify-between gap-3">
											<span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
												Timestamp
											</span>
											<span className="text-right text-[0.9rem] text-slate-600">
												{formatTimestamp(block.timestamp)}
											</span>
										</div>
										<div className="flex items-start justify-between gap-3">
											<span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
												Miner
											</span>
											<a
												href={`https://etherscan.io/address/${block.miner}`}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900"
												title="View address on Etherscan"
											>
												<span className="font-mono text-[0.85rem]">
													{formatEntitySnippet(block.miner)}
												</span>
												<ExternalLink className="size-3.5" />
											</a>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
												Tx Count
											</span>
											<span className="font-mono text-base text-slate-900">
												{block.transactionCount.toLocaleString()}
											</span>
										</div>
										<div className="flex items-start justify-between gap-3">
											<span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
												Arkiv Entity
											</span>
											<a
												href={`https://explorer.mendoza.hoodi.arkiv.network/entity/${block.arkivEntityKey}?tab=data`}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900"
												title="View entity in Arkiv Explorer"
											>
												<span className="font-mono text-[0.85rem]">
													{formatEntitySnippet(block.arkivEntityKey)}
												</span>
												<ExternalLink className="size-3.5" />
											</a>
										</div>
									</div>
								</article>
							))}
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter>
				<a
					className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm"
					href="https://ethereum.org/en/developers/docs/blocks/"
					rel="noreferrer"
					target="_blank"
				>
					Learn about Ethereum blocks
					<ArrowUpRight className="size-4" />
				</a>
			</CardFooter>
		</Card>
	);
}
