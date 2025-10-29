import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { useTransactionHeatmap } from "../hooks/useTransactionHeatmap";

const hours = Array.from({ length: 24 }, (_, index) => index);

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function formatHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

type TransactionHeatmapCardProps = {
  className?: string;
};

type DaySummary = {
  min: number;
  max: number;
  avg: number;
};

export function TransactionHeatmapCard({
  className,
}: TransactionHeatmapCardProps) {
  const { data, isPending, isError, error } = useTransactionHeatmap();

  const { days, cellLookup, maxValue, minValue, daySummaries } = useMemo(() => {
    if (!data?.length) {
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
    let max = 0;
    let min = Number.POSITIVE_INFINITY;
    const summaries = new Map<
      string,
      { min: number; max: number; total: number; count: number }
    >();

    for (const point of data) {
      const key = `${point.day}-${point.hour}`;
      lookup.set(key, point.transactionCount);
      max = Math.max(max, point.transactionCount);
      min = Math.min(min, point.transactionCount);

      const summary = summaries.get(point.day) ?? {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        total: 0,
        count: 0,
      };

      summary.min = Math.min(summary.min, point.transactionCount);
      summary.max = Math.max(summary.max, point.transactionCount);
      summary.total += point.transactionCount;
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
      maxValue: max,
      minValue: min === Number.POSITIVE_INFINITY ? 0 : min,
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
    if (maxValue === 0) {
      return {
        backgroundColor: "hsl(204 100% 94%)",
        color: "hsl(204 60% 35%)",
        borderColor: "hsl(204 70% 85%)",
      };
    }

    const intensity = value / maxValue;
    const lightness = 95 - intensity * 55;
    const backgroundColor = `hsl(204 90% ${lightness}%)`;
    const colorLightness = Math.max(25, 35 - intensity * 10);
    const color = `hsl(204 ${60 + intensity * 20}% ${colorLightness}%)`;
    const borderColor = `hsl(204 80% ${80 - intensity * 28}%)`;

    return { backgroundColor, color, borderColor };
  }

  const minDisplay = activeSummary ? activeSummary.min.toLocaleString() : "--";
  const maxDisplay = activeSummary ? activeSummary.max.toLocaleString() : "--";
  const avgDisplay = activeSummary
    ? Math.round(activeSummary.avg).toLocaleString()
    : "--";
  const overallMinDisplay = minValue.toLocaleString();
  const overallMaxDisplay = maxValue.toLocaleString();

  return (
    <Card
      className={cn(
        "border-sky-200/60 bg-sky-50/40 shadow-2xl shadow-sky-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">
              Transactions Heatmap (7 days)
            </CardTitle>
            <CardDescription>
              Hourly transaction density helps surface congestion windows and
              quiet periods.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Loading hourly breakdown...
          </div>
        ) : isError ? (
          <div className="flex h-80 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load heatmap data."}
          </div>
        ) : !days.length ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Heatmap data will appear once transactions are recorded.
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600">
              <span className="md:hidden">
                {activeDay ? (
                  <>
                    Hourly throughput for <strong>{activeDayLabel}</strong>:{" "}
                    <strong>{minDisplay}</strong> –{" "}
                    <strong>{maxDisplay}</strong> tx/h
                  </>
                ) : (
                  "Select a day to inspect hourly throughput."
                )}
              </span>
              <span className="hidden md:inline">
                Weekly hourly range: <strong>{overallMinDisplay}</strong> –{" "}
                <strong>{overallMaxDisplay}</strong> tx/h
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
                      "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2",
                      isActive
                        ? "border-sky-500 bg-sky-600 text-white shadow"
                        : "border-sky-200 bg-white/75 text-sky-700 hover:bg-sky-50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-center text-[0.78rem] font-medium text-slate-700">
                  <thead>
                    <tr>
                      <th className="border-b border-sky-200/70 pe-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hour
                      </th>
                      {days.map((day) => {
                        const label = dayFormatter.format(
                          new Date(`${day}T00:00:00`)
                        );
                        return (
                          <th
                            key={day}
                            className="border-b border-sky-200/70 px-2 pb-2 text-xs font-semibold text-slate-600"
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
                        <th className="whitespace-nowrap border-b border-sky-100/60 pe-3 py-1.5 text-left text-xs font-semibold text-slate-500">
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
                              className="border border-sky-100/70 px-2 py-1.5 transition-colors"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                borderColor: styles.borderColor,
                                color: styles.color,
                              }}
                              title={`${dayLabel} at ${formatHour(
                                hour
                              )}: ${value.toLocaleString()} tx`}
                            >
                              {value.toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:hidden space-y-3 text-sm text-slate-700">
              {activeDay ? (
                <section className="rounded-xl border border-sky-100 bg-white/75 p-4 shadow-sm shadow-sky-100/70">
                  <header className="flex items-center justify-between text-[0.85rem] font-semibold">
                    <span>{activeDayLabel}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      {minDisplay} – {maxDisplay} tx
                    </span>
                  </header>
                  <div className="mt-3">
                    <div className="grid grid-cols-3 gap-1 text-[0.75rem] font-semibold ">
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
                            )}: ${value.toLocaleString()} tx`}
                          >
                            <span className="leading-none">
                              {value.toLocaleString()}
                            </span>
                            <span className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-600/80">
                              {formatHour(hour)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <footer className="mt-3 flex items-center justify-between text-[0.7rem] text-slate-600">
                    <span>Avg {avgDisplay} tx</span>
                    <span className="uppercase tracking-wide text-sky-600">
                      24 hrs
                    </span>
                  </footer>
                </section>
              ) : (
                <div className="rounded-xl border border-sky-100 bg-white/75 p-4 text-sm text-slate-600">
                  Select a day to view hourly data.
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3 text-[0.7rem] text-slate-600">
              <span>Lower activity</span>
              <div className="h-2 flex-1 rounded-full bg-linear-to-r from-sky-100 via-sky-300 to-sky-600" />
              <span className="font-semibold text-slate-700">
                Higher activity
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
