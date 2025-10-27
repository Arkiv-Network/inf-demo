const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatTimestamp(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}
