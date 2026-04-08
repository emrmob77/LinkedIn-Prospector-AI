"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gauge, AlertTriangle, Check, Loader2 } from "lucide-react";

interface AIUsageData {
  provider: string;
  usage?: number;
  limit?: number | null;
  remaining?: number | null;
  isFree?: boolean;
  message?: string;
  label?: string | null;
}

interface AIUsageBadgeProps {
  /** Refetch tetiklemek icin disaridan artirilan sayac */
  refreshTrigger?: number;
  /** Limit doluysa parent'a bildir */
  onLimitReached?: (reached: boolean) => void;
}

export function AIUsageBadge({ refreshTrigger = 0, onLimitReached }: AIUsageBadgeProps) {
  const [data, setData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;

  const fetchUsage = useCallback(async () => {
    try {
      setError(false);
      const res = await fetch("/api/ai-usage");
      if (!res.ok) {
        setError(true);
        return;
      }
      const result: AIUsageData = await res.json();
      setData(result);

      // Limit durumunu parent'a bildir
      if (result.isFree && result.remaining !== undefined && result.remaining !== null) {
        onLimitReachedRef.current?.(result.remaining <= 0);
      } else {
        onLimitReachedRef.current?.(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, refreshTrigger]);

  // OpenRouter degilse veya hata varsa gosterme
  if (!loading && (error || !data || data.provider !== "openrouter" || !data.isFree)) {
    return null;
  }

  if (loading) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 gap-1 px-2 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        Limit...
      </Badge>
    );
  }

  const usage = data!.usage ?? 0;
  const limit = data!.limit ?? 50;
  const remaining = data!.remaining ?? 0;

  // Renk durumu
  let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
  let colorClasses = "";
  let icon = <Check className="h-3 w-3" />;
  let label = "";

  if (remaining <= 0) {
    variant = "destructive";
    colorClasses = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700";
    icon = <AlertTriangle className="h-3 w-3" />;
    label = "Gunluk limit doldu";
  } else if (remaining <= 10) {
    variant = "outline";
    colorClasses = "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700";
    icon = <Gauge className="h-3 w-3" />;
    label = `Kalan: ${remaining} istek`;
  } else {
    variant = "outline";
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700";
    icon = <Gauge className="h-3 w-3" />;
    label = `${usage}/${limit} kullanildi`;
  }

  const tooltipText = remaining <= 0
    ? "Gunluk ucretsiz limit doldu. Limit gece yarisi (UTC) sifirlanir."
    : `OpenRouter ucretsiz plan: ${usage} kullanildi, ${remaining} kaldi (toplam ${limit})`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={`text-[10px] h-5 gap-1 px-2 cursor-default ${colorClasses}`}
          >
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[250px]">
          <p>{tooltipText}</p>
          {data!.label && (
            <p className="text-muted-foreground mt-1">Key: {data!.label}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
