"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Link2, Clock, MapPin, FileSpreadsheet, LogOut, ChevronRight, CheckCircle2, Zap } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const PLANNING_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface UserSettings {
  name: string; email: string; auth_provider: string; google_connected: boolean;
  planning_day: number; work_start_hour: number; work_end_hour: number;
  home_address: string; work_address: string; sheets_file_id: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: "", email: "", auth_provider: "email", google_connected: false,
    planning_day: 0, work_start_hour: 9, work_end_hour: 20,
    home_address: "", work_address: "", sheets_file_id: "",
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [sheetsFiles, setSheetsFiles] = useState<{ id: string; name: string }[]>([]);
  const [driveNeedsReconnect, setDriveNeedsReconnect] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await fetch(`${BACKEND}/api/settings/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        if (data.google_connected) fetchSheetsFiles();
      }
    } finally { setLoading(false); }
  }

  async function fetchSheetsFiles() {
    try {
      const res = await fetch(`${BACKEND}/api/settings/sheets-files`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSheetsFiles(data.files ?? []);
        setDriveNeedsReconnect(data.needs_reconnect ?? false);
      }
    } catch {}
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`${BACKEND}/api/settings/me`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name, planning_day: settings.planning_day,
          work_start_hour: settings.work_start_hour, work_end_hour: settings.work_end_hour,
          home_address: settings.home_address, work_address: settings.work_address,
          sheets_file_id: settings.sheets_file_id,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((p) => ({ ...p, [key]: value }));
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#F0E4D7] border-t-[#FF6B35] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* ── Header ── */}
      <header className="gradient-hero px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-white font-800 text-xl leading-tight">Ayarlar</h1>
          <p className="text-white/70 text-sm mt-0.5">Hesap ve tercihler</p>
        </div>
        <motion.button onClick={save} disabled={saving} whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-700 transition-all ${
            saved
              ? "bg-green-400 text-white"
              : "bg-white text-[#FF6B35] hover:bg-white/90"
          } disabled:opacity-60`}>
          {saved ? <><CheckCircle2 size={14} /> Kaydedildi</> : saving ? "Kaydediliyor..." : "Kaydet"}
        </motion.button>
      </header>

      <motion.div
        variants={staggerContainer} initial="hidden" animate="show"
        className="max-w-lg mx-auto px-4 py-5 space-y-4"
      >
        {/* Profil */}
        <motion.div variants={fadeUp}>
          <Section icon={User} title="Profil Bilgileri">
            <FieldRow label="İsim">
              <WarmInput value={settings.name} onChange={(v) => set("name", v)} placeholder="Adın" />
            </FieldRow>
            <FieldRow label="E-posta">
              <input value={settings.email} disabled
                className="w-full rounded-xl border border-[#F0E4D7] bg-[#F8EFE8] px-4 py-2.5 text-sm text-[#A88070] cursor-not-allowed" />
            </FieldRow>
          </Section>
        </motion.div>

        {/* Google bağlantısı */}
        <motion.div variants={fadeUp}>
          <Section icon={Link2} title="Bağlı Hesaplar">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#F0E4D7] flex items-center justify-center shadow-sm">
                  <GoogleIcon />
                </div>
                <div>
                  <p className="text-sm font-600 text-[#1A0F0A]">Google</p>
                  <p className="text-xs text-[#A88070]">
                    {settings.google_connected ? "Takvim, Gmail, Drive bağlı" : "Bağlı değil"}
                  </p>
                </div>
              </div>
              {settings.google_connected && !driveNeedsReconnect ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-600">
                  <CheckCircle2 size={13} /> Bağlı
                </span>
              ) : (
                <a href={`${BACKEND}/api/auth/google`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full gradient-primary text-white font-600 hover:opacity-90 transition-opacity">
                  {driveNeedsReconnect ? "İzinleri Yenile" : "Bağla"} <ChevronRight size={11} />
                </a>
              )}
            </div>
          </Section>
        </motion.div>

        {/* Planlama tercihleri */}
        <motion.div variants={fadeUp}>
          <Section icon={Clock} title="Planlama Tercihleri">
            <FieldRow label="Otomatik planlama günü">
              <WarmSelect value={settings.planning_day} onChange={(v) => set("planning_day", v)}>
                {PLANNING_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </WarmSelect>
            </FieldRow>
            <FieldRow label="Çalışma saatleri">
              <div className="flex items-center gap-2">
                <WarmSelect value={settings.work_start_hour} onChange={(v) => set("work_start_hour", v)}>
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </WarmSelect>
                <span className="text-[#A88070] text-sm shrink-0">–</span>
                <WarmSelect value={settings.work_end_hour} onChange={(v) => set("work_end_hour", v)}>
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </WarmSelect>
              </div>
            </FieldRow>
          </Section>
        </motion.div>

        {/* Adresler */}
        <motion.div variants={fadeUp}>
          <Section icon={MapPin} title="Adresler">
            <FieldRow label="Ev adresi" hint="Trafik tahmini için kullanılır">
              <WarmInput value={settings.home_address} onChange={(v) => set("home_address", v)}
                placeholder="Örn: Moda, Kadıköy, İstanbul" />
            </FieldRow>
            <FieldRow label="İş adresi" hint="Opsiyonel">
              <WarmInput value={settings.work_address} onChange={(v) => set("work_address", v)}
                placeholder="Örn: Levent, Beşiktaş, İstanbul" />
            </FieldRow>
          </Section>
        </motion.div>

        {/* Google Sheets dosyası */}
        {settings.google_connected && (
          <motion.div variants={fadeUp}>
            <Section icon={FileSpreadsheet} title="Yapılacaklar Dosyası">
              <FieldRow label="Google Sheets" hint="Plan Pete bu dosyadan görevleri okur">
                {driveNeedsReconnect ? (
                  <div className="px-4 py-3 border border-[#FFE0B2] rounded-xl bg-[#FFF8EE] space-y-2">
                    <p className="text-sm text-[#A88070]">
                      Drive erişimi için Google bağlantısını yenilemeniz gerekiyor.
                    </p>
                    <a href={`${BACKEND}/api/auth/google`}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full gradient-primary text-white font-600 hover:opacity-90 transition-opacity">
                      İzinleri Yenile <ChevronRight size={11} />
                    </a>
                  </div>
                ) : sheetsFiles.length > 0 ? (
                  <WarmSelect value={settings.sheets_file_id}
                    onChange={(v) => set("sheets_file_id", v)}>
                    <option value="">Seç...</option>
                    {sheetsFiles.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </WarmSelect>
                ) : (
                  <p className="text-sm text-[#A88070] px-4 py-2.5 border border-[#F0E4D7] rounded-xl bg-[#F8EFE8]">
                    Drive&apos;da Google Sheets dosyası bulunamadı.
                  </p>
                )}
              </FieldRow>
            </Section>
          </motion.div>
        )}

        {/* Çıkış */}
        <motion.div variants={fadeUp}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-[#F0E4D7]">
            <form action={`${BACKEND}/api/auth/logout`} method="post">
              <button type="submit"
                className="w-full flex items-center justify-between px-5 py-4 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <span className="flex items-center gap-3 font-500">
                  <LogOut size={15} /> Çıkış Yap
                </span>
                <ChevronRight size={13} className="text-red-300" />
              </button>
            </form>
          </div>
        </motion.div>

        {/* App version */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 py-2">
          <div className="w-5 h-5 rounded-md gradient-primary flex items-center justify-center">
            <Zap size={10} className="text-white fill-white" />
          </div>
          <span className="text-xs text-[#C4A899] font-500">Planlama App · Plan Pete</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-[#F0E4D7]">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#F8EFE8]">
        <div className="w-6 h-6 rounded-lg gradient-subtle flex items-center justify-center">
          <Icon size={12} strokeWidth={2} className="text-[#FF6B35]" />
        </div>
        <p className="text-sm font-700 text-[#1A0F0A]">{title}</p>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-600 text-[#6B4F3A]">{label}</label>
        {hint && <span className="text-xs text-[#C4A899]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function WarmInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#F0E4D7] bg-white px-4 py-2.5 text-sm text-[#1A0F0A] placeholder-[#C4A899] outline-none focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all" />
  );
}

function WarmSelect({ value, onChange, children }: {
  value: string | number; onChange: (v: number) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-[#F0E4D7] bg-white px-4 py-2.5 text-sm text-[#1A0F0A] outline-none focus:border-[#FF6B35]/50 focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all">
      {children}
    </select>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
