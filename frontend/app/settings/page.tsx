"use client";
import { useState, useEffect } from "react";
import { User, Link2, Clock, MapPin, FileSpreadsheet, LogOut, ChevronRight, CheckCircle2 } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const PLANNING_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface UserSettings {
  name: string;
  email: string;
  auth_provider: string;
  google_connected: boolean;
  planning_day: number;
  work_start_hour: number;
  work_end_hour: number;
  home_address: string;
  work_address: string;
  sheets_file_id: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: "", email: "", auth_provider: "email", google_connected: false,
    planning_day: 0, work_start_hour: 9, work_end_hour: 20,
    home_address: "", work_address: "", sheets_file_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl text-zinc-900">Ayarlar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Hesap ve tercihler</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
          {saved ? <><CheckCircle2 size={14} /> Kaydedildi</> : saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* Profil */}
        <Section icon={User} title="Profil Bilgileri">
          <FieldRow label="İsim">
            <input value={settings.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Adın"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </FieldRow>
          <FieldRow label="E-posta">
            <input value={settings.email} disabled
              className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-400 cursor-not-allowed" />
          </FieldRow>
        </Section>

        {/* Google bağlantısı */}
        <Section icon={Link2} title="Bağlı Hesaplar">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Google</p>
                <p className="text-xs text-zinc-400">
                  {settings.google_connected ? "Takvim, Gmail, Drive bağlı" : "Bağlı değil"}
                </p>
              </div>
            </div>
            {settings.google_connected && !driveNeedsReconnect ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle2 size={13} /> Bağlı
              </span>
            ) : (
              <a href={`${BACKEND}/api/auth/google`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
                {driveNeedsReconnect ? "İzinleri Yenile" : "Bağla"} <ChevronRight size={12} />
              </a>
            )}
          </div>
        </Section>

        {/* Planlama tercihleri */}
        <Section icon={Clock} title="Planlama Tercihleri">
          <FieldRow label="Otomatik planlama günü">
            <select value={settings.planning_day} onChange={(e) => set("planning_day", Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
              {PLANNING_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Çalışma saatleri">
            <div className="flex items-center gap-2">
              <select value={settings.work_start_hour} onChange={(e) => set("work_start_hour", Number(e.target.value))}
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              <span className="text-zinc-400 text-sm shrink-0">–</span>
              <select value={settings.work_end_hour} onChange={(e) => set("work_end_hour", Number(e.target.value))}
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
          </FieldRow>
        </Section>

        {/* Adresler */}
        <Section icon={MapPin} title="Adresler">
          <FieldRow label="Ev adresi" hint="Trafik tahmini için kullanılır">
            <input value={settings.home_address} onChange={(e) => set("home_address", e.target.value)}
              placeholder="Örn: Moda, Kadıköy, İstanbul"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </FieldRow>
          <FieldRow label="İş adresi" hint="Opsiyonel">
            <input value={settings.work_address} onChange={(e) => set("work_address", e.target.value)}
              placeholder="Örn: Levent, Beşiktaş, İstanbul"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </FieldRow>
        </Section>

        {/* Google Sheets dosyası */}
        {settings.google_connected && (
          <Section icon={FileSpreadsheet} title="Yapılacaklar Dosyası">
            <FieldRow label="Google Sheets" hint="Plan Pete bu dosyadan görevleri okur">
              {driveNeedsReconnect ? (
                <div className="px-4 py-3 border border-amber-200 rounded-xl bg-amber-50 space-y-2">
                  <p className="text-sm text-amber-700">
                    Drive erişimi için Google bağlantısını yenilemeniz gerekiyor.
                  </p>
                  <a href={`${BACKEND}/api/auth/google`}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
                    İzinleri Yenile <ChevronRight size={12} />
                  </a>
                </div>
              ) : sheetsFiles.length > 0 ? (
                <select value={settings.sheets_file_id}
                  onChange={(e) => set("sheets_file_id", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                  <option value="">Seç...</option>
                  {sheetsFiles.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              ) : (
                <p className="text-sm text-zinc-400 px-4 py-2.5 border border-zinc-100 rounded-xl bg-zinc-50">
                  Drive&apos;da Google Sheets dosyası bulunamadı.
                </p>
              )}
            </FieldRow>
          </Section>
        )}

        {/* Çıkış / Tehlikeli */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <form action={`${BACKEND}/api/auth/logout`} method="post">
            <button type="submit"
              className="w-full flex items-center justify-between px-5 py-4 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <span className="flex items-center gap-3">
                <LogOut size={16} /> Çıkış Yap
              </span>
              <ChevronRight size={14} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-100">
        <Icon size={15} strokeWidth={1.75} className="text-zinc-400" />
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium text-zinc-600">{label}</label>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
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
