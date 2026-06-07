"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/me-time/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setProfile(d?.profile ?? null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const pct = calcCompletion(profile);
  const isComplete = pct >= 80;
  const interests = (profile?.interests as string[] | undefined) ?? [];

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <Sparkles size={15} strokeWidth={1.75} className="text-zinc-400" />
        <p className="text-sm font-semibold text-zinc-700">Me Time Profili</p>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
          isComplete
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          %{pct} tamamlandı
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Progress bar */}
        <div className="w-full bg-zinc-100 rounded-full h-1.5">
          <div
            className="bg-zinc-900 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {profile ? (
          <div className="space-y-2">
            {!!profile.city && (
              <Row label="Şehir" value={`${String(profile.city)}${profile.district ? `, ${String(profile.district)}` : ""}`} />
            )}
            {!!profile.budget_range && (
              <Row label="Bütçe" value={String(profile.budget_range)} />
            )}
            {!!profile.duration_preference && (
              <Row label="Süre" value={String(profile.duration_preference)} />
            )}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.slice(0, 4).map((i) => (
                  <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {i}
                  </span>
                ))}
                {interests.length > 4 && (
                  <span className="text-xs text-zinc-400">+{interests.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Profilini doldurarak sana özel aktivite önerileri al.
          </p>
        )}

        <Link
          href="/me-time/profile"
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          {isComplete ? (
            <span className="flex items-center gap-2"><CheckCircle2 size={14} /> Profili Güncelle</span>
          ) : (
            <span>Profili Tamamla</span>
          )}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400 text-xs">{label}</span>
      <span className="text-zinc-700 font-medium text-xs">{value}</span>
    </div>
  );
}
