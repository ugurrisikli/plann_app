"use client";
import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { TaskCard, PlanTask } from "@/components/plan/TaskCard";
import { RefreshCw, AlertCircle } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function WeeklyPlanPage() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/plan/weekly`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.plan) {
        setPlanId(data.plan.id);
        setTasks(data.tasks.map((t: Record<string, unknown>) => _normalizeTask(t)));
      }
    } catch {
      setError("Plan yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  async function generate() {
    setGenerating(true);
    setError("");
    setWarnings([]);
    try {
      const res = await fetch(`${BACKEND}/api/plan/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Plan oluşturulamadı.");
      }
      const data = await res.json();
      setPlanId(data.plan_id);
      setTasks(data.tasks.map((t: Record<string, unknown>) => _normalizeTask(t)));
      if (data.warnings?.length) setWarnings(data.warnings);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setGenerating(false);
    }
  }

  async function approveTask(taskId: string) {
    setApproving(taskId);
    try {
      const res = await fetch(`${BACKEND}/api/plan/approve/${taskId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Onay başarısız");
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "approved" } : t));
    } catch {
      setError("Takvime eklenirken hata oluştu.");
    } finally {
      setApproving(null);
    }
  }

  async function approveAll() {
    setApproving("all");
    try {
      const res = await fetch(`${BACKEND}/api/plan/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Onay başarısız");
      const data = await res.json();
      if (data.errors?.length) setError(`${data.errors.length} görev eklenemedi.`);
      // Başarılı olanları approved yap
      await fetchPlan();
    } catch {
      setError("Toplu onayda hata oluştu.");
    } finally {
      setApproving(null);
    }
  }

  function rejectTask(taskId: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "rejected" } : t));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        // Sıralamayı backend'e kaydet (fire-and-forget)
        next.forEach((task, i) => {
          fetch(`${BACKEND}/api/plan/task/${task.id}`, {
            method: "PATCH", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: i }),
          }).catch(() => {});
        });
        return next;
      });
    }
  }

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;

  const tasksByDay = DAYS.map((_, i) => {
    const dateStr = getDateForOffset(i);
    return tasks.filter((t) => t.date === dateStr && t.status !== "rejected");
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">Bu Haftanın Planı</h1>
          <p className="text-sm text-zinc-500">
            {tasks.length === 0
              ? "Henüz plan yok"
              : `${pendingCount} görev onay bekliyor · ${approvedCount} onaylandı`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            {generating ? "Oluşturuluyor..." : tasks.length === 0 ? "Plan Oluştur" : "Yenile"}
          </button>
          {pendingCount > 0 && (
            <button
              onClick={approveAll}
              disabled={approving === "all"}
              className="text-sm px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {approving === "all" ? "Ekleniyor..." : `Tümünü Onayla (${pendingCount})`}
            </button>
          )}
        </div>
      </header>

      {/* Uyarılar */}
      {(error || warnings.length > 0) && (
        <div className="px-6 pt-3 space-y-2">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {warnings.map((w, i) => (
            <div key={i} className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Boş durum */}
      {tasks.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-zinc-400 text-sm">Henüz bu hafta için plan oluşturulmamış.</p>
          <button
            onClick={generate}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700"
          >
            Plan Oluştur
          </button>
          <p className="text-xs text-zinc-400 max-w-xs text-center">
            Gmail, takvim ve yapılacaklar dosyanı okuyarak bu haftanın planını hazırlarım.
          </p>
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Gmail, takvim ve yapılacaklar okunuyor...</p>
        </div>
      )}

      {/* Haftalık Grid */}
      {tasks.length > 0 && !generating && (
        <>
          <div className="grid grid-cols-7 gap-0 border-b border-zinc-200 mt-3">
            {DAYS.map((day, i) => (
              <div key={day} className="bg-white border-r border-zinc-200 last:border-r-0 px-3 py-2 text-center">
                <p className="text-xs font-medium text-zinc-500">{day}</p>
                <p className="text-sm font-semibold">{getDateLabel(i)}</p>
              </div>
            ))}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-7 gap-0 min-h-[calc(100vh-220px)]">
              {DAYS.map((day, i) => {
                const dayTasks = tasksByDay[i];
                return (
                  <div key={day} className="border-r border-zinc-200 last:border-r-0 p-2 space-y-2">
                    <SortableContext items={dayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {dayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          approving={approving === task.id}
                          onApprove={() => approveTask(task.id)}
                          onReject={() => rejectTask(task.id)}
                        />
                      ))}
                    </SortableContext>
                    {dayTasks.length === 0 && (
                      <div className="h-16 border-2 border-dashed border-zinc-100 rounded-xl flex items-center justify-center">
                        <span className="text-xs text-zinc-300">Boş</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DndContext>
        </>
      )}
    </div>
  );
}

function _normalizeTask(t: Record<string, unknown>): PlanTask {
  // start_time "2026-06-09T10:00:00" formatından date + time çıkar
  const startStr = String(t.start_time ?? "");
  const endStr = String(t.end_time ?? "");
  const date = startStr.split("T")[0] ?? String(t.date ?? "");
  const start_time = startStr.includes("T") ? startStr.split("T")[1].slice(0, 5) : String(t.start_time ?? "");
  const end_time = endStr.includes("T") ? endStr.split("T")[1].slice(0, 5) : String(t.end_time ?? "");

  return {
    id: String(t.id ?? t.plan_id ?? Math.random()),
    title: String(t.title ?? ""),
    date,
    start_time,
    end_time,
    duration_min: Number(t.duration_min ?? 60),
    priority: (t.priority as "high" | "medium" | "low") ?? "medium",
    source: (t.source as "gmail" | "sheets" | "manual") ?? "manual",
    location: t.location ? String(t.location) : undefined,
    travel_time_min: t.travel_time_min ? Number(t.travel_time_min) : undefined,
    reasoning: t.description ? String(t.description) : undefined,
    status: (t.status as "pending" | "approved" | "rejected") ?? "pending",
  };
}

// Backend ile tutarlı: Per(3)+ → gelecek Pzt, Pzt-Çar → bu haftanın Pzt'si
function getWeekMonday(): Date {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  if (weekday >= 3) {
    monday.setDate(today.getDate() + (7 - weekday));
  } else {
    monday.setDate(today.getDate() - weekday);
  }
  return monday;
}

function getDateForOffset(dayOffset: number): string {
  const monday = getWeekMonday();
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOffset);
  return target.toISOString().split("T")[0];
}

function getDateLabel(dayOffset: number): string {
  const monday = getWeekMonday();
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOffset);
  return `${target.getDate()}/${target.getMonth() + 1}`;
}
