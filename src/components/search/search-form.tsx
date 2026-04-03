"use client";

import { Badge } from "@/components/ui/badge";
import { Search, Download, CheckCircle, Puzzle } from "lucide-react";

export function SearchForm() {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Puzzle className="h-3.5 w-3.5" />
        <span className="font-medium">Nasil Calisir?</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto text-[11px]">
        <Step n={1} icon={Search} text="LinkedIn'de arama yapin" />
        <Chevron />
        <Step n={2} icon={Puzzle} text="Extension ile tarayin" />
        <Chevron />
        <Step n={3} icon={Download} text="Ice Aktar'a tiklayin" />
        <Chevron />
        <Step n={4} icon={CheckCircle} text="Sonuclar burada" />
      </div>
      <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
        Chrome Extension
      </Badge>
    </div>
  );
}

function Step({ n, icon: Icon, text }: { n: number; icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0">
        {n}
      </span>
      <Icon className="h-3 w-3 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function Chevron() {
  return <span className="text-muted-foreground/40 text-xs shrink-0">&rsaquo;</span>;
}
