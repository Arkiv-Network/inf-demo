import { fetchLatestBlocks, fetchStats } from "./shared/arkivClient.js";
import { formatGwei, formatNumber } from "./shared/formatters.js";

const REFRESH_INTERVAL_MS = 60_000;
const RETRY_INTERVAL_ON_ERROR_MS = 30_000;

const statusFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const metricElements = {
  "latest-block": document.querySelector('[data-metric="latest-block"]'),
  "avg-gas": document.querySelector('[data-metric="avg-gas"]'),
  "avg-daily-tx": document.querySelector('[data-metric="avg-daily-tx"]'),
  "current-gas": document.querySelector('[data-metric="current-gas"]'),
};

const metricLinkElements = {
  "latest-block": document.querySelector('[data-metric-link="latest-block"]'),
};

const statusElement = document.querySelector("[data-status]");
const lastUpdatedElement = document.querySelector("[data-last-updated]");
const refreshButton = document.getElementById("home-refresh");

let refreshHandle = null;
let isRefreshing = false;

function scheduleNextRefresh(delay) {
  if (refreshHandle !== null) {
    window.clearTimeout(refreshHandle);
  }

  refreshHandle = window.setTimeout(() => {
    void loadHighlights({ showStatus: false });
  }, delay);
}

function setStatus(message, variant = "info") {
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.dataset.variant = variant;
}

function setLastUpdated(timestamp) {
  if (!lastUpdatedElement) {
    return;
  }

  if (timestamp instanceof Date && Number.isFinite(timestamp.getTime())) {
    lastUpdatedElement.textContent = statusFormatter.format(timestamp);
  } else {
    lastUpdatedElement.textContent = "--";
  }
}

function setMetric(metricId, value) {
  const element = metricElements[metricId];
  if (!element) {
    return;
  }
  element.textContent = value;
}

function setMetricLink(metricId, href) {
  const link = metricLinkElements[metricId];
  if (!link) {
    return;
  }
  if (href) {
    link.href = href;
  }
}

function toReadableGwei(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return `${formatGwei(value)} gwei`;
}

async function loadHighlights({ showStatus = true } = {}) {
  if (isRefreshing) {
    return;
  }

  isRefreshing = true;
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";
  }

  if (showStatus) {
    setStatus("Loading highlights...", "info");
  }

  if (refreshHandle !== null) {
    window.clearTimeout(refreshHandle);
    refreshHandle = null;
  }

  try {
    const [blocksOutcome, dailyOutcome, hourlyOutcome] = await Promise.allSettled([
      fetchLatestBlocks(),
      fetchStats("daily"),
      fetchStats("hourly"),
    ]);

    let hadSuccess = false;
    let hadError = false;

    if (blocksOutcome.status === "fulfilled" && Array.isArray(blocksOutcome.value)) {
      const latestBlock = blocksOutcome.value[0];
      if (latestBlock) {
        hadSuccess = true;
        setMetric("latest-block", `#${latestBlock.blockNumber}`);
        setMetricLink(
          "latest-block",
          `pages/blocks.html?block=${encodeURIComponent(latestBlock.blockNumber)}`
        );
      } else {
        setMetric("latest-block", "--");
        hadError = true;
      }
    } else {
      setMetric("latest-block", "--");
      hadError = true;
    }

    if (dailyOutcome.status === "fulfilled" && Array.isArray(dailyOutcome.value)) {
      const recentDaily = dailyOutcome.value.slice(-7);
      if (recentDaily.length) {
        hadSuccess = true;
        const averageGas =
          recentDaily.reduce((total, point) => total + point.avgGasPrice, 0) /
          recentDaily.length;
        const averageTx =
          recentDaily.reduce(
            (total, point) => total + point.totalTransactionCount,
            0
          ) / recentDaily.length;

        setMetric("avg-gas", toReadableGwei(averageGas) ?? "--");
        setMetric(
          "avg-daily-tx",
          Number.isFinite(averageTx) ? formatNumber(Math.round(averageTx)) : "--"
        );
      } else {
        setMetric("avg-gas", "--");
        setMetric("avg-daily-tx", "--");
        hadError = true;
      }
    } else {
      setMetric("avg-gas", "--");
      setMetric("avg-daily-tx", "--");
      hadError = true;
    }

    if (hourlyOutcome.status === "fulfilled" && Array.isArray(hourlyOutcome.value)) {
      const latestHourly = hourlyOutcome.value.at(-1);
      if (latestHourly) {
        hadSuccess = true;
        setMetric(
          "current-gas",
          toReadableGwei(latestHourly.avgGasPrice) ?? "--"
        );
      } else {
        setMetric("current-gas", "--");
        hadError = true;
      }
    } else {
      setMetric("current-gas", "--");
      hadError = true;
    }

    if (hadSuccess) {
      setLastUpdated(new Date());
    } else {
      setLastUpdated(null);
    }

    if (hadError) {
      setStatus(
        hadSuccess
          ? "Highlights updated with partial data from Arkiv."
          : "Unable to refresh highlights from Arkiv.",
        hadSuccess ? "info" : "error"
      );
      scheduleNextRefresh(RETRY_INTERVAL_ON_ERROR_MS);
    } else {
      setStatus("Highlights updated from Arkiv.", "success");
      scheduleNextRefresh(REFRESH_INTERVAL_MS);
    }
  } catch (error) {
    console.error("Failed to refresh home highlights", error);
    setStatus("A network error prevented refreshing highlights.", "error");
    setLastUpdated(null);
    setMetric("latest-block", "--");
    setMetric("avg-gas", "--");
    setMetric("avg-daily-tx", "--");
    setMetric("current-gas", "--");
    scheduleNextRefresh(RETRY_INTERVAL_ON_ERROR_MS);
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh now";
    }
    isRefreshing = false;
  }
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    void loadHighlights({ showStatus: true });
  });
}

void loadHighlights({ showStatus: true });