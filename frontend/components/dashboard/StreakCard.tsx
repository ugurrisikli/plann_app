"use client";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { cardHover } from "@/lib/animations";

export function StreakCard({ weeks }: { weeks: number }) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 cursor-default"
    >
      {/* Ateş — nefes animasyonu */}
      <motion.span
        className="text-3xl select-none"
        animate={{ scale: [1, 1.15, 1], rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        🔥
      </motion.span>

      <div className="text-center">
        <p className="text-2xl font-800 text-[#1A0F0A] leading-none tabular-nums">
          <NumberFlow value={weeks} />
        </p>
        <p className="text-[11px] text-[#A88070] mt-0.5 font-500">
          {weeks === 1 ? "haftalık seri" : "haftalık seri"}
        </p>
      </div>

      {weeks >= 3 && (
        <span className="text-[10px] font-600 text-[#FF6B35] bg-[#FFF1EC] rounded-full px-2 py-0.5">
          🎯 Harika gidiyorsun!
        </span>
      )}
    </motion.div>
  );
}
