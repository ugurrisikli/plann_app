"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Tab  = "google" | "email";
type Mode = "login"  | "signup";

const FEATURES = [
  { emoji: "📅", text: "Gmail & takvimini okur" },
  { emoji: "🧠", text: "Haftanı akıllıca planlar" },
  { emoji: "✨", text: "Me Time önerileri sunar" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab,      setTab]      = useState<Tab>("google");
  const [mode,     setMode]     = useState<Mode>("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [focusedField, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setError(`Google girişi başarısız: ${err}`);
  }, []);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body: Record<string, string> = { email, password };
      if (mode === "signup" && name) body.name = name;

      const res = await fetch(`${BACKEND}${endpoint}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Bir hata oluştu.");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally { setLoading(false); }
  }

  const inputClass = (field: string) =>
    `w-full h-11 rounded-xl border bg-white px-4 text-sm text-[#1A0F0A] placeholder-[#C4A899] outline-none transition-all ${
      focusedField === field
        ? "border-[#FF6B35]/50 shadow-[0_0_0_3px_rgba(255,107,53,0.1)]"
        : "border-[#F0E4D7]"
    }`;

  return (
    <main className="min-h-screen bg-[#FFF8F2] flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Dekoratif arka plan daireleri */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#FF6B35]/8 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#FFB347]/10 pointer-events-none" />
      <div className="absolute top-1/3 left-4 w-20 h-20 rounded-full bg-[#FF6B35]/5 pointer-events-none" />

      <motion.div
        variants={staggerContainer} initial="hidden" animate="show"
        className="relative w-full max-w-sm space-y-6"
      >
        {/* Logo + başlık */}
        <motion.div variants={fadeUp} className="text-center space-y-3">
          <motion.div variants={scaleIn}
            className="inline-flex w-14 h-14 rounded-2xl gradient-primary items-center justify-center shadow-elevated mx-auto">
            <Zap size={24} strokeWidth={2.5} className="text-white fill-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-800 text-[#1A0F0A] tracking-tight">Planlama</h1>
            <p className="text-sm text-[#A88070] mt-1 leading-relaxed">
              Haftanı akıllıca planlayan asistanın
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {FEATURES.map(({ emoji, text }) => (
              <span key={text}
                className="flex items-center gap-1.5 text-xs text-[#6B4F3A] bg-white border border-[#F0E4D7] px-2.5 py-1 rounded-full font-500">
                {emoji} {text}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Kart */}
        <motion.div variants={fadeUp}
          className="bg-white rounded-3xl shadow-elevated border border-[#F0E4D7] overflow-hidden">

          {/* Tab seçici */}
          <div className="flex bg-[#FFF8F2] border-b border-[#F0E4D7] p-1.5 gap-1">
            {(["google", "email"] as Tab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-xl text-sm font-600 transition-all duration-200 ${
                  tab === t
                    ? "gradient-primary text-white shadow-sm"
                    : "text-[#A88070] hover:text-[#6B4F3A]"
                }`}>
                {t === "google" ? "Google ile" : "E-posta ile"}
              </button>
            ))}
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {tab === "google" ? (
                <motion.div key="google"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className="space-y-4">
                  <a href={`${BACKEND}/api/auth/google`}
                    className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-white border border-[#F0E4D7] text-[#1A0F0A] text-sm font-600 hover:bg-[#FFF8F2] hover:border-[#FF6B35]/30 shadow-sm hover:shadow-md transition-all">
                    <GoogleIcon size={18} />
                    Google ile Giriş Yap
                  </a>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 break-all">
                      {error}
                    </p>
                  )}

                  <p className="text-xs text-[#A88070] text-center leading-relaxed">
                    Google Takvim, Gmail, Drive ve Sheets erişimine izin verirsin.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="email"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

                  {/* Login / Signup toggle */}
                  <div className="flex gap-1 mb-4">
                    {(["login", "signup"] as Mode[]).map((m) => (
                      <button key={m} type="button"
                        onClick={() => { setMode(m); setError(""); }}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-600 transition-all ${
                          mode === m
                            ? "bg-[#FFF1EC] text-[#FF6B35]"
                            : "text-[#A88070] hover:text-[#6B4F3A]"
                        }`}>
                        {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    <AnimatePresence>
                      {mode === "signup" && (
                        <motion.input
                          key="name-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 44 }}
                          exit={{ opacity: 0, height: 0 }}
                          type="text" value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocused("name")}
                          onBlur={() => setFocused(null)}
                          placeholder="Ad Soyad"
                          className={inputClass("name")}
                        />
                      )}
                    </AnimatePresence>

                    <input type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="E-posta"
                      required
                      className={inputClass("email")} />

                    <input type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="Şifre"
                      required
                      minLength={6}
                      className={inputClass("password")} />

                    {error && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    )}

                    <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                      className="w-full h-11 rounded-xl gradient-primary text-white text-sm font-700 hover:opacity-90 transition-opacity disabled:opacity-50">
                      {loading ? "Bekle..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
                    </motion.button>

                    {mode === "signup" && (
                      <p className="text-xs text-[#A88070] text-center leading-relaxed">
                        Google bağlantısı olmadan da giriş yapabilirsin.<br />
                        Google özelliklerini sonradan Ayarlar&apos;dan ekleyebilirsin.
                      </p>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="text-center text-xs text-[#C4A899]">
          Plan Pete tarafından desteklenmektedir ⚡
        </motion.p>
      </motion.div>
    </main>
  );
}

function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
