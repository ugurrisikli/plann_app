"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type Tab = "google" | "email";
type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("google");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(`Google girişi başarısız: ${err}`);
  }, [searchParams]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body: Record<string, string> = { email, password };
      if (mode === "signup" && name) body.name = name;

      const res = await fetch(`${BACKEND}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Bir hata oluştu.");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      {/* Arka plan ızgarası */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/10 mb-2">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Planlama</h1>
          <p className="text-sm text-zinc-400">
            Takvimin, maillerini ve yapılacaklarını okuyarak<br />
            haftanı senin için planlayan asistan.
          </p>
        </div>

        {/* Kart */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-5">
          {/* Tab */}
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {(["google", "email"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "google" ? "Google ile" : "E-posta ile"}
              </button>
            ))}
          </div>

          {tab === "google" ? (
            <div className="space-y-4">
              <a
                href={`${BACKEND}/api/auth/google`}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl bg-white text-zinc-800 text-sm font-medium hover:bg-zinc-100 transition-colors"
              >
                <GoogleIcon />
                Google ile Giriş Yap
              </a>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 break-all">
                  {error}
                </p>
              )}
              <p className="text-xs text-zinc-500 text-center">
                Google Takvim, Gmail, Drive ve Sheets erişimine izin verirsin.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {/* Login/Signup toggle */}
              <div className="flex gap-1 text-xs mb-1">
                {(["login", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(""); }}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      mode === m
                        ? "bg-white/10 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
                  </button>
                ))}
              </div>

              {mode === "signup" && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full h-11 rounded-xl bg-white/8 border border-white/10 text-white placeholder-zinc-500 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                required
                className="w-full h-11 rounded-xl bg-white/8 border border-white/10 text-white placeholder-zinc-500 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre"
                required
                minLength={6}
                className="w-full h-11 rounded-xl bg-white/8 border border-white/10 text-white placeholder-zinc-500 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                {loading ? "Bekle..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </button>

              {mode === "signup" && (
                <p className="text-xs text-zinc-500 text-center">
                  Google bağlantısı olmadan da giriş yapabilirsin.<br />
                  Google özelliklerini sonradan Ayarlar'dan ekleyebilirsin.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
