"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isAuth = false; // Mocked for now

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Code<span className="text-blue-600">Viz</span>
            </span>
          </Link>

          {isAuth && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className={
                  pathname === "/dashboard"
                    ? "text-sm font-medium transition-colors hover:text-blue-600 text-blue-600"
                    : "text-sm font-medium transition-colors hover:text-blue-600 text-slate-600"
                }
              >
                Dashboard
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAuth ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-700">Alex Chen</span>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors" type="button">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
