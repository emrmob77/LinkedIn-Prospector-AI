"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  CheckCircle,
  ArrowRight,
  Zap,
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
}

const activities: Activity[] = [
  {
    id: "1",
    type: "message_approved",
    title: "Mesaj onaylandı",
    description: "Ahmet Yılmaz için iletişim mesajı onaylandı",
    time: "2 dk önce",
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    badgeLabel: "Onay",
    badgeVariant: "default",
  },
  {
    id: "2",
    type: "lead_created",
    title: "Yeni lead oluşturuldu",
    description: "Mehmet Demir - ABC Teknoloji (Skor: 82)",
    time: "15 dk önce",
    icon: <UserPlus className="h-4 w-4 text-purple-500" />,
    badgeLabel: "Lead",
    badgeVariant: "secondary",
  },
  {
    id: "3",
    type: "lead_stage_changed",
    title: "Aşama değişikliği",
    description: "Ayşe Kaya: İletişim Kurulacak → İletişim Kuruldu",
    time: "32 dk önce",
    icon: <ArrowRight className="h-4 w-4 text-orange-500" />,
    badgeLabel: "Pipeline",
    badgeVariant: "outline",
  },
  {
    id: "4",
    type: "search_completed",
    title: "Arama tamamlandı",
    description: '"kurumsal hediye" - 47 gönderi, 12 ilgili lead bulundu',
    time: "1 saat önce",
    icon: <Search className="h-4 w-4 text-blue-500" />,
    badgeLabel: "Arama",
    badgeVariant: "secondary",
  },
  {
    id: "5",
    type: "message_generated",
    title: "AI mesaj oluşturuldu",
    description: "Fatma Şahin için kişiselleştirilmiş mesaj hazırlandı",
    time: "2 saat önce",
    icon: <Zap className="h-4 w-4 text-amber-500" />,
    badgeLabel: "AI",
    badgeVariant: "outline",
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Son Aktiviteler</CardTitle>
        <CardDescription className="text-xs">
          Son 24 saatteki sistem aktiviteleri
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5 rounded-md bg-muted p-1.5">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <Badge variant={activity.badgeVariant} className="text-[10px] h-4 px-1.5 shrink-0">
                    {activity.badgeLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
