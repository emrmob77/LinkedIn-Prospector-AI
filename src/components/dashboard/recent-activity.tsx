"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  UserPlus,
  CheckCircle,
  ArrowRight,
  Zap,
  Send,
  FileText,
  Download,
  GitMerge,
  Globe,
  ShieldAlert,
} from "lucide-react";
import type { ActionType } from "@/types/enums";

interface ActivityItem {
  id: string;
  timestamp: string;
  actionType: ActionType;
  entityType: string;
  entityId: string;
  isSystemAction: boolean;
  details: Record<string, unknown> | null;
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    title: string;
    badgeLabel: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  search_started: {
    icon: <Search className="h-4 w-4 text-blue-500" />,
    title: "Arama başlatıldı",
    badgeLabel: "Arama",
    badgeVariant: "secondary",
  },
  search_completed: {
    icon: <Search className="h-4 w-4 text-blue-500" />,
    title: "Arama tamamlandı",
    badgeLabel: "Arama",
    badgeVariant: "secondary",
  },
  post_classified: {
    icon: <FileText className="h-4 w-4 text-indigo-500" />,
    title: "Post sınıflandırıldı",
    badgeLabel: "AI",
    badgeVariant: "outline",
  },
  lead_created: {
    icon: <UserPlus className="h-4 w-4 text-purple-500" />,
    title: "Yeni lead oluşturuldu",
    badgeLabel: "Lead",
    badgeVariant: "secondary",
  },
  lead_stage_changed: {
    icon: <ArrowRight className="h-4 w-4 text-orange-500" />,
    title: "Aşama değişikliği",
    badgeLabel: "Pipeline",
    badgeVariant: "outline",
  },
  message_generated: {
    icon: <Zap className="h-4 w-4 text-amber-500" />,
    title: "AI mesaj oluşturuldu",
    badgeLabel: "AI",
    badgeVariant: "outline",
  },
  message_approved: {
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    title: "Mesaj onaylandı",
    badgeLabel: "Onay",
    badgeVariant: "default",
  },
  message_sent: {
    icon: <Send className="h-4 w-4 text-green-500" />,
    title: "Mesaj gönderildi",
    badgeLabel: "Gönderim",
    badgeVariant: "default",
  },
  lead_merged: {
    icon: <GitMerge className="h-4 w-4 text-cyan-500" />,
    title: "Lead birleştirildi",
    badgeLabel: "Lead",
    badgeVariant: "secondary",
  },
  export_created: {
    icon: <Download className="h-4 w-4 text-gray-500" />,
    title: "Dışa aktarma oluşturuldu",
    badgeLabel: "Export",
    badgeVariant: "outline",
  },
  extension_import: {
    icon: <Globe className="h-4 w-4 text-blue-600" />,
    title: "Extension verisi içe aktarıldı",
    badgeLabel: "Extension",
    badgeVariant: "secondary",
  },
  competitor_toggled: {
    icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
    title: "Rakip İşaretlendi",
    badgeLabel: "Lead",
    badgeVariant: "outline",
  },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay === 1) return "Dün";
  if (diffDay < 7) return `${diffDay} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function getActivityDescription(activity: ActivityItem): string {
  const details = activity.details || {};
  switch (activity.actionType) {
    case "search_completed": {
      const keywords = details.keywords as string[] | undefined;
      const postsFound = details.postsFound as number | undefined;
      const kw = keywords?.join(", ") || "bilinmiyor";
      return `"${kw}" - ${postsFound ?? 0} gönderi bulundu`;
    }
    case "lead_created": {
      const name = details.name as string | undefined;
      const score = details.score as number | undefined;
      return name ? `${name}${score ? ` (Skor: ${score})` : ""}` : "Yeni lead";
    }
    case "lead_stage_changed": {
      const from = details.fromStage as string | undefined;
      const to = details.toStage as string | undefined;
      const leadName = details.leadName as string | undefined;
      return leadName
        ? `${leadName}: ${from || "?"} → ${to || "?"}`
        : `${from || "?"} → ${to || "?"}`;
    }
    case "message_approved":
    case "message_generated":
    case "message_sent": {
      const leadName = details.leadName as string | undefined;
      return leadName ? `${leadName} için mesaj` : "Mesaj işlemi";
    }
    case "extension_import": {
      const count = details.postsCount as number | undefined;
      return count ? `${count} post içe aktarıldı` : "Extension verisi aktarıldı";
    }
    case "competitor_toggled": {
      const newValue = details.newValue as boolean | undefined;
      return newValue ? "Rakip olarak işaretlendi" : "Rakip işareti kaldırıldı";
    }
    default:
      return activity.entityType
        ? `${activity.entityType} #${activity.entityId?.slice(0, 8) || ""}`
        : "";
  }
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 p-2.5">
      <Skeleton className="h-7 w-7 rounded-md" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/activity-log?limit=5&page=1");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setActivities(json.activities || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Son Aktiviteler</CardTitle>
        <CardDescription className="text-xs">
          Son sistem aktiviteleri
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aktiviteler yüklenemedi
            </p>
            <button
              onClick={fetchActivities}
              className="mt-1 text-xs text-primary underline"
            >
              Tekrar dene
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Henüz aktivite yok
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity) => {
              const config = ACTION_CONFIG[activity.actionType] || {
                icon: <FileText className="h-4 w-4 text-gray-400" />,
                title: activity.actionType,
                badgeLabel: "Sistem",
                badgeVariant: "outline" as const,
              };
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {config.title}
                      </p>
                      <Badge
                        variant={config.badgeVariant}
                        className="text-[10px] h-4 px-1.5 shrink-0"
                      >
                        {config.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
