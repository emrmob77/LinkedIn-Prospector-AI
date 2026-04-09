"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Search,
  FileCheck,
  UserPlus,
  ArrowRightLeft,
  Mail,
  Download,
  Globe,
  Shield,
  CheckCheck,
} from "lucide-react";
import type { ActionType, EntityType } from "@/types/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationItem {
  id: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  details: Record<string, unknown> | null;
  timestamp: string;
  isRead: boolean;
}

// ---------------------------------------------------------------------------
// Action type -> Turkce metin
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  search_started: "Yeni arama baslatildi",
  search_completed: "Arama tamamlandi",
  post_classified: "Post siniflandirildi",
  lead_created: "Yeni lead olusturuldu",
  lead_stage_changed: "Lead asamasi degisti",
  message_generated: "Mesaj olusturuldu",
  message_approved: "Mesaj onaylandi",
  message_sent: "Mesaj gonderildi",
  lead_merged: "Lead birlestirildi",
  export_created: "Disa aktarim yapildi",
  extension_import: "Extension'dan veri alindi",
  competitor_toggled: "Rakip durumu degisti",
};

// ---------------------------------------------------------------------------
// Action type -> ikon
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, React.ReactNode> = {
  search_started: <Search className="h-4 w-4 text-blue-500" />,
  search_completed: <Search className="h-4 w-4 text-blue-500" />,
  post_classified: <FileCheck className="h-4 w-4 text-indigo-500" />,
  lead_created: <UserPlus className="h-4 w-4 text-purple-500" />,
  lead_stage_changed: <ArrowRightLeft className="h-4 w-4 text-orange-500" />,
  message_generated: <Mail className="h-4 w-4 text-amber-500" />,
  message_approved: <Mail className="h-4 w-4 text-emerald-500" />,
  message_sent: <Mail className="h-4 w-4 text-green-500" />,
  lead_merged: <UserPlus className="h-4 w-4 text-cyan-500" />,
  export_created: <Download className="h-4 w-4 text-gray-500" />,
  extension_import: <Globe className="h-4 w-4 text-blue-600" />,
  competitor_toggled: <Shield className="h-4 w-4 text-red-500" />,
};

// ---------------------------------------------------------------------------
// Entity type -> sayfa yonlendirme
// ---------------------------------------------------------------------------

function getNavigationPath(entityType: string): string {
  switch (entityType) {
    case "lead":
      return "/pipeline";
    case "search_run":
    case "post":
      return "/search";
    case "message":
      return "/pipeline";
    default:
      return "/dashboard";
  }
}

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Az once";
  if (diffMin < 60) return `${diffMin}dk once`;
  if (diffHour < 24) return `${diffHour}sa once`;
  if (diffDay === 1) return "Dun";
  if (diffDay < 7) return `${diffDay}g once`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Skeleton loader for notification items
// ---------------------------------------------------------------------------

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5">
      <Skeleton className="h-7 w-7 rounded-md shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-3 w-12 shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 60_000; // 60 saniye

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Unread count polling ----
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) return;
      const json = await res.json();
      setUnreadCount(json.count ?? 0);
    } catch {
      // sessizce yut
    }
  }, []);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  // ---- Dropdown acildiginda bildirimleri yukle ----
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } catch {
      // sessizce yut
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications();
    }
  };

  // ---- Tumunu okundu isaretle ----
  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // sessizce yut
    } finally {
      setMarkingAll(false);
    }
  };

  // ---- Tek bildirime tikla ----
  const handleNotificationClick = async (notification: NotificationItem) => {
    // Okundu isaretle
    if (!notification.isRead) {
      try {
        await fetch("/api/notifications/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // sessizce yut
      }
    }

    setOpen(false);
    router.push(getNavigationPath(notification.entityType));
  };

  // ---- Badge metni ----
  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Bildirimler"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Bildirimler</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tumunu okundu isaretle
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Yeni bildirim yok
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const icon =
                  ACTION_ICONS[notification.actionType] ?? (
                    <Bell className="h-4 w-4 text-gray-400" />
                  );
                const label =
                  ACTION_LABELS[notification.actionType] ??
                  notification.actionType;

                // Details'den ek aciklama cikar
                const details = notification.details ?? {};
                const detailText =
                  (details.description as string) ??
                  (details.name as string) ??
                  (details.leadName as string) ??
                  "";

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    {/* Okunmamis gosterge + ikon */}
                    <div className="relative mt-0.5 shrink-0">
                      <div className="rounded-md bg-muted p-1.5">{icon}</div>
                      {!notification.isRead && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Icerik */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p
                        className={`text-sm truncate ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "font-medium text-foreground"
                        }`}
                      >
                        {label}
                      </p>
                      {detailText && (
                        <p className="text-xs text-muted-foreground truncate">
                          {detailText}
                        </p>
                      )}
                    </div>

                    {/* Zaman */}
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
