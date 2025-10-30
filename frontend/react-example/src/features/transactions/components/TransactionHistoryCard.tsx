import { useCallback } from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { cn } from "@/lib/utils";

import { useTransactionHistory } from "../hooks/useTransactionHistory";

const axisFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

type TransactionHistoryCardProps = {
  className?: string;
};

const chartConfig = {
  transactionCount: {
    label: "Transactions",
    color: "var(--color-chart-1)",
  },
  uniqueAddresses: {
    label: "Unique Addresses",
    color: "var(--color-chart-2)",
  },
};

export function TransactionHistoryCard({
  className,
}: TransactionHistoryCardProps) {
  const { data, isError, error } = useTransactionHistory();
  const handleChartClick = useCallback(
    (chartEvent?: {
      activePayload?: Array<{ payload?: { arkivEntityKey?: string } | null }>;
    }) => {
      if (!chartEvent?.activePayload?.length) {
        return;
      }

      const entityKey = chartEvent.activePayload
        .map((item) => item?.payload?.arkivEntityKey)
        .find((key): key is string => Boolean(key));

      if (!entityKey) {
        return;
      }

      const explorerUrl = `https://explorer.infurademo.hoodi.arkiv.network/entity/${entityKey}?tab=data`;

      window.open(explorerUrl, "_blank", "noopener,noreferrer");
    },
    []
  );

  return (
    <Card
      className={cn(
        "border-sky-200/60 bg-white/80 shadow-2xl shadow-sky-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader className="flex flex-wrap gap-6 sm:flex-nowrap">
        <div className="space-y-1">
          <CardTitle className="text-xl">Transactions (30 days)</CardTitle>
          <CardDescription>
            Daily transaction throughput and unique addresses interacting with
            the network.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load transaction history."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading transaction history...
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <AreaChart
              data={data}
              onClick={handleChartClick}
              style={{
                cursor: "pointer",
              }}
            >
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  axisFormatter.format(new Date(`${value}T00:00:00`))
                }
              />
              <YAxis
                width={72}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => compactNumberFormatter.format(value)}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelKey="date"
                    nameKey="series"
                    labelFormatter={(_, payloadItems) => {
                      const rawDate = payloadItems?.[0]?.payload?.date;

                      if (!rawDate) {
                        return undefined;
                      }

                      return tooltipDateFormatter.format(
                        new Date(`${rawDate}T00:00:00Z`)
                      );
                    }}
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono text-sm font-semibold">
                          {Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="transactionCount"
                name="Transactions"
                type="monotone"
                stroke="var(--color-transactionCount)"
                fill="var(--color-transactionCount)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Area
                dataKey="uniqueAddresses"
                name="Unique Addresses"
                type="monotone"
                stroke="var(--color-uniqueAddresses)"
                fill="var(--color-uniqueAddresses)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <ChartLegend
                verticalAlign="top"
                content={<ChartLegendContent className="pt-0" />}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        {data?.length ? (
          <p className="text-xs italic text-muted-foreground">
            Click any data point to open the entity in Arkiv Explorer.
          </p>
        ) : (
          <span className="rounded bg-slate-200 animate-pulse w-full h-[1em]" />
        )}
      </CardFooter>
    </Card>
  );
}
