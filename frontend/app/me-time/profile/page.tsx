"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const INTERESTS = [
  "Sanat & Sergi",
  "Müzik & Konser",
  "Spor & Hareket",
  "Yemek & Mutfak",
  "Doğa & Açık Hava",
  "Teknoloji & Oyun",
  "Okuma & Öğrenme",
  "El İşi & Yaratıcılık",
  "Film & Tiyatro",
  "Sosyal & Networking",
];

const STEPS = [
  "Kişilik",
  "İlgi Alanları",
  "Fiziksel",
  "Pratik Bilgiler",
  "Konum",
];

type Profile = {
  personality_score: number;
  social_preference: string;
  crowd_tolerance: number;
  interests: string[];
  activity_goal: string;
  fitness_level: number;
  intensity_preference: string;
  constraints: string;
  duration_preference: string;
  budget_range: string;
  preferred_time: string;
  city: string;
  district: string;
  home_address: string;
  has_car: boolean;
  max_distance_km: number;
  indoor_outdoor: string;
  weather_sensitivity: number;
  avoidances: string;
};

const DEFAULT: Profile = {
  personality_score: 5,
  social_preference: "Karma",
  crowd_tolerance: 3,
  interests: [],
  activity_goal: "Dinlenmek & Şarj olmak",
  fitness_level: 3,
  intensity_preference: "Orta",
  constraints: "",
  duration_preference: "2-4 saat",
  budget_range: "0-200₺",
  preferred_time: "Öğleden sonra",
  city: "İstanbul",
  district: "",
  home_address: "",
  has_car: false,
  max_distance_km: 15,
  indoor_outdoor: "Her ikisi",
  weather_sensitivity: 3,
  avoidances: "",
};

export default function MeTimeProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${BACKEND}/api/me-time/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.profile) {
          // null değerleri DEFAULT ile doldur
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
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/me-time/profile`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        }
      );
      if (!res.ok) throw new Error("Kayıt başarısız");
      router.push("/me-time/suggestions");
    } catch {
      setError("Kaydedilirken bir hata oluştu. Tekrar dene.");
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <h1 className="font-semibold text-lg">Me Time Profili</h1>
        <p className="text-sm text-zinc-500">
          Sana en uygun aktiviteleri önerebilmem için birkaç soru.
        </p>
      </header>

      {/* Adım göstergesi */}
      <div className="flex border-b border-zinc-200 bg-white">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              i === step
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {step === 0 && (
          <StepPersonality profile={profile} set={set} />
        )}
        {step === 1 && (
          <StepInterests
            profile={profile}
            set={set}
            toggleInterest={toggleInterest}
          />
        )}
        {step === 2 && <StepPhysical profile={profile} set={set} />}
        {step === 3 && <StepPractical profile={profile} set={set} />}
        {step === 4 && <StepLocation profile={profile} set={set} />}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Geri
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700"
            >
              Devam
            </button>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet ve Önerilere Geç"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Adım bileşenleri ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-zinc-700 mb-2">{children}</p>;
}

function SliderRow({
  label,
  value,
  min,
  max,
  left,
  right,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  left: string;
  right: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-zinc-900"
      />
      <div className="flex justify-between text-xs text-zinc-400 mt-1">
        <span>{left}</span>
        <span className="font-medium text-zinc-700">{value}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value === opt
              ? "bg-zinc-900 text-white border-zinc-900"
              : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StepPersonality({
  profile,
  set,
}: {
  profile: Profile;
  set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <SliderRow
        label="Kişilik — İntravert / Ekstravert"
        value={profile.personality_score}
        min={1}
        max={10}
        left="İntravert"
        right="Ekstravert"
        onChange={(v) => set("personality_score", v)}
      />
      <div>
        <Label>Sosyal Tercih</Label>
        <ChipSelect
          options={["Yalnız", "Arkadaşla", "Aileyle", "Karma"]}
          value={profile.social_preference}
          onChange={(v) => set("social_preference", v)}
        />
      </div>
      <SliderRow
        label="Kalabalığa Tolerans"
        value={profile.crowd_tolerance}
        min={1}
        max={5}
        left="Kalabalıktan kaçınırım"
        right="Kalabalık severim"
        onChange={(v) => set("crowd_tolerance", v)}
      />
    </div>
  );
}

function StepInterests({
  profile,
  set,
  toggleInterest,
}: {
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
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                profile.interests.includes(interest)
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Bu seferki aktivite amacın ne?</Label>
        <ChipSelect
          options={[
            "Dinlenmek & Şarj olmak",
            "Macera & Yeni deneyim",
            "Bir şeyler öğrenmek",
            "Sosyalleşmek",
            "Yaratıcılığımı kullanmak",
          ]}
          value={profile.activity_goal}
          onChange={(v) => set("activity_goal", v)}
        />
      </div>
    </div>
  );
}

function StepPhysical({
  profile,
  set,
}: {
  profile: Profile;
  set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <SliderRow
        label="Fitness Seviyesi"
        value={profile.fitness_level}
        min={1}
        max={5}
        left="Sedanter"
        right="Aktif sporcu"
        onChange={(v) => set("fitness_level", v)}
      />
      <div>
        <Label>Tercih Edilen Yoğunluk</Label>
        <ChipSelect
          options={["Hafif", "Orta", "Yüksek"]}
          value={profile.intensity_preference}
          onChange={(v) => set("intensity_preference", v)}
        />
      </div>
      <div>
        <Label>Fiziksel Kısıtlamalar (varsa)</Label>
        <textarea
          value={profile.constraints}
          onChange={(e) => set("constraints", e.target.value)}
          placeholder="Örn: diz problemi, sırt ağrısı..."
          rows={2}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>
    </div>
  );
}

function StepPractical({
  profile,
  set,
}: {
  profile: Profile;
  set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Me Time Süresi</Label>
        <ChipSelect
          options={["1-2 saat", "2-4 saat", "Yarım gün", "Tam gün"]}
          value={profile.duration_preference}
          onChange={(v) => set("duration_preference", v)}
        />
      </div>
      <div>
        <Label>Bütçe</Label>
        <ChipSelect
          options={["Ücretsiz", "0-200₺", "200-500₺", "500₺+"]}
          value={profile.budget_range}
          onChange={(v) => set("budget_range", v)}
        />
      </div>
      <div>
        <Label>Tercih Edilen Zaman</Label>
        <ChipSelect
          options={["Sabah", "Öğleden sonra", "Akşam"]}
          value={profile.preferred_time}
          onChange={(v) => set("preferred_time", v)}
        />
      </div>
    </div>
  );
}

function StepLocation({
  profile,
  set,
}: {
  profile: Profile;
  set: (k: keyof Profile, v: Profile[keyof Profile]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Şehir</Label>
          <input
            type="text"
            value={profile.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="İstanbul"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <Label>İlçe</Label>
          <input
            type="text"
            value={profile.district}
            onChange={(e) => set("district", e.target.value)}
            placeholder="Kadıköy"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>
      <div>
        <Label>Ev Adresi (trafik tahmini için)</Label>
        <input
          type="text"
          value={profile.home_address}
          onChange={(e) => set("home_address", e.target.value)}
          placeholder="Moda, Kadıköy, İstanbul"
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => set("has_car", !profile.has_car)}
          className={`w-11 h-6 rounded-full transition-colors ${
            profile.has_car ? "bg-zinc-900" : "bg-zinc-200"
          }`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
              profile.has_car ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm text-zinc-700">Araç var</span>
      </div>
      <SliderRow
        label="Maksimum Mesafe (km)"
        value={profile.max_distance_km}
        min={1}
        max={50}
        left="1 km"
        right="50 km"
        onChange={(v) => set("max_distance_km", v)}
      />
      <div>
        <Label>Mekan Tercihi</Label>
        <ChipSelect
          options={["İç mekan", "Dış mekan", "Her ikisi"]}
          value={profile.indoor_outdoor}
          onChange={(v) => set("indoor_outdoor", v)}
        />
      </div>
      <SliderRow
        label="Hava Durumuna Duyarlılık"
        value={profile.weather_sensitivity}
        min={1}
        max={5}
        left="Hava umurumda değil"
        right="Hava çok önemli"
        onChange={(v) => set("weather_sensitivity", v)}
      />
      <div>
        <Label>Kesinlikle istemediğin şeyler</Label>
        <textarea
          value={profile.avoidances}
          onChange={(e) => set("avoidances", e.target.value)}
          placeholder="Örn: yüksek sesli yerler, kalabalık AVM, aşırı spor..."
          rows={2}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>
    </div>
  );
}
