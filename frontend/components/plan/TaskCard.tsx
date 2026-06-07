"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PlanTask {
  id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  priority: "high" | "medium" | "low";
  source: "sheets" | "gmail" | "manual";
  location?: string;
  travel_time_min?: number;
  reasoning?: string;
  status: "pending" | "approved" | "rejected";
}

const SOURCE_BG: Record<string, string> = {
  sheets: "bg-blue-50 border-blue-200",
  gmail:  "bg-[#FFF8EE] border-[#FFE0B2]",
  manual: "bg-[#FFF1EC] border-[#FFD5C2]",
};

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-[#FF6B35]",
  low:    "bg-[#F0E4D7]",
};

const SOURCE_ICON: Record<string, string> = {
  sheets: "📋", gmail: "📧", manual: "✏️",
};

interface TaskCardProps {
  task: PlanTask;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving?: boolean;
  isDragging?: boolean;
}

export function TaskCard({ task, onApprove, onReject, approving, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "rounded-2xl border p-3 text-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150",
        SOURCE_BG[task.source],
        isDragging && "opacity-50 scale-95",
        task.status === "approved" && "opacity-55"
      )}
      {...attributes} {...listeners}
    >
      <div className="flex items-start gap-2">
        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", PRIORITY_DOT[task.priority])} />
        <div className="flex-1 min-w-0">
          <p className="font-600 text-[#1A0F0A] leading-snug truncate text-xs">{task.title}</p>
          <p className="text-[11px] text-[#A88070] mt-0.5">
            {task.start_time} – {task.end_time}
            {task.travel_time_min && (
              <span className="ml-1.5 text-[#C4A899]">🚗{task.travel_time_min}dk</span>
            )}
          </p>
          {task.location && (
            <p className="text-[11px] text-[#A88070] mt-0.5 truncate">📍 {task.location}</p>
          )}
        </div>
        <span className="text-xs shrink-0">{SOURCE_ICON[task.source]}</span>
      </div>

      {task.status === "pending" && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-black/5">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
            disabled={approving}
            className="flex-1 text-[11px] py-1 rounded-lg gradient-primary text-white disabled:opacity-50 transition-opacity font-600"
          >
            {approving ? "..." : "Onayla"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(task.id); }}
            disabled={approving}
            className="flex-1 text-[11px] py-1 rounded-lg border border-[#F0E4D7] text-[#A88070] hover:bg-white disabled:opacity-50 transition-colors"
          >
            Reddet
          </button>
        </div>
      )}
      {task.status === "approved" && (
        <p className="text-[11px] text-green-600 mt-2 pt-2 border-t border-green-100/80 font-500">✓ Takvime eklendi</p>
      )}
    </div>
  );
}
