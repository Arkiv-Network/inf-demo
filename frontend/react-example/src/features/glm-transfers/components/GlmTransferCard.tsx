import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

import { cn } from "@/lib/utils";

import { useGlmTransferData } from "../hooks/useGlmTransferData";
import { GlmTransferDesktopChart } from "./GlmTransferDesktopChart";
import { GlmTransferMobileChart } from "./GlmTransferMobileChart";

type GlmTransferCardProps = {
  className?: string;
};

export function GlmTransferCard({ className }: GlmTransferCardProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "hourly">("hourly");

  const dailyData = useGlmTransferData("daily");
  const hourlyData = useGlmTransferData("hourly");

  const { data, isError, error } =
    timeframe === "daily" ? dailyData : hourlyData;

  const timeframeLabel = timeframe === "daily" ? "30 days" : "7 days";

  return (
    <Card
      className={cn(
        "border-purple-200/60 bg-white/80 shadow-2xl shadow-purple-200/70 backdrop-blur",
        className
      )}
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">
            GLM Token Transfers ({timeframeLabel})
          </CardTitle>
          <CardDescription>
            GLM {timeframe} transfer activity: number of transfers and total
            volume.
          </CardDescription>
        </div>
        <ButtonGroup>
          <Button
            variant={timeframe === "hourly" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("hourly")}
          >
            Hourly
          </Button>
          <Button
            variant={timeframe === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe("daily")}
          >
            Daily
          </Button>
        </ButtonGroup>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load GLM transfer data."}
          </div>
        ) : !data?.length ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading GLM transfer data...
          </div>
        ) : (
          <>
            {/* Desktop Chart */}
            <div className="hidden md:block">
              <GlmTransferDesktopChart data={data} timeframe={timeframe} />
            </div>

            {/* Mobile Chart */}
            <div className="block md:hidden">
              <GlmTransferMobileChart
                dailyData={dailyData.data || []}
                hourlyData={hourlyData.data || []}
                timeframe={timeframe}
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        {data?.length ? (
          <p className="text-xs italic text-muted-foreground">
            Click any data point to open the entity in Arkiv Explorer.
          </p>
        ) : (
          <span className="rounded bg-slate-200 animate-pulse w-full h-[1em]" />
        )}
      </CardFooter>
    </Card>
  );
}
