"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  Package,
  FileText,
  LogOut,
  Settings,
  UserCircle,
  MessageSquare,
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: "LinkedIn Arama",
    href: "/search",
    icon: Search,
    badge: null,
  },
  {
    label: "İletişim Hattı",
    href: "/pipeline",
    icon: Users,
    badge: null,
  },
  {
    label: "Mesajlar",
    href: "/messages",
    icon: MessageSquare,
    badge: null,
  },
  {
    label: "Ürünler",
    href: "/products",
    icon: Package,
    badge: null,
  },
  {
    label: "Raporlama",
    href: "/reports",
    icon: FileText,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0] || "Kullanıcı";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <aside className="hidden md:flex h-screen w-[260px] flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <LinkedinIcon className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none">Prospector AI</span>
          <span className="text-[10px] text-muted-foreground leading-none mt-0.5">LinkedIn Lead Platformu</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Ana Menü
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "h-5 min-w-[20px] justify-center text-[10px] font-medium",
                    isActive && "bg-primary-foreground/20 text-primary-foreground border-0"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}

        <Separator className="my-3" />

        <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Ayarlar
        </p>
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
            pathname === "/profile"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <UserCircle className="h-4 w-4" />
          Hesabim
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Yapilandirma
        </Link>
      </nav>

      {/* User section */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={signOut}
            aria-label="Çıkış yap"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
