import { fetchStats } from "./shared/arkivClient.js";
import {
  formatDateLabel,
  formatGwei,
  formatHourUTC,
  formatNumber,
} from "./shared/formatters.js";

const summaryStatus = document.querySelector("[data-congestion-status]");
const gasNowValue = document.querySelector("[data-congestion-gas-now]");
const gasNowTime = document.querySelector("[data-congestion-gas-now-time]");
const txNowValue = document.querySelector("[data-congestion-tx-now]");
const txNowTime = document.querySelector("[data-congestion-tx-now-time]");
const gasPeakValue = document.querySelector("[data-congestion-gas-peak]");
const gasPeakTime = document.querySelector("[data-congestion-gas-peak-time]");
const txPeakValue = document.querySelector("[data-congestion-tx-peak]");
const txPeakTime = document.querySelector("[data-congestion-tx-peak-time]");
const gasChartCanvas = document.getElementById("congestion-gas-chart");
const txChartCanvas = document.getElementById("congestion-tx-chart");

if (
  !summaryStatus ||
  !gasNowValue ||
  !gasNowTime ||
  !txNowValue ||
  !txNowTime ||
  !gasPeakValue ||
  !gasPeakTime ||
  !txPeakValue ||
  !txPeakTime ||
  !gasChartCanvas ||
  !txChartCanvas
) {
  throw new Error("Network congestion page is missing required elements");
}

let chartModulePromise = null;
let chartLibraryRegistered = false;

async function loadChartLibrary() {
  if (!chartModulePromise) {
    chartModulePromise = import(
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.esm.js"
    );
  }

  const { Chart, registerables } = await chartModulePromise;
  if (!chartLibraryRegistered) {
    Chart.register(...registerables);
    chartLibraryRegistered = true;
  }
  return Chart;
}

function setSummaryStatus(message, variant = "info") {
  summaryStatus.textContent = message;
  summaryStatus.dataset.variant = variant;
}

function selectLastTwentyFour(points) {
  return points.slice(Math.max(0, points.length - 24));
}

function toGwei(value) {
  return `${formatGwei(value)} gwei`;
}

function timestampToCaption(timestamp, prefix) {
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  return `${prefix} ${formatDateLabel(timestamp)} - ${formatHourUTC(timestamp)} UTC`;
}

function renderSummaries(points) {
  if (!points.length) {
    gasNowValue.textContent = "--";
    gasNowTime.textContent = "";
    txNowValue.textContent = "--";
    txNowTime.textContent = "";
    gasPeakValue.textContent = "--";
    gasPeakTime.textContent = "";
    txPeakValue.textContent = "--";
    txPeakTime.textContent = "";
    return;
  }

  const latestPoint = points[points.length - 1];
  gasNowValue.textContent = toGwei(latestPoint.avgGasPrice);
  gasNowTime.textContent = timestampToCaption(latestPoint.timestamp, "Captured");
  txNowValue.textContent = formatNumber(latestPoint.totalTransactionCount);
  txNowTime.textContent = timestampToCaption(latestPoint.timestamp, "Captured");

  const gasPeakPoint = points.reduce((peak, candidate) =>
    candidate.avgGasPrice > peak.avgGasPrice ? candidate : peak
  );
  gasPeakValue.textContent = toGwei(gasPeakPoint.avgGasPrice);
  gasPeakTime.textContent = timestampToCaption(gasPeakPoint.timestamp, "Peak at");

  const txPeakPoint = points.reduce((peak, candidate) =>
    candidate.totalTransactionCount > peak.totalTransactionCount ? candidate : peak
  );
  txPeakValue.textContent = formatNumber(txPeakPoint.totalTransactionCount);
  txPeakTime.textContent = timestampToCaption(txPeakPoint.timestamp, "Peak at");
}

let gasChartInstance = null;
let txChartInstance = null;

function destroyCharts() {
  if (gasChartInstance) {
    gasChartInstance.destroy();
    gasChartInstance = null;
  }
  if (txChartInstance) {
    txChartInstance.destroy();
    txChartInstance = null;
  }
}

function buildHourLabels(points) {
  return points.map((point) => `${formatHourUTC(point.timestamp)}\n${formatDateLabel(point.timestamp)}`);
}

async function renderCharts(points) {
  destroyCharts();

  if (!points.length) {
    return;
  }

  const Chart = await loadChartLibrary();
  const labels = buildHourLabels(points);
  const gasData = points.map((point) => point.avgGasPrice / 1_000_000_000);
  const txData = points.map((point) => point.totalTransactionCount);

  gasChartInstance = new Chart(gasChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gas price (gwei)",
          data: gasData,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.18)",
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
            maxRotation: 0,
            autoSkip: true,
          },
          grid: {
            display: false,
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
            title(context) {
              const index = context[0].dataIndex;
              const point = points[index];
              return `${formatDateLabel(point.timestamp)} ${formatHourUTC(point.timestamp)} UTC`;
            },
            label(context) {
              return `Gas price: ${context.parsed.y.toFixed(2)} gwei`;
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
          backgroundColor: "rgba(34, 197, 94, 0.28)",
          borderColor: "#16a34a",
          borderWidth: 1,
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
            maxRotation: 0,
            autoSkip: true,
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: "Transactions per hour",
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
            title(context) {
              const index = context[0].dataIndex;
              const point = points[index];
              return `${formatDateLabel(point.timestamp)} ${formatHourUTC(point.timestamp)} UTC`;
            },
            label(context) {
              return `Transactions: ${formatNumber(context.parsed.y)}`;
            },
          },
        },
      },
    },
  });
}

async function bootstrapNetworkCongestion() {
  try {
    setSummaryStatus("Loading hourly stats…", "info");
    const stats = await fetchStats("hourly");
    const recentPoints = selectLastTwentyFour(stats);

    if (!recentPoints.length) {
      setSummaryStatus("No hourly congestion data available.", "error");
      renderSummaries([]);
      destroyCharts();
      return;
    }

    renderSummaries(recentPoints);
    await renderCharts(recentPoints);
    const latestTimestamp = recentPoints[recentPoints.length - 1]?.timestamp;
    if (Number.isFinite(latestTimestamp)) {
      setSummaryStatus(
        `Updated with data through ${formatDateLabel(latestTimestamp)} ${formatHourUTC(latestTimestamp)} UTC`,
        "success"
      );
    } else {
      setSummaryStatus("Hourly stats loaded.", "success");
    }
  } catch (error) {
    console.error("Failed to load network congestion data", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    setSummaryStatus(`Could not load congestion data: ${message}`, "error");
    renderSummaries([]);
    destroyCharts();
  }
}

void bootstrapNetworkCongestion();
