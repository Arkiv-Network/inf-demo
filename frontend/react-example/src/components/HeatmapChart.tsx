import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

const hours = Array.from({ length: 24 }, (_, index) => index);

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function formatHourLabel(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

type DaySummary = {
  min: number;
  max: number;
  avg: number;
  hasData: boolean;
};

type CellEntry<TMeta> = {
  value: number;
  datum: HeatmapDatum<TMeta>;
};

export type HeatmapDatum<TMeta = unknown> = {
  day: string;
  hour: number;
  value: number;
  meta?: TMeta;
};

export type HeatmapStyleConfig = {
  emptyCell: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  getCellStyles: (
    value: number,
    context: { minValue: number; maxValue: number; hasAnyData: boolean }
  ) => {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
};

export type HeatmapValueFormatters<TMeta = unknown> = {
  cell: (value: number) => string;
  summaryMin: (value: number) => string;
  summaryMax: (value: number) => string;
  summaryAvg: (value: number) => string;
  tooltip?: (args: {
    value: number;
    day: string;
    hour: number;
    dayLabel: string;
    meta?: TMeta;
  }) => string;
};

export type HeatmapSummaryDisplay = {
  activeDay: string | null;
  activeDayLabel: string;
  hasActiveData: boolean;
  minDisplay: string;
  maxDisplay: string;
  avgDisplay: string;
  overallMinDisplay: string;
  overallMaxDisplay: string;
  hasAnyData: boolean;
};

export type HeatmapCopy = {
  loading: string;
  error: (error: unknown) => string;
  empty: string;
  mobileRangeWithSelection: (summary: HeatmapSummaryDisplay) => ReactNode;
  mobileRangeWithoutSelection: ReactNode;
  desktopRange: (summary: HeatmapSummaryDisplay) => ReactNode;
  mobileHeaderBadge?: (summary: HeatmapSummaryDisplay) => ReactNode;
  mobileFooter?: (summary: HeatmapSummaryDisplay) => ReactNode;
  mobileFooterBadge?:
    | ReactNode
    | ((summary: HeatmapSummaryDisplay) => ReactNode);
};

export type HeatmapLegendConfig = {
  startLabel: string;
  endLabel: string;
};

export type HeatmapTheme = {
  card: string;
  summaryText: string;
  mobileText: string;
  legendText: string;
  legendGradient: string;
  daySelector: {
    base: string;
    active: string;
    inactive: string;
  };
  table: {
    text: string;
    headerBorder: string;
    headerText: string;
    headerLabelText: string;
    hourBorder: string;
    hourText: string;
    cellBorder: string;
  };
  interactiveCell: string;
  interactiveTile: string;
  mobile: {
    section: string;
    badge: string;
    cellHour: string;
    emptySection: string;
  };
};

export type HeatmapChartProps<TMeta = unknown> = {
  className?: string;
  title: string;
  description: string;
  data?: HeatmapDatum<TMeta>[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  copy: HeatmapCopy;
  formatters: HeatmapValueFormatters<TMeta>;
  styleConfig: HeatmapStyleConfig;
  theme: HeatmapTheme;
  legend: HeatmapLegendConfig;
  alwaysShowRange?: boolean;
  daysToShow?: number;
  getCellHref?: (datum: HeatmapDatum<TMeta>) => string | undefined;
  cellLinkTarget?: ComponentPropsWithoutRef<"a">["target"];
  cellLinkRel?: ComponentPropsWithoutRef<"a">["rel"];
};

export function HeatmapChart<TMeta = unknown>({
  className,
  title,
  description,
  data,
  isPending,
  isError,
  error,
  copy,
  formatters,
  styleConfig,
  theme,
  legend,
  alwaysShowRange = false,
  daysToShow = 7,
  getCellHref,
  cellLinkTarget,
  cellLinkRel,
}: HeatmapChartProps<TMeta>) {
  const effectiveTarget = cellLinkTarget ?? "_self";
  const effectiveRel = cellLinkRel;
  const todayKey = new Date().toISOString().slice(0, 10);

  const { days, cellLookup, minValue, maxValue, hasAnyData, daySummaries } =
    useMemo(() => {
      const lookup = new Map<string, CellEntry<TMeta>>();
      let localMin = Number.POSITIVE_INFINITY;
      let localMax = Number.NEGATIVE_INFINITY;
      const summaries = new Map<
        string,
        { min: number; max: number; total: number; count: number }
      >();

      let fixedDays: string[] = [];
      let fixedDaysSet: Set<string> | undefined;

      if (alwaysShowRange) {
        const todayUtc = new Date(`${todayKey}T00:00:00Z`);
        fixedDays = Array.from({ length: daysToShow }, (_, index) => {
          const dayDate = new Date(todayUtc);
          dayDate.setUTCDate(todayUtc.getUTCDate() - (daysToShow - 1 - index));
          return dayDate.toISOString().slice(0, 10);
        });
        fixedDaysSet = new Set(fixedDays);
      }

      if (Array.isArray(data)) {
        for (const point of data) {
          if (fixedDaysSet && !fixedDaysSet.has(point.day)) {
            continue;
          }

          const key = `${point.day}-${point.hour}`;
          lookup.set(key, { value: point.value, datum: point });
          localMin = Math.min(localMin, point.value);
          localMax = Math.max(localMax, point.value);

          const summary = summaries.get(point.day) ?? {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY,
            total: 0,
            count: 0,
          };

          summary.min = Math.min(summary.min, point.value);
          summary.max = Math.max(summary.max, point.value);
          summary.total += point.value;
          summary.count += 1;

          summaries.set(point.day, summary);
        }
      }

      let orderedDays: string[] = [];

      if (fixedDays.length) {
        orderedDays = fixedDays;
      } else if (summaries.size) {
        orderedDays = Array.from(summaries.keys()).sort();
      }

      const hasAnyData = lookup.size > 0;
      const daySummaries: Record<string, DaySummary> = Object.fromEntries(
        orderedDays.map((day) => {
          const summary = summaries.get(day);
          if (!summary) {
            return [day, { min: 0, max: 0, avg: 0, hasData: false }];
          }
          return [
            day,
            {
              min: summary.min === Number.POSITIVE_INFINITY ? 0 : summary.min,
              max: summary.max === Number.NEGATIVE_INFINITY ? 0 : summary.max,
              avg: summary.count ? summary.total / summary.count : 0,
              hasData: summary.count > 0,
            },
          ];
        })
      );

      return {
        days: orderedDays,
        cellLookup: lookup,
        minValue: hasAnyData ? localMin : 0,
        maxValue: hasAnyData ? localMax : 0,
        hasAnyData,
        daySummaries,
      };
    }, [alwaysShowRange, data, daysToShow, todayKey]);

  const hasInitialData = Array.isArray(data) && data.length > 0;
  const showError = isError;
  const showLoading = !showError && (isPending || !hasInitialData);
  const showEmpty = !showError && !showLoading && !days.length;

  const loadingDays = useMemo(() => {
    if (days.length) {
      return days;
    }
    const todayUtc = new Date(`${todayKey}T00:00:00Z`);
    return Array.from({ length: daysToShow }, (_, index) => {
      const dayDate = new Date(todayUtc);
      dayDate.setUTCDate(todayUtc.getUTCDate() - (daysToShow - 1 - index));
      return dayDate.toISOString().slice(0, 10);
    });
  }, [days, daysToShow, todayKey]);

  const renderedDays = showLoading ? loadingDays : days;

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

  function getCellEntry(day: string, hour: number) {
    return cellLookup.get(`${day}-${hour}`);
  }

  function resolveCellStyles(entry?: CellEntry<TMeta>) {
    if (!entry) {
      return styleConfig.emptyCell;
    }

    return styleConfig.getCellStyles(entry.value, {
      minValue,
      maxValue,
      hasAnyData,
    });
  }

  const summaryDisplay: HeatmapSummaryDisplay = {
    activeDay,
    activeDayLabel,
    hasActiveData: activeSummary?.hasData ?? false,
    minDisplay:
      activeSummary?.hasData && Number.isFinite(activeSummary.min)
        ? formatters.summaryMin(activeSummary.min)
        : "--",
    maxDisplay:
      activeSummary?.hasData && Number.isFinite(activeSummary.max)
        ? formatters.summaryMax(activeSummary.max)
        : "--",
    avgDisplay:
      activeSummary?.hasData && Number.isFinite(activeSummary.avg)
        ? formatters.summaryAvg(activeSummary.avg)
        : "--",
    overallMinDisplay:
      hasAnyData && Number.isFinite(minValue)
        ? formatters.summaryMin(minValue)
        : "--",
    overallMaxDisplay:
      hasAnyData && Number.isFinite(maxValue)
        ? formatters.summaryMax(maxValue)
        : "--",
    hasAnyData,
  };

  const mobileFooterBadge =
    typeof copy.mobileFooterBadge === "function"
      ? copy.mobileFooterBadge(summaryDisplay)
      : copy.mobileFooterBadge;

  return (
    <Card className={cn(theme.card, className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showError ? (
          <div className="flex h-80 items-center justify-center text-sm text-destructive">
            {copy.error(error)}
          </div>
        ) : showEmpty ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3",
                theme.summaryText
              )}
            >
              <span className="md:hidden">
                {summaryDisplay.activeDay
                  ? copy.mobileRangeWithSelection(summaryDisplay)
                  : copy.mobileRangeWithoutSelection}
              </span>
              <span className="hidden md:inline">
                {copy.desktopRange(summaryDisplay)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 md:hidden">
              {renderedDays.map((day) => {
                const label = dayFormatter.format(new Date(`${day}T00:00:00`));
                const isActive = !showLoading && day === activeDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (!showLoading) {
                        setSelectedDay(day);
                      }
                    }}
                    disabled={showLoading}
                    aria-disabled={showLoading}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      theme.daySelector.base,
                      isActive
                        ? theme.daySelector.active
                        : theme.daySelector.inactive,
                      showLoading && "pointer-events-none opacity-70"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block">
              <div className="overflow-x-visible">
                <table
                  className={cn(
                    "w-full border-separate border-spacing-0 text-center text-[0.78rem] font-medium",
                    theme.table.text
                  )}
                >
                  <thead>
                    <tr>
                      <th
                        className={cn(
                          "border-b pe-3 pb-2 text-left text-xs font-semibold uppercase tracking-wide",
                          theme.table.headerBorder,
                          theme.table.headerLabelText
                        )}
                      >
                        Hour
                      </th>
                      {renderedDays.map((day) => {
                        const label = dayFormatter.format(
                          new Date(`${day}T00:00:00`)
                        );
                        return (
                          <th
                            key={day}
                            className={cn(
                              "border-b px-2 pb-2 text-xs font-semibold",
                              theme.table.headerBorder,
                              theme.table.headerText
                            )}
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
                        <th
                          className={cn(
                            "whitespace-nowrap border-b pe-3 py-1.5 text-left text-xs font-semibold",
                            theme.table.hourBorder,
                            theme.table.hourText
                          )}
                        >
                          {formatHourLabel(hour)}
                        </th>
                        {renderedDays.map((day) => {
                          const entry = getCellEntry(day, hour);
                          const styles = resolveCellStyles(entry);
                          const dayLabel = dayFormatter.format(
                            new Date(`${day}T00:00:00`)
                          );
                          const tooltip =
                            !showLoading && entry && formatters.tooltip
                              ? formatters.tooltip({
                                  value: entry.value,
                                  day,
                                  hour,
                                  dayLabel,
                                  meta: entry.datum.meta,
                                })
                              : undefined;
                          const href =
                            !showLoading && entry
                              ? getCellHref?.(entry.datum)
                              : undefined;
                          const cellValue = entry
                            ? formatters.cell(entry.value)
                            : "";
                          const cellContent = showLoading ? (
                            <div className="px-2 py-1.5">
                              <div className="flex items-center justify-center relative">
                                <span className="inset-0 absolute bg-slate-200 animate-pulse rounded" />
                                <span className="opacity-0" aria-hidden="true">
                                  00.00
                                </span>
                              </div>
                            </div>
                          ) : href ? (
                            <a
                              href={href}
                              target={effectiveTarget}
                              rel={effectiveRel}
                              className={cn(
                                "block h-full w-full px-2 py-1.5",
                                theme.interactiveCell
                              )}
                            >
                              {cellValue}
                            </a>
                          ) : (
                            <div className="px-2 py-1.5">{cellValue}</div>
                          );

                          return (
                            <td
                              key={`${day}-${hour}`}
                              className={cn(
                                "border",
                                theme.table.cellBorder,
                                href
                                  ? "hover:scale-105 hover:brightness-105 transition-transform"
                                  : ""
                              )}
                              style={{
                                backgroundColor: styles.backgroundColor,
                                borderColor: styles.borderColor,
                                color: styles.color,
                              }}
                              title={tooltip}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={cn("md:hidden space-y-3", theme.mobileText)}>
              {(() => {
                const mobileDay = showLoading
                  ? renderedDays[renderedDays.length - 1] ?? null
                  : activeDay;
                if (!mobileDay) {
                  return (
                    <div className={theme.mobile.emptySection}>
                      {copy.mobileRangeWithoutSelection}
                    </div>
                  );
                }

                const mobileDayLabel = dayFormatter.format(
                  new Date(`${mobileDay}T00:00:00`)
                );

                return (
                  <section className={theme.mobile.section}>
                    <header className="flex items-center justify-between text-[0.85rem] font-semibold">
                      <span>{mobileDayLabel}</span>
                      {copy.mobileHeaderBadge ? (
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            theme.mobile.badge,
                            showLoading && "animate-pulse"
                          )}
                        >
                          {copy.mobileHeaderBadge(summaryDisplay)}
                        </span>
                      ) : null}
                    </header>
                    <div className="mt-3">
                      <div className="grid grid-cols-3 gap-1 text-[0.75rem] font-semibold">
                        {hours.map((hour) => {
                          const entry = getCellEntry(mobileDay, hour);
                          const styles = resolveCellStyles(entry);
                          const tooltip =
                            !showLoading && entry && formatters.tooltip
                              ? formatters.tooltip({
                                  value: entry.value,
                                  day: mobileDay,
                                  hour,
                                  dayLabel: mobileDayLabel,
                                  meta: entry.datum.meta,
                                })
                              : undefined;
                          const href =
                            !showLoading && entry
                              ? getCellHref?.(entry.datum)
                              : undefined;
                          const cellValue = entry
                            ? formatters.cell(entry.value)
                            : "";

                          if (showLoading) {
                            return (
                              <div
                                key={`${mobileDay}-${hour}`}
                                className="flex h-16 flex-col items-center justify-center gap-2 rounded border px-1 text-center"
                                style={{
                                  backgroundColor: styles.backgroundColor,
                                  borderColor: styles.borderColor,
                                  color: styles.color,
                                }}
                              >
                                <span className="block h-4 w-16 rounded bg-slate-200 animate-pulse" />
                                <span
                                  className={cn(
                                    "text-[0.6rem] font-medium uppercase tracking-wide",
                                    theme.mobile.cellHour
                                  )}
                                >
                                  <span className="block h-3 w-12 rounded bg-slate-200 animate-pulse" />
                                  <span className="sr-only">
                                    {copy.loading}
                                  </span>
                                </span>
                              </div>
                            );
                          }

                          if (href) {
                            return (
                              <a
                                key={`${mobileDay}-${hour}`}
                                href={href}
                                target={effectiveTarget}
                                rel={effectiveRel}
                                className={cn(
                                  "flex h-16 flex-col items-center justify-center gap-1 rounded border px-1 text-center",
                                  theme.interactiveTile
                                )}
                                style={{
                                  backgroundColor: styles.backgroundColor,
                                  borderColor: styles.borderColor,
                                  color: styles.color,
                                }}
                                title={tooltip}
                              >
                                <span className="leading-none">
                                  {cellValue}
                                </span>
                                <span
                                  className={cn(
                                    "text-[0.6rem] font-medium uppercase tracking-wide",
                                    theme.mobile.cellHour
                                  )}
                                >
                                  {formatHourLabel(hour)}
                                </span>
                              </a>
                            );
                          }

                          return (
                            <div
                              key={`${mobileDay}-${hour}`}
                              className="flex h-16 flex-col items-center justify-center gap-1 rounded border px-1 text-center"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                borderColor: styles.borderColor,
                                color: styles.color,
                              }}
                              title={tooltip}
                            >
                              <span className="leading-none">{cellValue}</span>
                              <span
                                className={cn(
                                  "text-[0.6rem] font-medium uppercase tracking-wide",
                                  theme.mobile.cellHour
                                )}
                              >
                                {formatHourLabel(hour)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {(copy.mobileFooter || mobileFooterBadge) && (
                      <footer className="mt-3 flex items-center justify-between text-[0.7rem]">
                        <span>
                          {copy.mobileFooter
                            ? copy.mobileFooter(summaryDisplay)
                            : null}
                        </span>
                        {mobileFooterBadge ? (
                          <span
                            className={cn(
                              "uppercase tracking-wide",
                              theme.mobile.badge,
                              showLoading && "animate-pulse"
                            )}
                          >
                            {mobileFooterBadge}
                          </span>
                        ) : null}
                      </footer>
                    )}
                  </section>
                );
              })()}
            </div>
            <div
              className={cn(
                "mt-5 flex items-center gap-3 text-[0.7rem]",
                theme.legendText
              )}
            >
              <span>{legend.startLabel}</span>
              <div
                className={cn("h-2 flex-1 rounded-full", theme.legendGradient)}
              />
              <span className="font-semibold">{legend.endLabel}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
