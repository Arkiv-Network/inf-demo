import { ArrowUpRight } from "lucide-react";

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

export function LatestBlocksCard({ className }: LatestBlocksCardProps) {
  const { data, isPending, isError, error } = useLatestBlocks();

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
            </CardDescription>
          </div>
          <span className="rounded-full bg-sky-200/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-900">
            Live feed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Fetching the latest blocks...
          </div>
        ) : isError ? (
          <div className="flex h-48 items-center justify-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Unable to load blocks."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No block data is available yet.
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-sky-100/70 text-sky-900">
                <TableHead>Block</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Miner</TableHead>
                <TableHead className="text-right">Tx Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((block) => (
                <TableRow key={block.hash} className="hover:bg-sky-100/40">
                  <TableCell className="font-semibold text-slate-900">
                    #{block.number.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {formatTimestamp(block.timestamp)}
                  </TableCell>
                  <TableCell>
                    <code className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900">
                      {`${block.miner.slice(0, 8)}…${block.miner.slice(-6)}`}
                    </code>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-slate-900">
                    {block.transactionCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
