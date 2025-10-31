const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDateTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "Unknown";
  }
  return dateTimeFormatter.format(new Date(seconds * 1000));
}

function formatDateLabel(seconds) {
  if (!Number.isFinite(seconds)) {
    return "Unknown";
  }
  return dateFormatter.format(new Date(seconds * 1000));
}

function formatHourUTC(seconds) {
  if (!Number.isFinite(seconds)) {
    return "--";
  }
  return timeFormatter.format(new Date(seconds * 1000));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return numberFormatter.format(value);
}

function formatGwei(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const inGwei = value / 1_000_000_000;
  return decimalFormatter.format(inGwei);
}

function formatAddress(value) {
  if (!value) {
    return "Unknown";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export {
  formatAddress,
  formatDateLabel,
  formatDateTime,
  formatGwei,
  formatHourUTC,
  formatNumber,
};
