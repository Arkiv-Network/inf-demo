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

import { useLatestBlocks } from "../hooks/useLatestBlocks";
import { formatTimestamp } from "../helpers/formatTimestamp";

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

export function LatestBlocksCard({ className }: LatestBlocksCardProps) {
  const { data, isPending, isError, isFetching } = useLatestBlocks();

  return (
    <Card
      className={cn(
        "border-sky-200/70 bg-white/95 shadow-2xl shadow-sky-200/60 backdrop-blur",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Latest Blocks</CardTitle>
            <CardDescription>
              Real-time snapshots of the most recent blocks mined on Ethereum.
              Refreshes every 60 seconds.
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
                <TableRow key={block.blockHash} className="hover:bg-sky-100/40">
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
                        8
                      )}…${block.miner.slice(-6)}`}</span>
                      <ExternalLink className="size-4" />
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-900">
                    {block.transactionCount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://explorer.infurademo.hoodi.arkiv.network/entity/${block.arkivEntityKey}?tab=data`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center text-sky-700 hover:text-sky-900 gap-1"
                      title="View entity in Arkiv Explorer"
                    >
                      <span className="hidden sm:inline">{`${block.arkivEntityKey.slice(
                        0,
                        8
                      )}…${block.arkivEntityKey.slice(-6)}`}</span>
                      <ExternalLink className="size-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
