"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, CalendarDays, Sparkles, ArrowRight, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { StreakCard }   from "@/components/dashboard/StreakCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { WeeklyScore }  from "@/components/dashboard/WeeklyScore";
import { MeTimeCard }   from "@/components/dashboard/MeTimeCard";
import { MilestoneToast } from "@/components/MilestoneToast";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

const ACTIONS = [
  {
    href: "/chat",
    icon: MessageCircle,
    title: "Plan Pete",
    description: "Haftanı planla, soru sor, öneri al",
    cta: "Konuşmayı Başlat",
  },
  {
    href: "/plan/weekly",
    icon: CalendarDays,
    title: "Haftalık Plan",
    description: "Önerilen görevleri incele ve onayla",
    cta: "Plana Git",
  },
  {
    href: "/me-time/suggestions",
    icon: Sparkles,
    title: "Me Time",
    description: "Kendine zaman ayır, aktivite keşfet",
    cta: "Önerilere Bak",
  },
];

export default function DashboardPage() {
  const { user }            = useAuth(false);
  const { progress, loading, milestone, dismissMilestone } = useProgress();
  const confettiFired       = useRef(false);
  const firstName           = user?.name?.split(" ")[0] || "kullanıcı";

  // Konfeti — tüm görevler tamamlandığında
  useEffect(() => {
    if (
      !loading &&
      !confettiFired.current &&
      progress.weekly_total > 0 &&
      progress.weekly_approved === progress.weekly_total
    ) {
      confettiFired.current = true;
      import("canvas-confetti").then((mod) => {
        mod.default({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#FF6B35", "#FFB347", "#FFA07A", "#FFD580", "#C84B8A"],
        });
      });
    }
  }, [loading, progress.weekly_approved, progress.weekly_total]);

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      <MilestoneToast milestone={milestone} onClose={dismissMilestone} />

      {/* ── Hero ── */}
      <header className="relative overflow-hidden gradient-hero px-6 pt-8 pb-10">
        {/* Dekoratif daireler */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 space-y-3"
        >
          <motion.p variants={fadeUp} className="text-white/70 text-sm font-500">
            Hoş geldin 👋
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-white text-3xl font-800 leading-tight">
            {firstName}
          </motion.h1>

          {/* Level + Streak rozetleri */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-600 px-3 py-1.5 rounded-full">
              <Trophy size={11} />
              Seviye {progress.level} · {progress.level_name}
            </span>
            {progress.streak_weeks > 0 && (
              <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs font-600 px-3 py-1.5 rounded-full">
                🔥 {progress.streak_weeks} haftalık seri
              </span>
            )}
          </motion.div>

          {/* Level progress bar */}
          <motion.div variants={fadeUp} className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] text-white/60">
              <span>{progress.total_plans} plan</span>
              <span>{progress.next_threshold} hedefe {progress.next_threshold - progress.total_plans} kaldı</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.level_pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-5 pb-4">

        {/* ── Gamification kartları ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-2.5"
        >
          <motion.div variants={scaleIn} className="col-span-1">
            <StreakCard weeks={progress.streak_weeks} />
          </motion.div>

          <motion.div variants={scaleIn} className="col-span-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-card">
            <ProgressRing value={progress.weekly_approved} max={progress.weekly_total} size={72} />
            <p className="text-[10px] text-[#A88070] font-500 text-center leading-tight">hafta planı</p>
          </motion.div>

          <motion.div variants={scaleIn} className="col-span-1 bg-white rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-card">
            <span className="text-xl">📅</span>
            <div className="text-center">
              <p className="text-lg font-800 text-[#1A0F0A] leading-none">{progress.weekly_approved}</p>
              <p className="text-[10px] text-[#A88070] font-500 leading-snug">onaylı<br/>görev</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Haftalık skor (geniş kart) ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <WeeklyScore approved={progress.weekly_approved} total={progress.weekly_total} />
        </motion.div>

        {/* ── Hızlı aksiyonlar ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          {ACTIONS.map(({ href, icon: Icon, title, description, cta }) => (
            <motion.div key={href} variants={fadeUp}>
              <Link
                href={href}
                className="group flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl gradient-subtle flex items-center justify-center shrink-0">
                  <Icon size={18} strokeWidth={1.75} className="text-[#FF6B35]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-700 text-sm text-[#1A0F0A]">{title}</p>
                  <p className="text-xs text-[#A88070] mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-600 text-[#FF6B35] shrink-0">
                  <span className="hidden sm:block">{cta}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Me Time profil kartı ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <MeTimeCard />
        </motion.div>

      </div>
    </div>
  );
}
