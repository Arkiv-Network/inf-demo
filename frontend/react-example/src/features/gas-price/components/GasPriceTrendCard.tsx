import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

import { useGasPriceChartData } from "../hooks/useGasPriceChartData";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

type GasPriceTrendCardProps = {
  className?: string;
};

const chartConfig = {
  averageGasPriceGwei: {
    label: "Average Gwei",
    color: "var(--color-chart-1)",
  },
  p95GasPriceGwei: {
    label: "p95 Gwei",
    color: "var(--color-chart-2)",
  },
  minimumGasPriceGwei: {
    label: "Minimum Gwei",
    color: "var(--color-chart-3)",
  },
};

export function GasPriceTrendCard({ className }: GasPriceTrendCardProps) {
  const { data, isPending, isError, error } = useGasPriceChartData("daily");

  return (
    <Card
      className={cn(
        "border-emerald-200/60 bg-white/80 shadow-2xl shadow-emerald-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader className="flex flex-wrap gap-6 sm:flex-nowrap">
        <div className="space-y-1">
          <CardTitle className="text-xl">Gas Price Trends (30 days)</CardTitle>
          <CardDescription>
            Track how base fees evolve daily, including peak and off-peak
            ranges.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading gas price trends...
          </div>
        ) : isError ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load gas price trends."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Gas price data will appear soon.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  dayFormatter.format(new Date(`${value}T00:00:00`))
                }
              />
              <YAxis
                width={72}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value.toFixed(0)} Gwei`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelKey="date"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono text-sm font-semibold">
                          {Number(value).toFixed(2)} Gwei
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="averageGasPriceGwei"
                name="Average Gwei"
                stroke="var(--color-averageGasPriceGwei)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p95GasPriceGwei"
                name="p95 Gwei"
                stroke="var(--color-p95GasPriceGwei)"
                strokeDasharray="6 6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="minimumGasPriceGwei"
                name="Minimum Gwei"
                stroke="var(--color-minimumGasPriceGwei)"
                strokeWidth={2}
                dot={false}
              />
              <ChartLegend
                verticalAlign="top"
                content={<ChartLegendContent className="pt-0" />}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
