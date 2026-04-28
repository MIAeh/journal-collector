"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomTabs() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const tabs = [
    { label: "Collection", icon: "📋", href: "/" },
    { label: "Add", icon: "➕", href: "/add" },
    { label: "Tags", icon: "🏷️", href: "/tags" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              isActive(tab.href)
                ? "font-semibold text-gray-900"
                : "text-gray-400"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
