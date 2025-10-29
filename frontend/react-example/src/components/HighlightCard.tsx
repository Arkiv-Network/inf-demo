import { cn } from "@/lib/utils";

export function HighlightCard({
  title,
  value,
  isError,
}: {
  title: string;
  value: React.ReactNode;
  isError?: boolean;
}) {
  let content;
  if (typeof value === "string") {
    content = (
      <p
        className={cn("mt-3 text-2xl font-semibold text-white", {
          "text-red-500": isError,
        })}
      >
        {value}
      </p>
    );
  } else {
    content = value;
  }
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-900/40 backdrop-blur">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/60">
        {title}
      </p>
      {content}
    </div>
  );
}
