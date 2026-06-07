"use client";
import { useEffect, useRef, useState } from "react";
import { Milestone, MILESTONES } from "@/components/MilestoneToast";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const SEEN_KEY = "planlama_seen_milestones";

export interface Progress {
  weekly_approved: number;
  weekly_total:    number;
  streak_weeks:    number;
  total_plans:     number;
  level:           number;
  level_name:      string;
  level_pct:       number;
  next_threshold:  number;
}

const DEFAULT: Progress = {
  weekly_approved: 0, weekly_total: 0,
  streak_weeks: 0,    total_plans: 0,
  level: 1,           level_name: "Başlangıç",
  level_pct: 0,       next_threshold: 5,
};

function seenMilestones(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markSeen(id: string) {
  try {
    const s = seenMilestones();
    s.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch {}
}

function detectMilestone(p: Progress): Milestone | null {
  const seen = seenMilestones();

  if (p.total_plans === 1 && !seen.has(MILESTONES.firstPlan.id))  return MILESTONES.firstPlan;
  if (p.total_plans === 10 && !seen.has(MILESTONES.plan10.id))    return MILESTONES.plan10;
  if (p.total_plans === 25 && !seen.has(MILESTONES.plan25.id))    return MILESTONES.plan25;
  if (p.streak_weeks === 5 && !seen.has(MILESTONES.streak5.id))   return MILESTONES.streak5;
  if (p.streak_weeks === 10 && !seen.has(MILESTONES.streak10.id)) return MILESTONES.streak10;

  // Tüm haftalık görevler onaylandı
  if (
    p.weekly_total > 0 &&
    p.weekly_approved === p.weekly_total &&
    !seen.has(MILESTONES.allApproved.id + "_" + new Date().toISOString().slice(0, 10))
  ) {
    return MILESTONES.allApproved;
  }

  return null;
}

export function useProgress() {
  const [data, setData]             = useState<Progress>(DEFAULT);
  const [loading, setLoading]       = useState(true);
  const [milestone, setMilestone]   = useState<Milestone | null>(null);
  const initialized                 = useRef(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/stats/progress`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setData(d);
        // Sadece mount'tan sonraki gerçek değer için kontrol et (sayfa yüklenince)
        if (!initialized.current) {
          initialized.current = true;
          const m = detectMilestone(d);
          if (m) setMilestone(m);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function dismissMilestone() {
    if (milestone) {
      // allApproved için tarihe göre key
      const key = milestone.id.startsWith("all-approved")
        ? milestone.id + "_" + new Date().toISOString().slice(0, 10)
        : milestone.id;
      markSeen(key);
    }
    setMilestone(null);
  }

  return { progress: data, loading, milestone, dismissMilestone };
}
