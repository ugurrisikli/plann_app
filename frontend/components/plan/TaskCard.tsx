"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
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

const SOURCE_COLORS: Record<string, string> = {
  sheets: "bg-blue-50 border-blue-200",
  gmail: "bg-amber-50 border-amber-200",
  manual: "bg-zinc-50 border-zinc-200",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-zinc-300",
};

interface TaskCardProps {
  task: PlanTask;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving?: boolean;
  isDragging?: boolean;
}

export function TaskCard({ task, onApprove, onReject, approving, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border p-3 text-sm cursor-grab active:cursor-grabbing select-none",
        SOURCE_COLORS[task.source],
        isDragging && "opacity-50",
        task.status === "approved" && "opacity-60"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <span className={cn("w-2 h-2 rounded-full mt-1 shrink-0", PRIORITY_DOT[task.priority])} />
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug truncate">{task.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {task.start_time} – {task.end_time}
            {task.travel_time_min && (
              <span className="ml-2 text-zinc-400">🚗 {task.travel_time_min} dk</span>
            )}
          </p>
          {task.location && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">📍 {task.location}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {task.source === "sheets" ? "📋" : task.source === "gmail" ? "📧" : "✏️"}
        </Badge>
      </div>

      {task.status === "pending" && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-current/10">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}
            disabled={approving}
            className="flex-1 text-xs py-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {approving ? "..." : "Onayla"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(task.id); }}
            disabled={approving}
            className="flex-1 text-xs py-1 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            Reddet
          </button>
        </div>
      )}
      {task.status === "approved" && (
        <p className="text-xs text-green-600 mt-2 pt-2 border-t border-green-100">✓ Takvime eklendi</p>
      )}
    </div>
  );
}
