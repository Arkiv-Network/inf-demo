import { fetchStats } from "./shared/arkivClient.js";
import {
  formatDateLabel,
  formatGwei,
  formatNumber,
} from "./shared/formatters.js";
import { Chart, registerables } from "https://esm.sh/chart.js@4.4.3?target=es2022&bundle-deps";
Chart.register(...registerables);

const summaryStatus = document.querySelector("[data-summary-status]");
const gasLatestValue = document.querySelector("[data-summary-gas-latest]");
const gasLatestDate = document.querySelector("[data-summary-gas-latest-date]");
const gasMeanValue = document.querySelector("[data-summary-gas-mean]");
const txPeakValue = document.querySelector("[data-summary-tx-peak]");
const txPeakDate = document.querySelector("[data-summary-tx-peak-date]");
const txMeanValue = document.querySelector("[data-summary-tx-mean]");
const gasChartCanvas = document.getElementById("gas-weekly-chart");
const txChartCanvas = document.getElementById("tx-weekly-chart");

if (
  !summaryStatus ||
  !gasLatestValue ||
  !gasLatestDate ||
  !gasMeanValue ||
  !txPeakValue ||
  !txPeakDate ||
  !txMeanValue ||
  !gasChartCanvas ||
  !txChartCanvas
) {
  throw new Error("Weekly stats page is missing required elements");
}

function formatSummaryStatus(message, variant = "info") {
  summaryStatus.textContent = message;
  summaryStatus.dataset.variant = variant;
}

function computeMean(values) {
  if (!values.length) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function selectLastSeven(points) {
  return points.slice(Math.max(0, points.length - 7));
}

function renderSummaries(points) {
  if (!points.length) {
    gasLatestValue.textContent = "--";
    gasLatestDate.textContent = "";
    gasMeanValue.textContent = "--";
    txPeakValue.textContent = "--";
    txPeakDate.textContent = "";
    txMeanValue.textContent = "--";
    return;
  }

  const latestPoint = points[points.length - 1];
  gasLatestValue.textContent = `${formatGwei(latestPoint.avgGasPrice)} gwei`;
  gasLatestDate.textContent = `Captured ${formatDateLabel(latestPoint.timestamp)}`;

  const gasMean = computeMean(points.map((point) => point.avgGasPrice));
  gasMeanValue.textContent = `${formatGwei(gasMean)} gwei`;

  const peakTransactions = points.reduce(
    (currentPeak, point) =>
      point.totalTransactionCount > currentPeak.totalTransactionCount
        ? point
        : currentPeak,
    points[0]
  );
  txPeakValue.textContent = formatNumber(
    peakTransactions.totalTransactionCount
  );
  txPeakDate.textContent = `Peak on ${formatDateLabel(peakTransactions.timestamp)}`;

  const txMean = computeMean(points.map((point) => point.totalTransactionCount));
  txMeanValue.textContent = formatNumber(Math.round(txMean));
}

let gasChartInstance = null;
let txChartInstance = null;

function destroyExistingCharts() {
  if (gasChartInstance) {
    gasChartInstance.destroy();
    gasChartInstance = null;
  }
  if (txChartInstance) {
    txChartInstance.destroy();
    txChartInstance = null;
  }
}

function renderCharts(points) {
  destroyExistingCharts();

  if (!points.length) {
    return;
  }

  const labels = points.map((point) => formatDateLabel(point.timestamp));
  const gasData = points.map((point) => point.avgGasPrice / 1_000_000_000);
  const txData = points.map((point) => point.totalTransactionCount);

  gasChartInstance = new Chart(gasChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Average Gas Price (gwei)",
          data: gasData,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#475569",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Gas price (gwei)",
            color: "#475569",
          },
          ticks: {
            color: "#475569",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y;
              return `Average gas price: ${value.toFixed(2)} gwei`;
            },
          },
        },
      },
    },
  });

  txChartInstance = new Chart(txChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Transactions",
          data: txData,
          backgroundColor: "rgba(59, 130, 246, 0.35)",
          borderColor: "#2563eb",
          borderWidth: 1.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#475569",
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: "Transactions per day",
            color: "#475569",
          },
          ticks: {
            color: "#475569",
            callback(value) {
              return formatNumber(value);
            },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y;
              return `Transactions: ${formatNumber(value)}`;
            },
          },
        },
      },
    },
  });
}

async function bootstrapWeeklyStats() {
  try {
    formatSummaryStatus("Loading daily stats…", "info");
    const stats = await fetchStats("daily");
    const recentPoints = selectLastSeven(stats);

    if (!recentPoints.length) {
      formatSummaryStatus("No daily stats available for the past week.", "error");
      renderSummaries([]);
      return;
    }

    renderSummaries(recentPoints);
    renderCharts(recentPoints);
    const latestTimestamp = recentPoints[recentPoints.length - 1]?.timestamp;
    if (Number.isFinite(latestTimestamp)) {
      formatSummaryStatus(
        `Updated with data through ${formatDateLabel(latestTimestamp)}`,
        "success"
      );
    } else {
      formatSummaryStatus("Weekly stats loaded.", "success");
    }
  } catch (error) {
    console.error("Failed to load weekly stats", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    formatSummaryStatus(`Could not load weekly stats: ${message}`, "error");
    renderSummaries([]);
    destroyExistingCharts();
  }
}

void bootstrapWeeklyStats();
