import { useMemo } from "react";

import {
  HeatmapChart,
  type HeatmapCopy,
  type HeatmapDatum,
  type HeatmapStyleConfig,
  type HeatmapTheme,
  type HeatmapValueFormatters,
} from "@/components/HeatmapChart";

import { useGasPriceChartData } from "../hooks/useGasPriceChartData";

type GasPriceHeatmapCardProps = {
  className?: string;
};
type GasHeatmapMeta = {
  arkivEntityKey?: string;
};

const GAS_HEATMAP_THEME: HeatmapTheme = {
  card: "border-emerald-200/60 bg-emerald-50/45 shadow-2xl shadow-emerald-200/70 backdrop-blur",
  summaryText: "text-emerald-700",
  mobileText: "text-sm text-emerald-800",
  legendText: "text-emerald-700",
  legendGradient:
    "bg-linear-to-r from-emerald-100 via-emerald-300 to-emerald-600",
  daySelector: {
    base: "focus-visible:ring-emerald-500/60",
    active: "border-emerald-500 bg-emerald-600 text-white shadow",
    inactive:
      "border-emerald-200 bg-white/70 text-emerald-700 hover:bg-emerald-50",
  },
  table: {
    text: "text-emerald-800",
    headerBorder: "border-emerald-200/70",
    headerText: "text-emerald-700",
    headerLabelText: "text-emerald-600",
    hourBorder: "border-emerald-100/60",
    hourText: "text-emerald-600",
    cellBorder: "border-emerald-100/70",
  },
  interactiveCell:
    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1",
  interactiveTile:
    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2",
  mobile: {
    section:
      "rounded-xl border border-emerald-100 bg-white/70 p-4 shadow-sm shadow-emerald-100/70",
    badge: "text-emerald-600",
    cellHour: "text-emerald-700/70",
    emptySection:
      "rounded-xl border border-emerald-100 bg-white/70 p-4 text-sm text-emerald-700",
  },
};

const GAS_HEATMAP_STYLE_CONFIG: HeatmapStyleConfig = {
  emptyCell: {
    backgroundColor: "hsl(142 60% 96%)",
    color: "hsl(142 45% 45%)",
    borderColor: "hsl(142 40% 88%)",
  },
  getCellStyles: (value, { minValue, maxValue, hasAnyData }) => {
    if (!hasAnyData || maxValue === minValue) {
      return {
        backgroundColor: "hsl(142 65% 88%)",
        color: "hsl(142 50% 30%)",
        borderColor: "hsl(142 45% 80%)",
      };
    }

    const intensity = (value - minValue) / (maxValue - minValue || 1);
    const clamped = Math.min(1, Math.max(0, intensity));
    const lightness = 90 - clamped * 48;
    const backgroundColor = `hsl(142 75% ${lightness}%)`;
    const colorLightness = Math.max(22, 30 - clamped * 8);
    const color = `hsl(142 ${50 + clamped * 25}% ${colorLightness}%)`;
    const borderColor = `hsl(142 55% ${78 - clamped * 28}%)`;

    return { backgroundColor, color, borderColor };
  },
};

const GAS_HEATMAP_FORMATTERS: HeatmapValueFormatters<GasHeatmapMeta> = {
  cell: (value) => value.toFixed(4),
  summaryMin: (value) => value.toFixed(4),
  summaryMax: (value) => value.toFixed(4),
  summaryAvg: (value) => value.toFixed(4),
  tooltip: ({ value, dayLabel, hour }) => {
    const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
    return `${dayLabel} at ${hourLabel}: ${value.toFixed(4)} Gwei`;
  },
};

const GAS_HEATMAP_COPY: HeatmapCopy = {
  loading: "Loading hourly gas prices...",
  error: (error) =>
    error instanceof Error
      ? error.message
      : "Unable to load gas price heatmap.",
  empty: "Gas price heatmap data will appear shortly.",
  mobileRangeWithSelection: (summary) => (
    <>
      Hourly range for <strong>{summary.activeDayLabel}</strong>:{" "}
      <strong>{summary.minDisplay}</strong> –{" "}
      <strong>{summary.maxDisplay}</strong> Gwei
    </>
  ),
  mobileRangeWithoutSelection: "Select a day to view hourly gas prices.",
  desktopRange: (summary) => (
    <>
      Weekly hourly range: <strong>{summary.overallMinDisplay}</strong> –{" "}
      <strong>{summary.overallMaxDisplay}</strong> Gwei
    </>
  ),
  mobileHeaderBadge: (summary) => (
    <>
      {summary.minDisplay} – {summary.maxDisplay} Gwei
    </>
  ),
  mobileFooter: (summary) => <>Avg {summary.avgDisplay} Gwei</>,
  mobileFooterBadge: "24 hrs",
};

export function GasPriceHeatmapCard({ className }: GasPriceHeatmapCardProps) {
  const { data, isPending, isError, error } = useGasPriceChartData("hourly");

  const heatmapData = useMemo<HeatmapDatum<GasHeatmapMeta>[]>(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((point) => ({
      day: point.day,
      hour: point.hour,
      value: point.averageGasPriceGwei,
      meta: { arkivEntityKey: point.arkivEntityKey },
    }));
  }, [data]);

  return (
    <HeatmapChart<GasHeatmapMeta>
      className={className}
      title="Gas Price Heatmap (7 days)"
      description="Visualize hourly gas price pressure to spot the most affordable windows for execution."
      data={heatmapData}
      isPending={isPending}
      isError={isError}
      error={error}
      copy={GAS_HEATMAP_COPY}
      formatters={GAS_HEATMAP_FORMATTERS}
      styleConfig={GAS_HEATMAP_STYLE_CONFIG}
      theme={GAS_HEATMAP_THEME}
      legend={{
        startLabel: "More affordable",
        endLabel: "More expensive",
      }}
      alwaysShowRange
      getCellHref={(datum) =>
        datum.meta?.arkivEntityKey
          ? `https://explorer.infurademo.hoodi.arkiv.network/entity/${datum.meta.arkivEntityKey}?tab=data`
          : undefined
      }
      cellLinkTarget="_blank"
      cellLinkRel="noopener,noreferrer"
    />
  );
}
