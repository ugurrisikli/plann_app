"use client";
import Link from "next/link";
import { MessageCircle, CalendarDays, Sparkles, ArrowRight, Zap } from "lucide-react";
import { MeTimeCard } from "@/components/dashboard/MeTimeCard";
import { useAuth } from "@/hooks/useAuth";

const ACTIONS = [
  {
    href: "/chat",
    icon: MessageCircle,
    title: "Plan Pete",
    description: "Haftanı planla, soru sor, öneri al",
    cta: "Konuşmayı Başlat",
    accent: "bg-zinc-900 text-white",
    iconColor: "text-white",
  },
  {
    href: "/plan/weekly",
    icon: CalendarDays,
    title: "Haftalık Plan",
    description: "Önerilen görevleri incele ve onayla",
    cta: "Plana Git",
    accent: "bg-white border border-zinc-200",
    iconColor: "text-zinc-700",
  },
  {
    href: "/me-time/suggestions",
    icon: Sparkles,
    title: "Me Time",
    description: "Kendine zaman ayır, aktivite keşfet",
    cta: "Önerilere Bak",
    accent: "bg-white border border-zinc-200",
    iconColor: "text-zinc-700",
  },
];

const QUICK_TIPS = [
  "Plan Pete'e \"Bu haftayı planla\" yaz — takvimini, maillerini ve yapılacaklarını okur.",
  "Me Time profilini doldurursan sana özel aktivite önerileri alırsın.",
  "Ayarlar'dan ev adresini ekle — trafik süresi tahminleri daha doğru olur.",
];

export default function DashboardPage() {
  const { user } = useAuth(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-5">
        <h1 className="font-semibold text-xl text-zinc-900">
          Merhaba, {user?.name?.split(" ")[0] || "kullanıcı"} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Plan Pete seninle burada.</p>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Ana aksiyonlar */}
        <div className="space-y-3">
          {ACTIONS.map(({ href, icon: Icon, title, description, cta, accent, iconColor }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:shadow-md ${accent}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                accent.includes("zinc-900") ? "bg-white/10" : "bg-zinc-100"
              }`}>
                <Icon size={20} strokeWidth={1.75} className={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${accent.includes("zinc-900") ? "text-white" : "text-zinc-900"}`}>
                  {title}
                </p>
                <p className={`text-xs mt-0.5 ${accent.includes("zinc-900") ? "text-zinc-400" : "text-zinc-500"}`}>
                  {description}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${
                accent.includes("zinc-900") ? "text-zinc-300" : "text-zinc-500"
              }`}>
                <span className="hidden sm:block">{cta}</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Me Time profil kartı */}
        <MeTimeCard />

        {/* İpuçları */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={14} strokeWidth={2} className="text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Başlarken</p>
          </div>
          <ul className="space-y-2.5">
            {QUICK_TIPS.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-600">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
