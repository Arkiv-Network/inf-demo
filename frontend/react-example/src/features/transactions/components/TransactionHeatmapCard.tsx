import { useMemo } from "react";

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

export function TransactionHeatmapCard({
  className,
}: TransactionHeatmapCardProps) {
  const { data, isPending, isError, error } = useTransactionHeatmap();

  const { days, cellLookup, maxValue } = useMemo(() => {
    if (!data?.length) {
      return {
        days: [] as string[],
        cellLookup: new Map<string, number>(),
        maxValue: 0,
      };
    }

    const orderedDays = Array.from(new Set(data.map((point) => point.day)));
    const lookup = new Map<string, number>();
    let max = 0;

    for (const point of data) {
      const key = `${point.day}-${point.hour}`;
      lookup.set(key, point.transactionCount);
      max = Math.max(max, point.transactionCount);
    }

    return { days: orderedDays, cellLookup: lookup, maxValue: max };
  }, [data]);

  function getCellValue(day: string, hour: number) {
    return cellLookup.get(`${day}-${hour}`) ?? 0;
  }

  function getCellStyles(value: number) {
    if (maxValue === 0) {
      return {
        backgroundColor: "hsl(204 100% 94%)",
        color: "hsl(222 47% 11%)",
        borderColor: "hsl(204 70% 85%)",
      };
    }

    const intensity = value / maxValue;
    const lightness = 95 - intensity * 55;
    const backgroundColor = `hsl(204 90% ${lightness}%)`;
    const color = intensity > 0.55 ? "white" : "hsl(222 47% 15%)";
    const borderColor = `hsl(204 80% ${80 - intensity * 28}%)`;

    return { backgroundColor, color, borderColor };
  }

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
              <span>
                Peak throughput: <strong>{maxValue.toLocaleString()}</strong>{" "}
                tx/h
              </span>
            </div>
            <div className="rounded-3xl border border-sky-200/70 bg-white/70 p-4 shadow-inner shadow-sky-100">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-center text-[0.78rem] font-medium text-slate-700">
                  <thead>
                    <tr>
                      <th className="border-b border-sky-200/70 pe-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hour
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="border-b border-sky-200/70 px-2 pb-2 text-xs font-semibold text-slate-600"
                        >
                          {dayFormatter.format(new Date(`${day}T00:00:00`))}
                        </th>
                      ))}
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
                          return (
                            <td
                              key={`${day}-${hour}`}
                              className="border border-sky-100/70 px-2 py-1.5 transition-colors"
                              style={styles}
                              title={`${dayFormatter.format(
                                new Date(`${day}T00:00:00`)
                              )} at ${formatHour(
                                hour
                              )}: ${value.toLocaleString()} transactions`}
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
              <div className="mt-5 flex items-center gap-3 text-[0.7rem] text-slate-600">
                <span>Lower activity</span>
                <div className="h-2 flex-1 rounded-full bg-linear-to-r from-sky-100 via-sky-300 to-sky-600" />
                <span className="font-semibold text-slate-700">
                  Higher activity
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
