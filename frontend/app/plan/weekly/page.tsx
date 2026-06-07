"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, CalendarDays } from "lucide-react";
import { TaskCard, PlanTask } from "@/components/plan/TaskCard";
import { MilestoneToast, MILESTONES, Milestone } from "@/components/MilestoneToast";
import { staggerContainer, fadeUp } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function WeeklyPlanPage() {
  const [tasks,      setTasks]      = useState<PlanTask[]>([]);
  const [planId,     setPlanId]     = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving,  setApproving]  = useState<string | null>(null);
  const [error,      setError]      = useState("");
  const [warnings,   setWarnings]   = useState<string[]>([]);
  const [milestone,  setMilestone]  = useState<Milestone | null>(null);
  const confettiFired = useRef(false);

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
        setTasks(data.tasks.map(_normalizeTask));
      }
    } catch {
      setError("Plan yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  async function generate() {
    setGenerating(true); setError(""); setWarnings([]);
    try {
      const res = await fetch(`${BACKEND}/api/plan/generate`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Plan oluşturulamadı.");
      }
      const data = await res.json();
      setPlanId(data.plan_id);
      setTasks(data.tasks.map(_normalizeTask));
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
        method: "POST", credentials: "include",
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => {
        const next = prev.map((t) => t.id === taskId ? { ...t, status: "approved" as const } : t);
        const allDone = next.filter((t) => t.status !== "rejected").every((t) => t.status === "approved");
        if (allDone && !confettiFired.current) {
          confettiFired.current = true;
          setMilestone(MILESTONES.allApproved);
        }
        return next;
      });
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
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.errors?.length) setError(`${data.errors.length} görev eklenemedi.`);
      await fetchPlan();
      if (!confettiFired.current) {
        confettiFired.current = true;
        setMilestone(MILESTONES.allApproved);
      }
    } catch {
      setError("Toplu onayda hata oluştu.");
    } finally {
      setApproving(null);
    }
  }

  function rejectTask(taskId: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "rejected" as const } : t));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
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

  const pendingCount  = tasks.filter((t) => t.status === "pending").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const tasksByDay    = DAYS.map((_, i) => {
    const dateStr = getDateForOffset(i);
    return tasks.filter((t) => t.date === dateStr && t.status !== "rejected");
  });

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#F0E4D7] border-t-[#FF6B35] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      <MilestoneToast milestone={milestone} onClose={() => setMilestone(null)} />

      {/* ── Header ── */}
      <header className="gradient-hero px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-800 text-lg leading-tight">Bu Haftanın Planı</h1>
            <p className="text-white/70 text-xs mt-0.5">
              {tasks.length === 0
                ? "Henüz plan oluşturulmamış"
                : `${pendingCount} onay bekliyor · ${approvedCount} onaylandı`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 text-xs font-600 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50">
              <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
              {generating ? "Oluşturuluyor..." : tasks.length === 0 ? "Plan Oluştur" : "Yenile"}
            </button>
            {pendingCount > 0 && (
              <button onClick={approveAll} disabled={approving === "all"}
                className="text-xs font-700 bg-white text-[#FF6B35] px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors disabled:opacity-50">
                {approving === "all" ? "Ekleniyor..." : `Tümünü Onayla (${pendingCount})`}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Uyarılar ── */}
      <AnimatePresence>
        {(error || warnings.length > 0) && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show"
            className="px-4 pt-3 space-y-2">
            {error && (
              <motion.div variants={fadeUp}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
            {warnings.map((w, i) => (
              <motion.div key={i} variants={fadeUp}
                className="text-sm text-[#A88070] bg-[#FFF8EE] border border-[#FFE0B2] rounded-xl px-4 py-2.5">
                ⚠️ {w}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Boş durum ── */}
      {tasks.length === 0 && !generating && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show"
          className="flex flex-col items-center justify-center py-24 gap-4 px-6">
          <motion.div variants={fadeUp}
            className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center">
            <CalendarDays size={28} strokeWidth={1.5} className="text-[#FF6B35]" />
          </motion.div>
          <motion.div variants={fadeUp} className="text-center">
            <p className="font-700 text-[#1A0F0A] text-base">Haftalık plan hazır değil</p>
            <p className="text-sm text-[#A88070] mt-1 max-w-xs leading-relaxed">
              Gmail, takvim ve yapılacaklar dosyanı okuyarak bu haftanın planını hazırlarım.
            </p>
          </motion.div>
          <motion.button variants={fadeUp} whileTap={{ scale: 0.97 }}
            onClick={generate}
            className="px-6 py-3 rounded-2xl gradient-primary text-white text-sm font-700 hover:opacity-90 transition-opacity">
            Plan Oluştur ✨
          </motion.button>
        </motion.div>
      )}

      {/* ── Generating ── */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-[#F0E4D7] border-t-[#FF6B35] rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">📋</span>
          </div>
          <div className="text-center">
            <p className="font-600 text-[#1A0F0A] text-sm">Plan hazırlanıyor...</p>
            <p className="text-xs text-[#A88070] mt-1">Gmail, takvim ve yapılacaklar okunuyor</p>
          </div>
        </div>
      )}

      {/* ── Haftalık Grid ── */}
      {tasks.length > 0 && !generating && (
        <>
          {/* Gün başlıkları — horizontally scrollable on mobile */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Başlıklar */}
              <div className="grid grid-cols-7 bg-white border-b border-[#F0E4D7]">
                {DAYS.map((day, i) => (
                  <div key={day} className="border-r border-[#F0E4D7] last:border-r-0 px-1.5 py-2.5 text-center">
                    <p className="text-[10px] font-600 text-[#A88070] uppercase tracking-wide">{day}</p>
                    <p className="text-sm font-700 text-[#1A0F0A] mt-0.5">{getDateLabel(i)}</p>
                  </div>
                ))}
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-7 min-h-[calc(100vh-200px)]">
                  {DAYS.map((day, i) => {
                    const dayTasks = tasksByDay[i];
                    return (
                      <div key={day} className="border-r border-[#F0E4D7] last:border-r-0 p-1.5 space-y-1.5">
                        <SortableContext items={dayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          {dayTasks.map((task) => (
                            <TaskCard key={task.id} task={task}
                              approving={approving === task.id}
                              onApprove={() => approveTask(task.id)}
                              onReject={() => rejectTask(task.id)} />
                          ))}
                        </SortableContext>
                        {dayTasks.length === 0 && (
                          <div className="h-14 border-2 border-dashed border-[#F0E4D7] rounded-2xl flex items-center justify-center">
                            <span className="text-[10px] text-[#D8C4B8]">Boş</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DndContext>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function _normalizeTask(t: Record<string, unknown>): PlanTask {
  const startStr = String(t.start_time ?? "");
  const endStr   = String(t.end_time ?? "");
  const date     = startStr.split("T")[0] ?? String(t.date ?? "");
  const start_time = startStr.includes("T") ? startStr.split("T")[1].slice(0, 5) : String(t.start_time ?? "");
  const end_time   = endStr.includes("T")   ? endStr.split("T")[1].slice(0, 5)   : String(t.end_time ?? "");
  return {
    id: String(t.id ?? t.plan_id ?? Math.random()),
    title: String(t.title ?? ""),
    date, start_time, end_time,
    duration_min: Number(t.duration_min ?? 60),
    priority: (t.priority as "high" | "medium" | "low") ?? "medium",
    source: (t.source as "sheets" | "gmail" | "manual") ?? "manual",
    location: t.location ? String(t.location) : undefined,
    travel_time_min: t.travel_time_min ? Number(t.travel_time_min) : undefined,
    reasoning: t.description ? String(t.description) : undefined,
    status: (t.status as "pending" | "approved" | "rejected") ?? "pending",
  };
}

function getWeekMonday(): Date {
  const today   = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const monday  = new Date(today);
  monday.setHours(0, 0, 0, 0);
  if (weekday >= 3) monday.setDate(today.getDate() + (7 - weekday));
  else              monday.setDate(today.getDate() - weekday);
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
