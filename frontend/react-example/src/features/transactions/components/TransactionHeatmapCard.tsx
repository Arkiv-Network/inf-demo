import { useMemo } from "react";

import {
	HeatmapChart,
	type HeatmapCopy,
	type HeatmapDatum,
	type HeatmapStyleConfig,
	type HeatmapTheme,
	type HeatmapValueFormatters,
} from "@/components/HeatmapChart";

import { useTransactionHeatmap } from "../hooks/useTransactionHeatmap";

type TransactionHeatmapCardProps = {
	className?: string;
};
type TransactionHeatmapMeta = {
	arkivEntityKey?: string;
};

const TRANSACTION_HEATMAP_THEME: HeatmapTheme = {
	card: "border-sky-200/60 bg-sky-50/40 shadow-2xl shadow-sky-200/70 backdrop-blur",
	summaryText: "text-slate-600",
	mobileText: "text-sm text-slate-700",
	legendText: "text-slate-600",
	legendGradient: "bg-linear-to-r from-sky-100 via-sky-300 to-sky-600",
	daySelector: {
		base: "focus-visible:ring-sky-500/60",
		active: "border-sky-500 bg-sky-600 text-white shadow",
		inactive: "border-sky-200 bg-white/75 text-sky-700 hover:bg-sky-50",
	},
	table: {
		text: "text-slate-700",
		headerBorder: "border-sky-200/70",
		headerText: "text-slate-600",
		headerLabelText: "text-slate-500",
		hourBorder: "border-sky-100/60",
		hourText: "text-slate-500",
		cellBorder: "border-sky-100/70",
	},
	interactiveCell:
		"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-1",
	interactiveTile:
		"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2",
	mobile: {
		section:
			"rounded-xl border border-sky-100 bg-white/75 p-4 shadow-sm shadow-sky-100/70",
		badge: "text-sky-600",
		cellHour: "text-slate-600/80",
		emptySection:
			"rounded-xl border border-sky-100 bg-white/75 p-4 text-sm text-slate-600",
	},
};

const TRANSACTION_HEATMAP_STYLE_CONFIG: HeatmapStyleConfig = {
	emptyCell: {
		backgroundColor: "hsl(204 85% 96%)",
		color: "hsl(204 60% 35%)",
		borderColor: "hsl(204 70% 88%)",
	},
	getCellStyles: (value, { maxValue, hasAnyData }) => {
		if (!hasAnyData || maxValue === 0) {
			return {
				backgroundColor: "hsl(204 100% 94%)",
				color: "hsl(204 60% 35%)",
				borderColor: "hsl(204 70% 85%)",
			};
		}

		const intensity = value / maxValue;
		const clamped = Math.min(1, Math.max(0, intensity));
		const lightness = 95 - clamped * 55;
		const backgroundColor = `hsl(204 90% ${lightness}%)`;
		const colorLightness = Math.max(25, 35 - clamped * 10);
		const color = `hsl(204 ${60 + clamped * 20}% ${colorLightness}%)`;
		const borderColor = `hsl(204 80% ${80 - clamped * 28}%)`;

		return { backgroundColor, color, borderColor };
	},
};

const TRANSACTION_HEATMAP_FORMATTERS: HeatmapValueFormatters = {
	cell: (value) => value.toLocaleString(),
	summaryMin: (value) => Math.round(value).toLocaleString(),
	summaryMax: (value) => Math.round(value).toLocaleString(),
	summaryAvg: (value) => Math.round(value).toLocaleString(),
	tooltip: ({ value, dayLabel, hour }) => {
		const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
		return `${dayLabel} at ${hourLabel}: ${Math.round(
			value,
		).toLocaleString()} tx`;
	},
};

const TRANSACTION_HEATMAP_COPY: HeatmapCopy = {
	loading: "Loading hourly breakdown...",
	error: (error) =>
		error instanceof Error ? error.message : "Unable to load heatmap data.",
	empty: "Heatmap data will appear once transactions are recorded.",
	mobileRangeWithSelection: (summary) => (
		<>
			Hourly throughput for <strong>{summary.activeDayLabel}</strong>:{" "}
			<strong>{summary.minDisplay}</strong> –{" "}
			<strong>{summary.maxDisplay}</strong> tx/h
		</>
	),
	mobileRangeWithoutSelection: "Select a day to inspect hourly throughput.",
	desktopRange: (summary) => (
		<>
			Weekly hourly range: <strong>{summary.overallMinDisplay}</strong> –{" "}
			<strong>{summary.overallMaxDisplay}</strong> tx/h
		</>
	),
	mobileHeaderBadge: (summary) => (
		<>
			{summary.minDisplay} – {summary.maxDisplay} tx
		</>
	),
	mobileFooter: (summary) => <>Avg {summary.avgDisplay} tx</>,
	mobileFooterBadge: "24 hrs",
};

export function TransactionHeatmapCard({
	className,
}: TransactionHeatmapCardProps) {
	const { data, isPending, isError, error } = useTransactionHeatmap();

	const heatmapData = useMemo<HeatmapDatum<TransactionHeatmapMeta>[]>(() => {
		if (!Array.isArray(data)) {
			return [];
		}

		return data.map((point) => ({
			day: point.day,
			hour: point.hour,
			value: point.transactionCount,
			meta: { arkivEntityKey: point.arkivEntityKey },
		}));
	}, [data]);

	return (
		<HeatmapChart<TransactionHeatmapMeta>
			className={className}
			title="Transactions Heatmap (7 days)"
			description="Hourly transaction density helps surface congestion windows and quiet periods."
			data={heatmapData}
			isPending={isPending}
			isError={isError}
			error={error}
			copy={TRANSACTION_HEATMAP_COPY}
			formatters={TRANSACTION_HEATMAP_FORMATTERS}
			styleConfig={TRANSACTION_HEATMAP_STYLE_CONFIG}
			theme={TRANSACTION_HEATMAP_THEME}
			legend={{
				startLabel: "Lower activity",
				endLabel: "Higher activity",
			}}
			alwaysShowRange
			getCellHref={(datum) =>
				datum.meta?.arkivEntityKey
					? `https://explorer.mendoza.hoodi.arkiv.network/entity/${datum.meta.arkivEntityKey}?tab=data`
					: undefined
			}
			cellLinkTarget="_blank"
			cellLinkRel="noopener,noreferrer"
		/>
	);
}
