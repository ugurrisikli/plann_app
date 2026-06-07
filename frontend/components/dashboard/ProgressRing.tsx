"use client";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number;
  max:   number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({ value, max, size = 88, stroke = 9, label }: ProgressRingProps) {
  const radius      = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct         = max > 0 ? Math.min(value / max, 1) : 0;
  const offset      = circumference * (1 - pct);
  const cx          = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#F0E4D7" strokeWidth={stroke} />
        {/* Progress */}
        <motion.circle
          cx={cx} cy={cx} r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
        </defs>
      </svg>

      {/* Merkez metin */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-800 text-[#1A0F0A] leading-none">
          {max > 0 ? `${Math.round(pct * 100)}%` : "—"}
        </span>
        {label && <span className="text-[10px] text-[#A88070] mt-0.5 leading-none">{label}</span>}
      </div>
    </div>
  );
}
