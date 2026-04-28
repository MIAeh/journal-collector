"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="hidden md:flex items-center justify-between bg-white border-b px-6 py-4">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Collector
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className={
              isActive("/")
                ? "font-semibold text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }
          >
            Collection
          </Link>
          <Link
            href="/tags"
            className={
              isActive("/tags")
                ? "font-semibold text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }
          >
            Tags
          </Link>
        </div>
      </div>
      <Link
        href="/add"
        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        + Add New
      </Link>
    </nav>
  );
}
