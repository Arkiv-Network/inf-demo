import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
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
  const { data, isPending, isError, error } = useTransactionHistory();

  const totals = useMemo(() => {
    if (!data?.length) {
      return { totalTransactions: 0, avgGasPrice: 0 };
    }

    const totalTransactions = data.reduce(
      (sum, point) => sum + point.transactionCount,
      0
    );
    const avgGasPrice =
      data.reduce((sum, point) => sum + point.averageGasPriceGwei, 0) /
      data.length;

    return {
      totalTransactions,
      avgGasPrice,
    };
  }, [data]);

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
        {isPending ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading transaction history...
          </div>
        ) : isError ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load transaction history."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No transaction data is available yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <AreaChart data={data}>
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
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between">
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
    </Card>
  );
}
