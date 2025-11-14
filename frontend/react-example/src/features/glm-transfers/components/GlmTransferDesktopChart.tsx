import { useCallback } from "react";
import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

type GlmTransferDesktopChartProps = {
  data: Array<{
    date?: string;
    timestamp?: number;
    transferCount: number;
    transferVolume: number;
    arkivEntityKey: string;
  }>;
  timeframe: "daily" | "hourly";
};

export function GlmTransferDesktopChart({
  data,
  timeframe,
}: GlmTransferDesktopChartProps) {
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
          width={60}
          axisLine={false}
          tickLine={false}
          tickMargin={4}
          tickFormatter={(value) => compactNumberFormatter.format(value)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          width={60}
          axisLine={false}
          tickLine={false}
          tickMargin={4}
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
                return tooltipDateTimeFormatter.format(new Date(timestamp));
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
  );
}
