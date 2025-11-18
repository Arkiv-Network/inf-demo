import { useCallback, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
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
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});

const weekFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
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

type DailyDataPoint = {
	date: string;
	transferCount: number;
	transferVolume: number;
	arkivEntityKey: string;
};

type HourlyDataPoint = {
	timestamp: number;
	transferCount: number;
	transferVolume: number;
	arkivEntityKey: string;
};

type GlmTransferMobileChartProps = {
	dailyData: DailyDataPoint[];
	hourlyData: HourlyDataPoint[];
	timeframe: "daily" | "hourly";
};

// Generate all dates for the last 28 days (4 weeks)
function generateLast28Days(): string[] {
	const days: string[] = [];
	const now = new Date();
	const today = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
	);

	for (let i = 27; i >= 0; i--) {
		const date = new Date(today);
		date.setUTCDate(today.getUTCDate() - i);
		days.push(date.toISOString().slice(0, 10));
	}

	return days;
}

// Generate all dates for the last 7 days
function generateLast7Days(): string[] {
	const days: string[] = [];
	const now = new Date();
	const today = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
	);

	for (let i = 7; i >= 0; i--) {
		const date = new Date(today);
		date.setUTCDate(today.getUTCDate() - i);
		days.push(date.toISOString().slice(0, 10));
	}

	return days;
}

function groupIntoWeeks(
	allDates: string[],
	dataMap: Map<string, DailyDataPoint>,
) {
	const weeks: Array<{
		weekLabel: string;
		weekStart: string;
		weekEnd: string;
		days: DailyDataPoint[];
	}> = [];

	for (let i = 0; i < allDates.length; i += 7) {
		const weekDates = allDates.slice(i, i + 7);
		if (weekDates.length === 0) continue;

		const firstDate = weekDates[0];
		const lastDate = weekDates[weekDates.length - 1];
		if (!firstDate || !lastDate) continue;

		const startDate = new Date(`${firstDate}T00:00:00`);
		const endDate = new Date(`${lastDate}T00:00:00`);
		const weekLabel = `${weekFormatter.format(
			startDate,
		)} - ${weekFormatter.format(endDate)}`;

		const days = weekDates.map((date) => {
			const existingData = dataMap.get(date);
			return (
				existingData || {
					date,
					transferCount: 0,
					transferVolume: 0,
					arkivEntityKey: "",
				}
			);
		});

		weeks.push({
			weekLabel,
			weekStart: firstDate,
			weekEnd: lastDate,
			days,
		});
	}

	return weeks;
}

function generateHoursForDay(date: string): HourlyDataPoint[] {
	const hours: HourlyDataPoint[] = [];
	const baseDate = new Date(`${date}T00:00:00Z`);

	for (let hour = 0; hour < 24; hour++) {
		const timestamp = new Date(baseDate);
		timestamp.setUTCHours(hour);
		hours.push({
			timestamp: timestamp.getTime(),
			transferCount: 0,
			transferVolume: 0,
			arkivEntityKey: "",
		});
	}

	return hours;
}

function ChartWithSelector({
	selectionOptions,
	mobileDailyData,
	mobileHourlyData,
	timeframe,
}: {
	selectionOptions: Array<{ key: string; label: string }>;
	mobileDailyData: Array<{
		weekLabel: string;
		weekStart: string;
		weekEnd: string;
		days: DailyDataPoint[];
	}> | null;
	mobileHourlyData: Array<{
		date: string;
		label: string;
		hours: HourlyDataPoint[];
	}> | null;
	timeframe: "daily" | "hourly";
}) {
	// Initialize with the latest option directly
	const defaultSelection =
		selectionOptions.length > 0
			? (selectionOptions[selectionOptions.length - 1]?.key ?? null)
			: null;

	const [selectedDate, setSelectedDate] = useState<string | null>(
		defaultSelection,
	);

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

			const explorerUrl = `https://explorer.mendoza.hoodi.arkiv.network/entity/${entityKey}?tab=data`;

			window.open(explorerUrl, "_blank", "noopener,noreferrer");
		},
		[],
	);

	const selectedMobileData = useMemo(() => {
		if (!selectedDate) return null;

		if (timeframe === "daily" && mobileDailyData) {
			return (
				mobileDailyData.find((w) => w.weekStart === selectedDate)?.days || null
			);
		} else if (timeframe === "hourly" && mobileHourlyData) {
			return (
				mobileHourlyData.find((d) => d.date === selectedDate)?.hours || null
			);
		}
		return null;
	}, [selectedDate, timeframe, mobileDailyData, mobileHourlyData]);

	return (
		<div className="space-y-4">
			{/* Date/Week Selector */}
			{selectionOptions.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectionOptions.map((option) => (
						<button
							key={option.key}
							type="button"
							onClick={() => setSelectedDate(option.key)}
							className={cn(
								"rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60",
								selectedDate === option.key
									? "border-purple-500 bg-purple-600 text-white shadow"
									: "border-purple-200 bg-white/70 text-purple-700 hover:bg-purple-50",
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			)}

			{/* Horizontal Bar Chart */}
			{selectedMobileData && selectedMobileData.length > 0 ? (
				<ChartContainer config={chartConfig} className="h-[600px] w-full">
					<BarChart
						data={selectedMobileData}
						layout="vertical"
						margin={{ top: 20, right: 60, left: 10, bottom: 5 }}
						onClick={handleChartClick}
						style={{
							cursor: "pointer",
						}}
					>
						<CartesianGrid strokeDasharray="4 4" horizontal={false} />

						{/* Left X-axis for Transfer Count */}
						<XAxis
							xAxisId="count"
							type="number"
							orientation="bottom"
							axisLine={false}
							tickLine={false}
							tickMargin={8}
							tickFormatter={(value) => compactNumberFormatter.format(value)}
						/>

						{/* Right X-axis for Transfer Volume */}
						<XAxis
							xAxisId="volume"
							type="number"
							orientation="top"
							axisLine={false}
							tickLine={false}
							tickMargin={8}
							tickFormatter={(value) => compactNumberFormatter.format(value)}
						/>

						<YAxis
							type="category"
							dataKey={timeframe === "daily" ? "date" : "timestamp"}
							axisLine={false}
							tickLine={false}
							tickMargin={4}
							width={45}
							tickFormatter={(value) => {
								if (timeframe === "daily") {
									return dateFormatter.format(new Date(`${value}T00:00:00`));
								}
								const hour = new Date(value).getUTCHours();
								return `${hour.toString().padStart(2, "0")}:00`;
							}}
						/>
						<ChartTooltip
							cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
							content={
								<ChartTooltipContent
									labelKey={timeframe === "daily" ? "date" : "timestamp"}
									nameKey="series"
									labelFormatter={(_, payloadItems) => {
										if (timeframe === "daily") {
											const rawDate = payloadItems?.[0]?.payload?.date;
											if (!rawDate) return undefined;
											return dateFormatter.format(
												new Date(`${rawDate}T00:00:00`),
											);
										}
										const timestamp = payloadItems?.[0]?.payload?.timestamp;
										if (!timestamp) return undefined;
										const date = new Date(timestamp);
										const hour = date.getUTCHours();
										return `${hour.toString().padStart(2, "0")}:00`;
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
							xAxisId="count"
							dataKey="transferCount"
							name="Transfer Count"
							fill="var(--color-transferCount)"
							radius={[0, 4, 4, 0]}
						>
							<LabelList
								dataKey="transferCount"
								position="right"
								formatter={(value: number) =>
									value > 0 ? compactNumberFormatter.format(value) : ""
								}
								style={{ fontSize: "10px", fill: "var(--color-chart-2)" }}
							/>
						</Bar>
						<Bar
							xAxisId="volume"
							dataKey="transferVolume"
							name="Transfer Volume (GLM)"
							fill="var(--color-transferVolume)"
							radius={[0, 4, 4, 0]}
						>
							<LabelList
								dataKey="transferVolume"
								position="right"
								formatter={(value: number) =>
									value > 0 ? compactNumberFormatter.format(value) : ""
								}
								style={{ fontSize: "10px", fill: "var(--color-chart-1)" }}
							/>
						</Bar>
						<ChartLegend
							verticalAlign="top"
							content={<ChartLegendContent className="pt-0" />}
						/>
					</BarChart>
				</ChartContainer>
			) : (
				<div className="rounded-xl border border-purple-100 bg-white/70 p-4 text-sm text-purple-700">
					No data available for the selected{" "}
					{timeframe === "daily" ? "week" : "day"}.
				</div>
			)}
		</div>
	);
}

export function GlmTransferMobileChart({
	dailyData,
	hourlyData,
	timeframe,
}: GlmTransferMobileChartProps) {
	// Prepare data with all dates populated
	const { selectionOptions, mobileDailyData, mobileHourlyData } =
		useMemo(() => {
			if (timeframe === "daily") {
				const allDates = generateLast28Days();
				const dataMap = new Map(dailyData.map((d) => [d.date, d]));
				const weeks = groupIntoWeeks(allDates, dataMap);

				return {
					selectionOptions: weeks.map((w) => ({
						key: w.weekStart,
						label: w.weekLabel,
					})),
					mobileDailyData: weeks,
					mobileHourlyData: null,
				};
			} else {
				// For hourly: show last 7 days
				const allDates = generateLast7Days();

				// Group hourly data by date
				const hourlyByDay = new Map<string, Map<number, HourlyDataPoint>>();
				for (const point of hourlyData) {
					const date = new Date(point.timestamp).toISOString().slice(0, 10);
					if (!hourlyByDay.has(date)) {
						hourlyByDay.set(date, new Map());
					}
					const hour = new Date(point.timestamp).getUTCHours();
					hourlyByDay.get(date)?.set(hour, point);
				}

				// Generate all hours for each day
				const days = allDates.map((date) => {
					const dayHourMap = hourlyByDay.get(date) || new Map();
					const allHours = generateHoursForDay(date);

					// Fill in actual data where it exists
					const hours = allHours.map((hourSlot) => {
						const hour = new Date(hourSlot.timestamp).getUTCHours();
						const existingData = dayHourMap.get(hour);
						return existingData || hourSlot;
					});

					return {
						date,
						label: dateFormatter.format(new Date(`${date}T00:00:00`)),
						hours,
					};
				});

				return {
					selectionOptions: days.map((d) => ({ key: d.date, label: d.label })),
					mobileDailyData: null,
					mobileHourlyData: days,
				};
			}
		}, [dailyData, hourlyData, timeframe]);

	return (
		<ChartWithSelector
			key={timeframe}
			selectionOptions={selectionOptions}
			mobileDailyData={mobileDailyData}
			mobileHourlyData={mobileHourlyData}
			timeframe={timeframe}
		/>
	);
}
