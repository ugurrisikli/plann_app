"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const INTERESTS = [
  "Sanat & Sergi", "Müzik & Konser", "Spor & Hareket", "Yemek & Mutfak",
  "Doğa & Açık Hava", "Teknoloji & Oyun", "Okuma & Öğrenme",
  "El İşi & Yaratıcılık", "Film & Tiyatro", "Sosyal & Networking",
];

const STEPS = ["Kişilik", "İlgi Alanları", "Fiziksel", "Pratik Bilgiler", "Konum"];

type Profile = {
  personality_score: number; social_preference: string; crowd_tolerance: number;
  interests: string[]; activity_goal: string; fitness_level: number;
  intensity_preference: string; constraints: string; duration_preference: string;
  budget_range: string; preferred_time: string; city: string; district: string;
  home_address: string; has_car: boolean; max_distance_km: number;
  indoor_outdoor: string; weather_sensitivity: number; avoidances: string;
};

const DEFAULT: Profile = {
  personality_score: 5, social_preference: "Karma", crowd_tolerance: 3,
  interests: [], activity_goal: "Dinlenmek & Şarj olmak", fitness_level: 3,
  intensity_preference: "Orta", constraints: "", duration_preference: "2-4 saat",
  budget_range: "0-200₺", preferred_time: "Öğleden sonra", city: "İstanbul",
  district: "", home_address: "", has_car: false, max_distance_km: 15,
  indoor_outdoor: "Her ikisi", weather_sensitivity: 3, avoidances: "",
};

// ── Shared components ─────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-600 text-[#1A0F0A] mb-2">{children}</p>;
}

function SliderRow({ label, value, min, max, left, right, onChange }: {
  label: string; value: number; min: number; max: number;
  left: string; right: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FF6B35]" />
      <div className="flex justify-between text-xs text-[#A88070] mt-1.5">
        <span>{left}</span>
        <span className="font-600 text-[#FF6B35]">{value}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function ChipSelect({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-500 border transition-all duration-150 ${
            value === opt
              ? "gradient-primary text-white border-transparent shadow-sm"
              : "border-[#F0E4D7] text-[#6B4F3A] bg-white hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function TextArea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={2}
      className="w-full rounded-xl border border-[#F0E4D7] px-4 py-3 text-sm resize-none outline-none bg-white text-[#1A0F0A] placeholder-[#C4A899] focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all font-[inherit]" />
  );
}

function InputField({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#F0E4D7] px-4 py-3 text-sm outline-none bg-white text-[#1A0F0A] placeholder-[#C4A899] focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all" />
  );
}

// ── Step components ───────────────────────────────────────────────────────
function StepPersonality({ profile, set }: {
  profile: Profile; set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <SliderRow label="Kişilik — İntravert / Ekstravert"
        value={profile.personality_score} min={1} max={10}
        left="İntravert" right="Ekstravert"
        onChange={(v) => set("personality_score", v)} />
      <div>
        <Label>Sosyal Tercih</Label>
        <ChipSelect options={["Yalnız", "Arkadaşla", "Aileyle", "Karma"]}
          value={profile.social_preference} onChange={(v) => set("social_preference", v)} />
      </div>
      <SliderRow label="Kalabalığa Tolerans"
        value={profile.crowd_tolerance} min={1} max={5}
        left="Kalabalıktan kaçınırım" right="Kalabalık severim"
        onChange={(v) => set("crowd_tolerance", v)} />
    </div>
  );
}

function StepInterests({ profile, set, toggleInterest }: {
  profile: Profile;
  set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
  toggleInterest: (item: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>İlgi Alanları (birden fazla seçebilirsin)</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button key={interest} onClick={() => toggleInterest(interest)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-500 border transition-all duration-150 ${
                profile.interests.includes(interest)
                  ? "gradient-primary text-white border-transparent shadow-sm"
                  : "border-[#F0E4D7] text-[#6B4F3A] bg-white hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
              }`}>
              {interest}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Bu seferki aktivite amacın ne?</Label>
        <ChipSelect
          options={["Dinlenmek & Şarj olmak","Macera & Yeni deneyim","Bir şeyler öğrenmek","Sosyalleşmek","Yaratıcılığımı kullanmak"]}
          value={profile.activity_goal} onChange={(v) => set("activity_goal", v)} />
      </div>
    </div>
  );
}

function StepPhysical({ profile, set }: {
  profile: Profile; set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <SliderRow label="Fitness Seviyesi"
        value={profile.fitness_level} min={1} max={5}
        left="Sedanter" right="Aktif sporcu"
        onChange={(v) => set("fitness_level", v)} />
      <div>
        <Label>Tercih Edilen Yoğunluk</Label>
        <ChipSelect options={["Hafif", "Orta", "Yüksek"]}
          value={profile.intensity_preference} onChange={(v) => set("intensity_preference", v)} />
      </div>
      <div>
        <Label>Fiziksel Kısıtlamalar (varsa)</Label>
        <TextArea value={profile.constraints} onChange={(v) => set("constraints", v)}
          placeholder="Örn: diz problemi, sırt ağrısı..." />
      </div>
    </div>
  );
}

function StepPractical({ profile, set }: {
  profile: Profile; set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Me Time Süresi</Label>
        <ChipSelect options={["1-2 saat", "2-4 saat", "Yarım gün", "Tam gün"]}
          value={profile.duration_preference} onChange={(v) => set("duration_preference", v)} />
      </div>
      <div>
        <Label>Bütçe</Label>
        <ChipSelect options={["Ücretsiz", "0-200₺", "200-500₺", "500₺+"]}
          value={profile.budget_range} onChange={(v) => set("budget_range", v)} />
      </div>
      <div>
        <Label>Tercih Edilen Zaman</Label>
        <ChipSelect options={["Sabah", "Öğleden sonra", "Akşam"]}
          value={profile.preferred_time} onChange={(v) => set("preferred_time", v)} />
      </div>
    </div>
  );
}

function StepLocation({ profile, set }: {
  profile: Profile; set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Şehir</Label>
          <InputField value={profile.city} onChange={(v) => set("city", v)} placeholder="İstanbul" />
        </div>
        <div>
          <Label>İlçe</Label>
          <InputField value={profile.district} onChange={(v) => set("district", v)} placeholder="Kadıköy" />
        </div>
      </div>
      <div>
        <Label>Ev Adresi (trafik tahmini için)</Label>
        <InputField value={profile.home_address} onChange={(v) => set("home_address", v)}
          placeholder="Moda, Kadıköy, İstanbul" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => set("has_car", !profile.has_car)}
          className={`w-11 h-6 rounded-full transition-colors duration-200 ${profile.has_car ? "gradient-primary" : "bg-[#F0E4D7]"}`}>
          <span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform mx-0.5 ${profile.has_car ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <span className="text-sm font-500 text-[#1A0F0A]">Araç var</span>
      </div>
      <SliderRow label="Maksimum Mesafe (km)"
        value={profile.max_distance_km} min={1} max={50}
        left="1 km" right="50 km"
        onChange={(v) => set("max_distance_km", v)} />
      <div>
        <Label>Mekan Tercihi</Label>
        <ChipSelect options={["İç mekan", "Dış mekan", "Her ikisi"]}
          value={profile.indoor_outdoor} onChange={(v) => set("indoor_outdoor", v)} />
      </div>
      <SliderRow label="Hava Durumuna Duyarlılık"
        value={profile.weather_sensitivity} min={1} max={5}
        left="Hava umurumda değil" right="Hava çok önemli"
        onChange={(v) => set("weather_sensitivity", v)} />
      <div>
        <Label>Kesinlikle istemediğin şeyler</Label>
        <TextArea value={profile.avoidances} onChange={(v) => set("avoidances", v)}
          placeholder="Örn: yüksek sesli yerler, kalabalık AVM, aşırı spor..." />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function MeTimeProfilePage() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`${BACKEND}/api/me-time/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.profile) {
          const merged: Profile = { ...DEFAULT };
          for (const key of Object.keys(DEFAULT) as (keyof Profile)[]) {
            const val = data.profile[key];
            if (val !== null && val !== undefined) {
              (merged as Record<string, unknown>)[key] = val;
            }
          }
          setProfile(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Profile, value: Profile[keyof Profile]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleInterest = (item: string) =>
    setProfile((p) => ({
      ...p,
      interests: p.interests.includes(item)
        ? p.interests.filter((i) => i !== item)
        : [...p.interests, item],
    }));

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${BACKEND}/api/me-time/profile`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      router.push("/me-time/suggestions");
    } catch {
      setError("Kaydedilirken bir hata oluştu. Tekrar dene.");
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#F0E4D7] border-t-[#FF6B35] rounded-full animate-spin" />
    </div>
  );

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* ── Header ── */}
      <header className="gradient-hero px-6 py-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <h1 className="text-white font-700 text-base">Me Time Profili</h1>
            <p className="text-white/60 text-xs mt-0.5">
              Adım {step + 1} / {STEPS.length}
            </p>
          </div>
          <div className="w-8" />
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div className="h-full bg-white/70 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>
      </header>

      {/* ── Step tabs ── */}
      <div className="bg-white border-b border-[#F0E4D7] flex overflow-x-auto">
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => setStep(i)}
            className={`flex-1 py-3 text-xs font-600 whitespace-nowrap transition-colors ${
              i === step
                ? "text-[#FF6B35] border-b-2 border-[#FF6B35]"
                : i < step
                ? "text-[#A88070]"
                : "text-[#C4A899]"
            }`}>
            {i < step ? "✓ " : ""}{label}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* ── Step content with slide animation ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={staggerContainer}
            initial="hidden" animate="show" exit="hidden"
          >
            <motion.div variants={fadeUp}>
              {step === 0 && <StepPersonality profile={profile} set={set} />}
              {step === 1 && <StepInterests profile={profile} set={set} toggleInterest={toggleInterest} />}
              {step === 2 && <StepPhysical profile={profile} set={set} />}
              {step === 3 && <StepPractical profile={profile} set={set} />}
              {step === 4 && <StepLocation profile={profile} set={set} />}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* ── Nav buttons ── */}
        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-[#F0E4D7] text-sm font-600 text-[#6B4F3A] bg-white hover:bg-[#FFF8F2] transition-colors">
              Geri
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-xl gradient-primary text-white text-sm font-600 hover:opacity-90 transition-opacity">
              Devam
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-xl gradient-primary text-white text-sm font-600 disabled:opacity-50 hover:opacity-90 transition-opacity">
              {saving ? "Kaydediliyor..." : "Kaydet ve Önerilere Geç ✨"}
            </motion.button>
          )}
        </div>
      </main>
    </div>
  );
}
