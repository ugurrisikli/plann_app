"use client";
import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

const NO_NAV_PATHS = ["/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !NO_NAV_PATHS.includes(pathname);

  if (!showNav) return <>{children}</>;

  return (
    <div className="flex h-full bg-zinc-50">
      <Navigation />
      <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
