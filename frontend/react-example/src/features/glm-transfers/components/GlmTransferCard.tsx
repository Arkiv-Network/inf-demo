import { useCallback, useState } from "react";

import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";

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
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { useGlmTransferData } from "../hooks/useGlmTransferData";
import { ButtonGroup } from "@/components/ui/button-group";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const hourFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
});

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const tooltipDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

type GlmTransferCardProps = {
  className?: string;
};

const chartConfig = {
  transferCount: {
    label: "Transfer Count",
    color: "var(--color-chart-2)",
  },
  transferVolume: {
    label: "Transfer Volume (GLM)",
    color: "var(--color-chart-1)",
  },
};

export function GlmTransferCard({ className }: GlmTransferCardProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "hourly">("hourly");
  const dailyData = useGlmTransferData("daily");
  const hourlyData = useGlmTransferData("hourly");

  const { data, isError, error } =
    timeframe === "daily" ? dailyData : hourlyData;

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

  const timeframeLabel = timeframe === "daily" ? "30 days" : "7 days";

  return (
    <Card
      className={cn(
        "border-purple-200/60 bg-white/80 shadow-2xl shadow-purple-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">
            GLM Token Transfers ({timeframeLabel})
          </CardTitle>
          <CardDescription>
            GLM {timeframe} transfer activity: number of transfers and total
            volume.
          </CardDescription>
        </div>
        <ButtonGroup>
          <Button
            variant={timeframe === "hourly" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("hourly")}
          >
            Hourly
          </Button>
          <Button
            variant={timeframe === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("daily")}
          >
            Daily
          </Button>
        </ButtonGroup>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load GLM transfer data."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading GLM transfer data...
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <ComposedChart
              data={data}
              onClick={handleChartClick}
              style={{
                cursor: "pointer",
              }}
            >
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey={timeframe === "daily" ? "date" : "timestamp"}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (timeframe === "daily") {
                    return dayFormatter.format(new Date(`${value}T00:00:00`));
                  }
                  return hourFormatter.format(new Date(value));
                }}
              />
              <YAxis
                yAxisId="left"
                width={72}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => compactNumberFormatter.format(value)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                width={72}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => compactNumberFormatter.format(value)}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelKey={timeframe === "daily" ? "date" : "timestamp"}
                    nameKey="series"
                    labelFormatter={(_, payloadItems) => {
                      if (timeframe === "daily") {
                        const rawDate = payloadItems?.[0]?.payload?.date;
                        if (!rawDate) return undefined;
                        return tooltipDateFormatter.format(
                          new Date(`${rawDate}T00:00:00Z`)
                        );
                      }
                      const timestamp = payloadItems?.[0]?.payload?.timestamp;
                      if (!timestamp) return undefined;
                      return tooltipDateTimeFormatter.format(
                        new Date(timestamp)
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
              <Bar
                yAxisId="left"
                dataKey="transferCount"
                name="Transfer Count"
                fill="var(--color-transferCount)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                dataKey="transferVolume"
                name="Transfer Volume (GLM)"
                type="monotone"
                stroke="var(--color-transferVolume)"
                strokeWidth={2}
                dot={false}
              />
              <ChartLegend
                verticalAlign="top"
                content={<ChartLegendContent className="pt-0" />}
              />
            </ComposedChart>
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
