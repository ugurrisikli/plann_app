"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { cardHover } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const PROFILE_FIELDS = [
  "personality_score", "interests", "activity_goal",
  "city", "budget_range", "duration_preference",
];

function calcCompletion(profile: Record<string, unknown> | null): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = profile[f];
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
  return Math.round((filled.length / PROFILE_FIELDS.length) * 100);
}

export function MeTimeCard() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/me-time/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setProfile(d?.profile ?? null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const pct        = calcCompletion(profile);
  const isComplete = pct >= 80;
  const interests  = (profile?.interests as string[] | undefined) ?? [];

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      className="bg-white rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F8EFE8]">
        <div className="w-7 h-7 rounded-lg gradient-subtle flex items-center justify-center">
          <Sparkles size={13} strokeWidth={1.75} className="text-[#FF6B35]" />
        </div>
        <p className="text-sm font-600 text-[#1A0F0A]">Me Time Profili</p>
        <span className={`ml-auto text-[11px] font-600 px-2.5 py-0.5 rounded-full ${
          isComplete
            ? "bg-green-100 text-green-700"
            : "bg-[#FFF1EC] text-[#FF6B35]"
        }`}>
          %{pct}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-[#F8EFE8] rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>

        {profile ? (
          <div className="space-y-2">
            {!!profile.city && (
              <Row label="Şehir" value={`${String(profile.city)}${profile.district ? `, ${String(profile.district)}` : ""}`} />
            )}
            {!!profile.budget_range && <Row label="Bütçe" value={String(profile.budget_range)} />}
            {!!profile.duration_preference && <Row label="Süre" value={String(profile.duration_preference)} />}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.slice(0, 4).map((i) => (
                  <span key={i} className="text-xs bg-[#FFF1EC] text-[#FF6B35] font-500 px-2.5 py-0.5 rounded-full">
                    {i}
                  </span>
                ))}
                {interests.length > 4 && (
                  <span className="text-xs text-[#A88070]">+{interests.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#A88070]">
            Profilini doldurarak sana özel aktivite önerileri al.
          </p>
        )}

        <Link
          href="/me-time/profile"
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-600 hover:opacity-90 transition-opacity"
        >
          <span>{isComplete ? "Profili Güncelle" : "Profili Tamamla"}</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#A88070] text-xs font-500">{label}</span>
      <span className="text-[#1A0F0A] font-600 text-xs">{value}</span>
    </div>
  );
}
