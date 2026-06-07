"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface Milestone {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
}

interface Props {
  milestone: Milestone | null;
  onClose: () => void;
}

export function MilestoneToast({ milestone, onClose }: Props) {
  useEffect(() => {
    if (!milestone) return;

    // Confetti
    import("canvas-confetti").then((mod) => {
      mod.default({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.45 },
        colors: ["#FF6B35", "#FFB347", "#FFA07A", "#FFD580", "#C84B8A", "#7C3AED"],
        gravity: 0.9,
        scalar: 1.1,
      });
    });

    // Otomatik kapat
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [milestone, onClose]);

  return (
    <AnimatePresence>
      {milestone && (
        <>
          {/* Backdrop */}
          <motion.div
            key="milestone-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            key="milestone-card"
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }}
            exit={{ opacity: 0, scale: 0.85, y: 20, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-6"
          >
            <div className="pointer-events-auto w-full max-w-xs bg-white rounded-3xl shadow-elevated overflow-hidden">
              {/* Gradient top band */}
              <div className="gradient-hero h-2" />

              <div className="px-6 py-7 text-center relative">
                {/* Close button */}
                <button onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#F8EFE8] flex items-center justify-center text-[#A88070] hover:bg-[#F0E4D7] transition-colors">
                  <X size={13} />
                </button>

                {/* Emoji with pulse ring */}
                <div className="relative inline-flex mb-4">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#FF6B35]/20"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    className="relative text-5xl select-none"
                    animate={{ rotate: [-8, 8, -8, 8, 0] }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    {milestone.emoji}
                  </motion.span>
                </div>

                <h2 className="font-800 text-[#1A0F0A] text-xl leading-tight">{milestone.title}</h2>
                <p className="text-sm text-[#A88070] mt-1.5 leading-relaxed">{milestone.subtitle}</p>

                {/* Animated progress dots */}
                <div className="flex items-center justify-center gap-1.5 mt-5">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-[#C4A899] mt-3">
                  Otomatik kapanıyor...
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Milestone tanımları ───────────────────────────────────────────────────
export const MILESTONES = {
  firstPlan: {
    id: "first-plan",
    emoji: "🎉",
    title: "İlk Plan!",
    subtitle: "Harika başlangıç! İlk haftalık planını oluşturdun. Devam et!",
  } as Milestone,
  streak5: {
    id: "streak-5",
    emoji: "🔥",
    title: "5 Haftalık Seri!",
    subtitle: "5 hafta üst üste plan yaptın. Artık bir alışkanlık bu!",
  } as Milestone,
  streak10: {
    id: "streak-10",
    emoji: "⚡",
    title: "10 Haftalık Seri!",
    subtitle: "İnanılmaz! 10 haftadır kesintisiz planlıyorsun.",
  } as Milestone,
  plan10: {
    id: "plan-10",
    emoji: "🏆",
    title: "10. Plan!",
    subtitle: "10 haftalık plan tamamlandı. Sen artık bir planlama ustasısın!",
  } as Milestone,
  plan25: {
    id: "plan-25",
    emoji: "🌟",
    title: "25. Plan!",
    subtitle: "Çeyrek asır plan! Zaman yönetimi senin için artık ikinci doğa.",
  } as Milestone,
  allApproved: {
    id: "all-approved",
    emoji: "✅",
    title: "Hepsi Onaylandı!",
    subtitle: "Bu haftanın tüm görevleri takvime eklendi. Müthiş!",
  } as Milestone,
} as const;
