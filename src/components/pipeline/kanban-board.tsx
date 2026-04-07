"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building,
  FileText,
  MessageSquare,
  Clock,
  Swords,
} from "lucide-react";
import { type LeadData } from "./pipeline-table";

// Stage konfigurasyonu
const STAGES = [
  {
    key: "İletişim Kurulacak",
    label: "İletişim Kurulacak",
    color: "bg-blue-500",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300",
    headerBg: "bg-blue-500/10",
    dropHighlight: "bg-blue-100/60 dark:bg-blue-900/30 ring-2 ring-blue-400/40",
  },
  {
    key: "İletişim Kuruldu",
    label: "İletişim Kuruldu",
    color: "bg-yellow-500",
    bgLight: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    textColor: "text-yellow-700 dark:text-yellow-300",
    headerBg: "bg-yellow-500/10",
    dropHighlight:
      "bg-yellow-100/60 dark:bg-yellow-900/30 ring-2 ring-yellow-400/40",
  },
  {
    key: "Cevap Alındı",
    label: "Cevap Alındı",
    color: "bg-orange-500",
    bgLight: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    textColor: "text-orange-700 dark:text-orange-300",
    headerBg: "bg-orange-500/10",
    dropHighlight:
      "bg-orange-100/60 dark:bg-orange-900/30 ring-2 ring-orange-400/40",
  },
  {
    key: "Görüşme",
    label: "Görüşme",
    color: "bg-purple-500",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    textColor: "text-purple-700 dark:text-purple-300",
    headerBg: "bg-purple-500/10",
    dropHighlight:
      "bg-purple-100/60 dark:bg-purple-900/30 ring-2 ring-purple-400/40",
  },
  {
    key: "Teklif",
    label: "Teklif",
    color: "bg-emerald-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    textColor: "text-emerald-700 dark:text-emerald-300",
    headerBg: "bg-emerald-500/10",
    dropHighlight:
      "bg-emerald-100/60 dark:bg-emerald-900/30 ring-2 ring-emerald-400/40",
  },
  {
    key: "Arşiv",
    label: "Arşiv",
    color: "bg-gray-400",
    bgLight: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-700",
    textColor: "text-gray-500 dark:text-gray-400",
    headerBg: "bg-gray-500/10",
    dropHighlight:
      "bg-gray-100/60 dark:bg-gray-800/30 ring-2 ring-gray-400/40",
  },
] as const;

type StageConfig = (typeof STAGES)[number];

interface KanbanBoardProps {
  leads: LeadData[];
  loading: boolean;
  onSelectLead?: (lead: LeadData) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
}

// ==========================================
// Droppable Column
// ==========================================
function KanbanColumn({
  stage,
  leads,
  onSelectLead,
  isOverThis,
}: {
  stage: StageConfig;
  leads: LeadData[];
  onSelectLead?: (lead: LeadData) => void;
  isOverThis: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${stage.key}`,
    data: { type: "column", stageKey: stage.key },
  });

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      {/* Column Header */}
      <div
        className={`rounded-t-xl border ${stage.borderColor} ${stage.headerBg} px-3 py-2.5 flex items-center gap-2`}
      >
        <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
        <h3 className={`text-xs font-semibold ${stage.textColor} truncate`}>
          {stage.label}
        </h3>
        <Badge
          variant="secondary"
          className="ml-auto text-[10px] h-5 min-w-[20px] justify-center"
        >
          {leads.length}
        </Badge>
      </div>

      {/* Column Body - droppable area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 rounded-b-xl border border-t-0 p-2 space-y-2
          min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto
          transition-all duration-200 ease-in-out
          ${stage.borderColor}
          ${isOverThis ? stage.dropHighlight : "bg-muted/20"}
        `}
      >
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            onSelect={() => onSelectLead?.(lead)}
          />
        ))}

        {leads.length === 0 && !isOverThis && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
            <FileText className="h-7 w-7 mb-1.5" />
            <p className="text-[11px] font-medium">Lead yok</p>
            <p className="text-[10px] mt-0.5">Buraya surukleyin</p>
          </div>
        )}

        {leads.length === 0 && isOverThis && (
          <div className="flex flex-col items-center justify-center py-10 text-primary/60">
            <div className="h-12 w-12 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-medium">Birakin</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Draggable Card (useDraggable - tum kart suruklenebilir)
// ==========================================
function DraggableCard({
  lead,
  onSelect,
}: {
  lead: LeadData;
  onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { type: "card", lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`transition-all duration-200 touch-none ${
        isDragging ? "opacity-30 scale-95" : "opacity-100"
      }`}
    >
      <LeadCard
        lead={lead}
        onSelect={onSelect}
        isDragging={isDragging}
      />
    </div>
  );
}

// ==========================================
// Lead Card (shared between board and overlay)
// ==========================================
function LeadCard({
  lead,
  onSelect,
  isDragging = false,
  isOverlay = false,
}: {
  lead: LeadData;
  onSelect?: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}) {
  const initials = lead.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (score >= 60)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  };

  const getScoreDot = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div
      className={`
        group rounded-lg border bg-card p-3 transition-all duration-150 select-none
        ${
          isOverlay
            ? "shadow-2xl ring-2 ring-primary/30 rotate-[2deg] scale-105 cursor-grabbing"
            : isDragging
            ? "cursor-grabbing"
            : "shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
        }
      `}
      onClick={() => {
        // Sadece sürükleme degilse tiklama olarak say
        if (!isDragging && !isOverlay && onSelect) {
          onSelect();
        }
      }}
    >
      {/* Top row: avatar + name + score */}
      <div className="flex items-start gap-2.5">
        <Avatar className="h-9 w-9 shrink-0">
          {lead.profilePicture && (
            <AvatarImage src={lead.profilePicture} alt={lead.name} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate">
            {lead.name}
          </p>
          {lead.title && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {lead.title}
            </p>
          )}
        </div>

        {/* Score badge with dot indicator */}
        <div className="flex items-center gap-1 shrink-0">
          <div className={`h-1.5 w-1.5 rounded-full ${getScoreDot(lead.score)}`} />
          <Badge className={`text-[10px] font-mono ${getScoreColor(lead.score)}`}>
            {lead.score}
          </Badge>
        </div>
      </div>

      {/* Company + Competitor */}
      {(lead.company || lead.isCompetitor) && (
        <div className="flex items-center gap-1.5 mt-2">
          <Building className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">
            {lead.company || "-"}
          </span>
          {lead.isCompetitor && (
            <span title="Rakip"><Swords className="h-3 w-3 text-red-500 shrink-0" /></span>
          )}
        </div>
      )}

      {/* Project Type */}
      {lead.projectType && (
        <div className="mt-1.5">
          <Badge variant="outline" className="text-[9px] font-normal h-4 px-1.5">
            {lead.projectType}
          </Badge>
        </div>
      )}

      {/* Pain points & interests tags */}
      {(lead.painPoints?.length > 0 || lead.keyInterests?.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.painPoints?.slice(0, 2).map((p, i) => (
            <span
              key={`pain-${i}`}
              className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 text-[9px] text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-800"
            >
              {p.length > 18 ? p.slice(0, 18) + "..." : p}
            </span>
          ))}
          {lead.keyInterests?.slice(0, 2).map((k, i) => (
            <span
              key={`interest-${i}`}
              className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 text-[9px] text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-200 dark:ring-blue-800"
            >
              {k.length > 18 ? k.slice(0, 18) + "..." : k}
            </span>
          ))}
        </div>
      )}

      {/* Footer: post count + date */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span className="text-[10px]">{lead.postCount}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-[10px]">{formatRelativeDate(lead.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Az once";
  if (diffHours < 24) return `${diffHours}sa`;
  if (diffDays < 7) return `${diffDays}g`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}h`;
  return `${Math.floor(diffDays / 30)}ay`;
}

// ==========================================
// Loading Skeleton
// ==========================================
function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div key={stage.key} className="min-w-[280px] w-[280px] shrink-0">
          <div
            className={`rounded-t-xl border ${stage.borderColor} ${stage.headerBg} px-3 py-2.5 flex items-center gap-2`}
          >
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-5 ml-auto rounded" />
          </div>
          <div
            className={`rounded-b-xl border border-t-0 ${stage.borderColor} bg-muted/20 p-2 space-y-2 min-h-[200px]`}
          >
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                  <Skeleton className="h-5 w-8 rounded" />
                </div>
                <Skeleton className="h-2.5 w-32 ml-10" />
                <div className="flex gap-1 ml-10">
                  <Skeleton className="h-4 w-14 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <div className="flex justify-between ml-10">
                  <Skeleton className="h-2.5 w-8" />
                  <Skeleton className="h-2.5 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Kanban Board (Main)
// ==========================================
export function KanbanBoard({
  leads,
  loading,
  onSelectLead,
  onStageChange,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnKey, setOverColumnKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Lead'leri stage'lere gore grupla
  const groupedLeads = useMemo(() => {
    const groups: Record<string, LeadData[]> = {};
    for (const stage of STAGES) {
      groups[stage.key] = [];
    }
    for (const lead of leads) {
      if (groups[lead.stage]) {
        groups[lead.stage].push(lead);
      } else {
        groups[STAGES[0].key].push(lead);
      }
    }
    return groups;
  }, [leads]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeId) || null,
    [leads, activeId]
  );

  // Find which column a droppable/draggable belongs to
  const findColumnKey = useCallback(
    (id: string | number): string | null => {
      const idStr = String(id);

      // Direct column drop
      if (idStr.startsWith("column-")) {
        return idStr.replace("column-", "");
      }

      // It's a card id - find which stage it belongs to
      for (const stage of STAGES) {
        const stageLeads = groupedLeads[stage.key];
        if (stageLeads?.some((l) => l.id === idStr)) {
          return stage.key;
        }
      }

      return null;
    },
    [groupedLeads]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverColumnKey(null);
        return;
      }
      const columnKey = findColumnKey(over.id);
      setOverColumnKey(columnKey);
    },
    [findColumnKey]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumnKey(null);

      if (!over) return;

      const leadId = active.id as string;
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      const targetStage = findColumnKey(over.id);

      if (targetStage && targetStage !== lead.stage) {
        onStageChange?.(leadId, targetStage);
      }
    },
    [leads, findColumnKey, onStageChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumnKey(null);
  }, []);

  if (loading) {
    return <KanbanSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            leads={groupedLeads[stage.key] || []}
            onSelectLead={onSelectLead}
            isOverThis={overColumnKey === stage.key}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="w-[264px]">
            <LeadCard lead={activeLead} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
