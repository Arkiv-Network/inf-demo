import { useEffect, useMemo, useState } from "react";

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

type DaySummary = {
  min: number;
  max: number;
  avg: number;
};

export function GasPriceHeatmapCard({ className }: GasPriceHeatmapCardProps) {
  const { data, isPending, isError, error } = useGasPriceChartData("hourly");

  const { days, cellLookup, maxValue, minValue, daySummaries } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        days: [] as string[],
        cellLookup: new Map<string, number>(),
        maxValue: 0,
        minValue: 0,
        daySummaries: {} as Record<string, DaySummary>,
      };
    }

    const orderedDays = Array.from(new Set(data.map((point) => point.day)));
    const lookup = new Map<string, number>();
    let localMax = Number.NEGATIVE_INFINITY;
    let localMin = Number.POSITIVE_INFINITY;
    const summaries = new Map<
      string,
      { min: number; max: number; total: number; count: number }
    >();

    for (const point of data) {
      const key = `${point.day}-${point.hour}`;
      lookup.set(key, point.averageGasPriceGwei);
      localMax = Math.max(localMax, point.averageGasPriceGwei);
      localMin = Math.min(localMin, point.averageGasPriceGwei);

      const summary = summaries.get(point.day) ?? {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        total: 0,
        count: 0,
      };

      summary.min = Math.min(summary.min, point.averageGasPriceGwei);
      summary.max = Math.max(summary.max, point.averageGasPriceGwei);
      summary.total += point.averageGasPriceGwei;
      summary.count += 1;

      summaries.set(point.day, summary);
    }

    const daySummaries: Record<string, DaySummary> = Object.fromEntries(
      orderedDays.map((day) => {
        const summary = summaries.get(day);
        if (!summary) {
          return [day, { min: 0, max: 0, avg: 0 }];
        }
        return [
          day,
          {
            min: summary.min === Number.POSITIVE_INFINITY ? 0 : summary.min,
            max: summary.max === Number.NEGATIVE_INFINITY ? 0 : summary.max,
            avg: summary.count ? summary.total / summary.count : 0,
          },
        ];
      })
    );

    return {
      days: orderedDays,
      cellLookup: lookup,
      maxValue: localMax,
      minValue: localMin,
      daySummaries,
    };
  }, [data]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!days.length) {
      setSelectedDay(null);
      return;
    }

    const fallbackDay = days[days.length - 1] ?? null;

    setSelectedDay((current) =>
      current && fallbackDay && days.includes(current) ? current : fallbackDay
    );
  }, [days]);

  const activeDay =
    selectedDay && days.includes(selectedDay)
      ? selectedDay
      : days[days.length - 1] ?? null;
  const activeSummary = activeDay ? daySummaries[activeDay] : undefined;
  const activeDayLabel = activeDay
    ? dayFormatter.format(new Date(`${activeDay}T00:00:00`))
    : "";

  function getCellValue(day: string, hour: number) {
    return cellLookup.get(`${day}-${hour}`) ?? 0;
  }

  function getCellStyles(value: number) {
    if (maxValue === minValue) {
      return {
        backgroundColor: "hsl(142 65% 88%)",
        color: "hsl(142 50% 30%)",
        borderColor: "hsl(142 45% 80%)",
      };
    }

    const intensity = (value - minValue) / (maxValue - minValue);
    const lightness = 90 - intensity * 48;
    const backgroundColor = `hsl(142 75% ${lightness}%)`;
    const colorLightness = Math.max(22, 30 - intensity * 8);
    const color = `hsl(142 ${50 + intensity * 25}% ${colorLightness}%)`;
    const borderColor = `hsl(142 55% ${78 - intensity * 28}%)`;

    return { backgroundColor, color, borderColor };
  }

  const minDisplay = activeSummary ? activeSummary.min.toFixed(1) : "--";
  const maxDisplay = activeSummary ? activeSummary.max.toFixed(1) : "--";
  const avgDisplay = activeSummary ? activeSummary.avg.toFixed(1) : "--";
  const overallMinDisplay = Number.isFinite(minValue)
    ? minValue.toFixed(1)
    : "--";
  const overallMaxDisplay = Number.isFinite(maxValue)
    ? maxValue.toFixed(1)
    : "--";

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
              <span className="md:hidden">
                {activeDay ? (
                  <>
                    Hourly range for <strong>{activeDayLabel}</strong>:{" "}
                    <strong>{minDisplay}</strong> –{" "}
                    <strong>{maxDisplay}</strong> Gwei
                  </>
                ) : (
                  "Select a day to view hourly gas prices."
                )}
              </span>
              <span className="hidden md:inline">
                Weekly hourly range: <strong>{overallMinDisplay}</strong> –{" "}
                <strong>{overallMaxDisplay}</strong> Gwei
              </span>
            </div>
            <div className="flex flex-wrap gap-2 md:hidden">
              {days.map((day) => {
                const label = dayFormatter.format(new Date(`${day}T00:00:00`));
                const isActive = day === activeDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2",
                      isActive
                        ? "border-emerald-500 bg-emerald-600 text-white shadow"
                        : "border-emerald-200 bg-white/70 text-emerald-700 hover:bg-emerald-50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-center text-[0.78rem] font-medium text-emerald-800">
                  <thead>
                    <tr>
                      <th className="border-b border-emerald-200/70 pe-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Hour
                      </th>
                      {days.map((day) => {
                        const label = dayFormatter.format(
                          new Date(`${day}T00:00:00`)
                        );
                        return (
                          <th
                            key={day}
                            className="border-b border-emerald-200/70 px-2 pb-2 text-xs font-semibold text-emerald-700"
                          >
                            {label}
                          </th>
                        );
                      })}
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
                          const dayLabel = dayFormatter.format(
                            new Date(`${day}T00:00:00`)
                          );
                          return (
                            <td
                              key={`${day}-${hour}`}
                              className="border border-emerald-100/70 px-2 py-1.5 transition-colors"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                borderColor: styles.borderColor,
                                color: styles.color,
                              }}
                              title={`${dayLabel} at ${formatHour(
                                hour
                              )}: ${value.toFixed(2)} Gwei`}
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
            </div>
            <div className="md:hidden space-y-3 text-sm text-emerald-800">
              {activeDay ? (
                <section className="rounded-xl border border-emerald-100 bg-white/70 p-4 shadow-sm shadow-emerald-100/70">
                  <header className="flex items-center justify-between text-[0.85rem] font-semibold">
                    <span>{activeDayLabel}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      {minDisplay} – {maxDisplay} Gwei
                    </span>
                  </header>
                  <div className="mt-3">
                    <div className="grid grid-cols-3 gap-1 text-[0.75rem] font-semibold">
                      {hours.map((hour) => {
                        const value = getCellValue(activeDay, hour);
                        const styles = getCellStyles(value);
                        return (
                          <div
                            key={`${activeDay}-${hour}`}
                            className="flex h-16 flex-col items-center justify-center gap-1 rounded border px-1 text-center"
                            style={{
                              backgroundColor: styles.backgroundColor,
                              borderColor: styles.borderColor,
                              color: styles.color,
                            }}
                            title={`${activeDayLabel} at ${formatHour(
                              hour
                            )}: ${value.toFixed(2)} Gwei`}
                          >
                            <span className="leading-none">
                              {value.toFixed(1)}
                            </span>
                            <span className="text-[0.6rem] font-medium uppercase tracking-wide text-emerald-700/70">
                              {formatHour(hour)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <footer className="mt-3 flex items-center justify-between text-[0.7rem] text-emerald-700">
                    <span>Avg {avgDisplay} Gwei</span>
                    <span className="uppercase tracking-wide text-emerald-600">
                      24 hrs
                    </span>
                  </footer>
                </section>
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-white/70 p-4 text-sm text-emerald-700">
                  Select a day to view hourly data.
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3 text-[0.7rem] text-emerald-700">
              <span>More affordable</span>
              <div className="h-2 flex-1 rounded-full bg-linear-to-r from-emerald-100 via-emerald-300 to-emerald-600" />
              <span className="font-semibold">More expensive</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
