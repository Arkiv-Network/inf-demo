import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { useGasPriceChartData } from "../hooks/useGasPriceChartData";

const hours = Array.from({ length: 24 }, (_, index) => index);

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function formatHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

type GasPriceHeatmapCardProps = {
  className?: string;
};

export function GasPriceHeatmapCard({ className }: GasPriceHeatmapCardProps) {
  const { data, isPending, isError, error } = useGasPriceChartData("hourly");

  const { days, cellLookup, maxValue, minValue } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        days: [] as string[],
        cellLookup: new Map<string, number>(),
        maxValue: 0,
        minValue: 0,
      };
    }

    const orderedDays = Array.from(new Set(data.map((point) => point.day)));
    const lookup = new Map<string, number>();
    let localMax = Number.NEGATIVE_INFINITY;
    let localMin = Number.POSITIVE_INFINITY;

    for (const point of data) {
      const key = `${point.day}-${point.hour}`;
      lookup.set(key, point.averageGasPriceGwei);
      localMax = Math.max(localMax, point.averageGasPriceGwei);
      localMin = Math.min(localMin, point.averageGasPriceGwei);
    }

    return {
      days: orderedDays,
      cellLookup: lookup,
      maxValue: localMax,
      minValue: localMin,
    };
  }, [data]);

  function getCellValue(day: string, hour: number) {
    return cellLookup.get(`${day}-${hour}`) ?? 0;
  }

  function getCellStyles(value: number) {
    if (maxValue === minValue) {
      return {
        backgroundColor: "hsl(142 65% 88%)",
        color: "hsl(142 40% 25%)",
        borderColor: "hsl(142 45% 80%)",
      };
    }

    const intensity = (value - minValue) / (maxValue - minValue);
    const lightness = 90 - intensity * 48;
    const backgroundColor = `hsl(142 75% ${lightness}%)`;
    const color = intensity > 0.62 ? "white" : "hsl(142 40% 22%)";
    const borderColor = `hsl(142 55% ${78 - intensity * 28}%)`;

    return { backgroundColor, color, borderColor };
  }

  return (
    <Card
      className={cn(
        "border-emerald-200/60 bg-emerald-50/45 shadow-2xl shadow-emerald-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">
              Gas Price Heatmap (7 days)
            </CardTitle>
            <CardDescription>
              Visualize hourly gas price pressure to spot the most affordable
              windows for execution.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Loading hourly gas prices...
          </div>
        ) : isError ? (
          <div className="flex h-80 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load gas price heatmap."}
          </div>
        ) : !days.length ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Gas price heatmap data will appear shortly.
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 text-emerald-700">
              <span>
                Range observed: <strong>{minValue.toFixed(1)}</strong> –
                <strong> {maxValue.toFixed(1)}</strong> Gwei
              </span>
            </div>
            <div className="rounded-3xl border border-emerald-200/70 bg-white/75 p-4 shadow-inner shadow-emerald-100">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-center text-[0.78rem] font-medium text-emerald-800">
                  <thead>
                    <tr>
                      <th className="border-b border-emerald-200/70 pe-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Hour
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="border-b border-emerald-200/70 px-2 pb-2 text-xs font-semibold text-emerald-700"
                        >
                          {dayFormatter.format(new Date(`${day}T00:00:00`))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => (
                      <tr key={hour}>
                        <th className="whitespace-nowrap border-b border-emerald-100/60 pe-3 py-1.5 text-left text-xs font-semibold text-emerald-600">
                          {formatHour(hour)}
                        </th>
                        {days.map((day) => {
                          const value = getCellValue(day, hour);
                          const styles = getCellStyles(value);
                          return (
                            <td
                              key={`${day}-${hour}`}
                              className="border border-emerald-100/70 px-2 py-1.5 transition-colors"
                              style={styles}
                              title={`${dayFormatter.format(
                                new Date(`${day}T00:00:00`)
                              )} at ${formatHour(hour)}: ${value.toFixed(
                                2
                              )} Gwei`}
                            >
                              {value.toFixed(1)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex items-center gap-3 text-[0.7rem] text-emerald-700">
                <span>More affordable</span>
                <div className="h-2 flex-1 rounded-full bg-linear-to-r from-emerald-100 via-emerald-300 to-emerald-600" />
                <span className="font-semibold">More expensive</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
