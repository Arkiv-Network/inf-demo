import { fetchStats } from "./shared/arkivClient.js";
import {
  formatCompactNumber,
  formatDateLabel,
  formatHourUTC,
  formatNumber,
  formatTokenAmount,
} from "./shared/formatters.js";
import { Chart, registerables } from "https://esm.sh/chart.js@4.4.3?target=es2022&bundle-deps";
Chart.register(...registerables);

const statusBadge = document.querySelector("[data-glm-status]");
const dailyCountValue = document.querySelector("[data-glm-daily-count]");
const dailyVolumeValue = document.querySelector("[data-glm-daily-volume]");
const dailyDateValue = document.querySelector("[data-glm-daily-date]");
const avgCountValue = document.querySelector("[data-glm-avg-count]");
const avgVolumeValue = document.querySelector("[data-glm-avg-volume]");
const dailyChartCanvas = document.getElementById("glm-daily-chart");
const hourlyChartCanvas = document.getElementById("glm-hourly-chart");

if (
  !statusBadge ||
  !dailyCountValue ||
  !dailyVolumeValue ||
  !dailyDateValue ||
  !avgCountValue ||
  !avgVolumeValue ||
  !dailyChartCanvas ||
  !hourlyChartCanvas
) {
  throw new Error("GLM Transfers page is missing required elements");
}

function setStatus(message, variant = "info") {
  statusBadge.textContent = message;
  statusBadge.dataset.variant = variant;
}

function selectLast(points, limit) {
  return points.slice(Math.max(0, points.length - limit));
}

function computeAverage(points, key) {
  if (!points.length) {
    return 0;
  }
  const total = points.reduce((sum, point) => sum + (point[key] ?? 0), 0);
  return total / points.length;
}

function formatVolume(value) {
  return `${formatTokenAmount(value)} GLM`;
}

function updateSummaries(dailyPoints) {
  if (!dailyPoints.length) {
    dailyCountValue.textContent = "--";
    dailyVolumeValue.textContent = "--";
    dailyDateValue.textContent = "";
    avgCountValue.textContent = "--";
    avgVolumeValue.textContent = "--";
  }

  if (dailyPoints.length) {
    const latest = dailyPoints[dailyPoints.length - 1];
    dailyCountValue.textContent = formatNumber(
      latest.totalGLMTransfersCount ?? 0
    );
    dailyVolumeValue.textContent = formatVolume(
      latest.totalGLMTransfersAmount ?? 0
    );
    dailyDateValue.textContent = `Captured ${formatDateLabel(latest.timestamp)}`;

    const sevenDayWindow = selectLast(dailyPoints, 7);
    const avgTransfers = computeAverage(
      sevenDayWindow,
      "totalGLMTransfersCount"
    );
    const avgVolume = computeAverage(
      sevenDayWindow,
      "totalGLMTransfersAmount"
    );
    avgCountValue.textContent = formatNumber(Math.round(avgTransfers));
    avgVolumeValue.textContent = formatVolume(avgVolume);
  }
}

let dailyChartInstance = null;
let hourlyChartInstance = null;

function destroyCharts() {
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
    dailyChartInstance = null;
  }
  if (hourlyChartInstance) {
    hourlyChartInstance.destroy();
    hourlyChartInstance = null;
  }
}

function renderDailyChart(points) {
  if (!dailyChartCanvas) {
    return;
  }
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
    dailyChartInstance = null;
  }
  if (!points.length) {
    return;
  }

  const labels = points.map((point) => formatDateLabel(point.timestamp));
  const countData = points.map((point) => point.totalGLMTransfersCount ?? 0);
  const volumeData = points.map(
    (point) => point.totalGLMTransfersAmount ?? 0
  );

  dailyChartInstance = new Chart(dailyChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Transfers",
          data: countData,
          backgroundColor: "rgba(124, 58, 237, 0.3)",
          borderColor: "#7c3aed",
          yAxisID: "y",
          borderWidth: 1.2,
        },
        {
          type: "line",
          label: "Volume (GLM)",
          data: volumeData,
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.15)",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          title: {
            display: true,
            text: "Transfers",
          },
          ticks: {
            callback: (value) => formatCompactNumber(value),
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
        y1: {
          position: "right",
          title: {
            display: true,
            text: "Volume (GLM)",
          },
          ticks: {
            callback: (value) => `${formatCompactNumber(value)} GLM`,
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          ticks: {
            color: "#475569",
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.label === "Volume (GLM)") {
                return `Volume: ${formatTokenAmount(context.parsed.y)} GLM`;
              }
              return `Transfers: ${formatNumber(context.parsed.y)}`;
            },
          },
        },
      },
    },
  });
}

function renderHourlyChart(points) {
  if (!hourlyChartCanvas) {
    return;
  }
  if (hourlyChartInstance) {
    hourlyChartInstance.destroy();
    hourlyChartInstance = null;
  }
  if (!points.length) {
    return;
  }

  const labels = points.map(
    (point) => `${formatHourUTC(point.timestamp)}\n${formatDateLabel(point.timestamp)}`
  );
  const countData = points.map((point) => point.totalGLMTransfersCount ?? 0);
  const volumeData = points.map(
    (point) => point.totalGLMTransfersAmount ?? 0
  );

  hourlyChartInstance = new Chart(hourlyChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Transfers",
          data: countData,
          backgroundColor: "rgba(216, 180, 254, 0.45)",
          borderColor: "#a855f7",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Volume (GLM)",
          data: volumeData,
          borderColor: "#14b8a6",
          backgroundColor: "rgba(20, 184, 166, 0.15)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          title: {
            display: true,
            text: "Transfers",
          },
          ticks: {
            callback: (value) => formatCompactNumber(value),
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
        y1: {
          position: "right",
          title: {
            display: true,
            text: "Volume (GLM)",
          },
          ticks: {
            callback: (value) => `${formatCompactNumber(value)} GLM`,
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          ticks: {
            maxRotation: 0,
            color: "#475569",
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title(context) {
              const index = context[0]?.dataIndex ?? 0;
              const point = points[index];
              return `${formatDateLabel(point.timestamp)} ${formatHourUTC(
                point.timestamp
              )} UTC`;
            },
            label(context) {
              if (context.dataset.label === "Volume (GLM)") {
                return `Volume: ${formatTokenAmount(context.parsed.y)} GLM`;
              }
              return `Transfers: ${formatNumber(context.parsed.y)}`;
            },
          },
        },
      },
    },
  });
}

async function bootstrapGlmTransfers() {
  try {
    setStatus("Loading GLM stats…", "info");
    const [dailyStats, hourlyStats] = await Promise.all([
      fetchStats("daily"),
      fetchStats("hourly"),
    ]);

    const dailyPoints = selectLast(dailyStats, 30);
    const hourlyPoints = selectLast(hourlyStats, 24);

    if (!dailyPoints.length && !hourlyPoints.length) {
      setStatus("No GLM transfer data is available yet.", "error");
      destroyCharts();
      return;
    }

    updateSummaries(dailyPoints);
    renderDailyChart(dailyPoints);
    renderHourlyChart(hourlyPoints);

    const lastTimestamp =
      dailyPoints[dailyPoints.length - 1]?.timestamp ??
      hourlyPoints[hourlyPoints.length - 1]?.timestamp;
    if (Number.isFinite(lastTimestamp)) {
      setStatus(
        `Updated with data through ${formatDateLabel(lastTimestamp)}`,
        "success"
      );
    } else {
      setStatus("GLM data loaded.", "success");
    }
  } catch (error) {
    console.error("Failed to load GLM transfer data", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(`Could not load GLM stats: ${message}`, "error");
    destroyCharts();
  }
}

void bootstrapGlmTransfers();
