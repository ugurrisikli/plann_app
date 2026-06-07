"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { LayoutDashboard, MessageCircle, CalendarDays, Sparkles, Settings } from "lucide-react";
import { navPill } from "@/lib/animations";

const NAV_ITEMS = [
  { href: "/dashboard",           icon: LayoutDashboard, label: "Ana Sayfa" },
  { href: "/chat",                icon: MessageCircle,   label: "Plan Pete" },
  { href: "/plan/weekly",         icon: CalendarDays,    label: "Haftalık"  },
  { href: "/me-time/suggestions", icon: Sparkles,        label: "Me Time"   },
  { href: "/settings",            icon: Settings,        label: "Ayarlar"   },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
      <LayoutGroup>
        <motion.div
          layout
          className="flex items-center justify-between bg-white/92 backdrop-blur-xl rounded-full px-2 py-2 shadow-nav border border-[#F0E4D7] w-full"
        >
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <motion.div key={href} layout className="relative flex-1 flex justify-center">
                {/* Sliding pill background */}
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    transition={navPill}
                    className="absolute inset-0 rounded-full gradient-primary"
                  />
                )}

                <Link
                  href={href}
                  className={`relative z-10 flex items-center justify-center gap-1 rounded-full px-2 py-2 w-full transition-colors duration-200 ${
                    active
                      ? "text-white"
                      : "text-[#A88070] hover:text-[#6B4F3A]"
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.25 : 1.75}
                    className="shrink-0"
                  />

                  {/* Label — animasyonlu genişleme */}
                  <AnimatePresence mode="popLayout" initial={false}>
                    {active && (
                      <motion.span
                        key={href + "-label"}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="text-[11px] font-700 whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </LayoutGroup>
    </nav>
  );
}
