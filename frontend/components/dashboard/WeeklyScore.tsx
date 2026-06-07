"use client";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { cardHover } from "@/lib/animations";

interface WeeklyScoreProps {
  approved: number;
  total:    number;
}

export function WeeklyScore({ approved, total }: WeeklyScoreProps) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      className="bg-white rounded-2xl p-4 space-y-3 cursor-default"
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-[#A88070] font-500 uppercase tracking-wide">Bu Hafta</p>
          <p className="text-2xl font-800 text-[#1A0F0A] leading-tight tabular-nums">
            <NumberFlow value={approved} />
            <span className="text-sm font-500 text-[#A88070] ml-1">/ {total}</span>
          </p>
        </div>
        <span className="text-2xl select-none">
          {pct === 100 ? "🎉" : pct >= 50 ? "💪" : "📝"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-[#F8EFE8] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
        />
      </div>

      <p className="text-xs text-[#A88070]">
        {total === 0
          ? "Bu hafta henüz plan yok"
          : pct === 100
          ? "Tüm görevler tamamlandı! 🏆"
          : `${total - approved} görev onay bekliyor`}
      </p>
    </motion.div>
  );
}
