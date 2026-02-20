"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/subjects", label: "Subjects" },
  { href: "/cas", label: "CAS" },
  { href: "/settings", label: "Settings" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-6 left-1/2 z-40 flex w-max -translate-x-1/2 items-center gap-1 rounded-full border border-black/5 bg-white/90 px-2 py-2 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-black/60 dark:shadow-black/50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`group relative flex flex-col items-center justify-center rounded-full px-5 py-2 font-sans text-xs font-semibold tracking-wide transition-all ${isActive
                ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
