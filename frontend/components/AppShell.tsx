"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navigation } from "./Navigation";

const NO_NAV_PATHS = ["/"];
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = NO_NAV_PATHS.includes(pathname);
  const [ready, setReady] = useState(isPublic);

  useEffect(() => {
    if (isPublic) { setReady(true); return; }
    fetch(`${BACKEND}/api/auth/me`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) router.replace("/");
        else setReady(true);
      })
      .catch(() => router.replace("/"));
  }, [pathname]);

  if (!isPublic && !ready) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublic) return <>{children}</>;

  return (
    <div className="flex h-full bg-zinc-50">
      <Navigation />
      <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
