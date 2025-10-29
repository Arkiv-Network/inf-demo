const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatTimestamp(timestamp: number | string) {
  // If timestamp is a Unix timestamp (number or numeric string), convert to milliseconds
  const numericTimestamp =
    typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  const date = new Date(numericTimestamp * 1000);
  return dateTimeFormatter.format(date);
}
