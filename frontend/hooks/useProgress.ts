"use client";
import { useEffect, useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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

export function useProgress() {
  const [data, setData]       = useState<Progress>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/stats/progress`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { progress: data, loading };
}
