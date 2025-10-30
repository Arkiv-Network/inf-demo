import { useMemo, useState } from "react";
import { AlertCircle, ChevronRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

import { useBlockDetails } from "../hooks/useBlockDetails";

import type { FormEvent } from "react";
import * as z from "zod/v4";

type BlockSearchCardProps = {
  className?: string;
};

type FieldDescriptor = {
  label: string;
  value: string | number;
  linkTo?: string;
};

const BlockNumberStringSchema = z.string().refine((val) => {
  const parsed = Number(val);
  return (
    !Number.isNaN(parsed) &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    val.trim() !== ""
  );
}, "Invalid block number");

export function BlockSearchCard({ className }: BlockSearchCardProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchNumber, setSearchNumber] = useState<string | null>("23690320");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isPending, isError, error } = useBlockDetails(searchNumber);

  const details = useMemo(() => {
    if (!data) {
      return [];
    }

    const items: FieldDescriptor[] = [
      { label: "Timestamp", value: String(data.timestamp) },
      {
        label: "Miner",
        value: `${data.miner.slice(0, 8)}…${data.miner.slice(-6)}`,
        linkTo: `https://etherscan.io/address/${data.miner}`,
      },
      {
        label: "Base Fee (Gwei)",
        value: Number(data.baseFeePerGas) / 1_000_000_000, // wei -> gwei
      },
      {
        label: "Gas Used",
        value: Number(data.gasUsed).toLocaleString(),
      },
      {
        label: "Tx Count",
        value: data.transactionCount.toLocaleString(),
      },
      {
        label: "Size",
        value: `${(Number(data.size) / 1024).toFixed(1)} KB`,
      },
      {
        label: "Parent Hash",
        value: `${data.parentHash.slice(0, 8)}…${data.parentHash.slice(-6)}`,
      },
      {
        label: "Arkiv Entity",
        value: `${data.arkivEntityKey.slice(0, 8)}…${data.arkivEntityKey.slice(
          -6
        )}`,
        linkTo: `https://explorer.infurademo.hoodi.arkiv.network/entity/${data.arkivEntityKey}?tab=data`,
      },
    ];

    return items;
  }, [data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setFormError("Please enter a block number");
      setSearchNumber(null);
      return;
    }

    const parseResult = BlockNumberStringSchema.safeParse(trimmed);
    if (parseResult.success) {
      setSearchNumber(parseResult.data);
    } else {
      setFormError(
        parseResult.error.issues[0]?.message || "Invalid block number"
      );
      setSearchNumber(null);
    }
  }

  return (
    <Card
      className={cn(
        "border-violet-200/70 bg-white/95 shadow-2xl shadow-violet-200/60 backdrop-blur",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Block Explorer</CardTitle>
            <CardDescription>
              Search for Ethereum block details by block number.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={handleSubmit}
          role="search"
        >
          <div className="flex flex-col w-full ">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Block number"
                inputMode="numeric"
                className="border-violet-200/70 bg-white/80"
                placeholder="Enter block number"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
              <Button type="submit" className="shrink-0">
                Search
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {formError && (
              <p className="mt-1 text-sm text-destructive">{formError}</p>
            )}
          </div>
        </form>
        <div className="mt-6 space-y-4">
          {!searchNumber ? null : isPending ? (
            <div className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">
              Looking up block details...
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              <span>
                {error instanceof Error
                  ? error.message
                  : "We could not find that block."}
              </span>
            </div>
          ) : data ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">Block Number</span>
                <span className="font-mono text-lg font-semibold">
                  #{data.blockNumber.toLocaleString()}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                {details.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-violet-100/80 bg-white/80 px-3 py-2"
                  >
                    <dt className="text-muted-foreground mb-1 uppercase tracking-wide">
                      {item.label}
                    </dt>
                    <dd className="font-medium text-sm break-all text-slate-900">
                      {item.linkTo ? (
                        <a
                          href={item.linkTo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-700 hover:text-sky-900 inline-flex items-center justify-center gap-1"
                        >
                          {item.value}
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">
              Enter a block number to see full details.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
