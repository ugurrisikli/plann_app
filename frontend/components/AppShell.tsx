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
      .then((r) => { if (!r.ok) router.replace("/"); else setReady(true); })
      .catch(() => router.replace("/"));
  }, [pathname]);

  if (!isPublic && !ready) {
    return (
      <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FFE0D0] border-t-[#FF6B35] rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublic) return <>{children}</>;

  return (
    <div className="h-full bg-[#FFF8F2]">
      {/* pb-24 → floating nav için alan (nav bottom-4 + ~56px yükseklik) */}
      <main className="h-full overflow-y-auto pb-24">
        {children}
      </main>
      <Navigation />
    </div>
  );
}
