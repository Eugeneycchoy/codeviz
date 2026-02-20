import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: { searchParams?: { error?: string } }) {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 py-20">
      <div className="w-full max-w-md bg-white p-12 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-100/50 space-y-10 text-center relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-slate-500 font-medium">
            Sign in to access your saved repositories.
          </p>
        </div>

        <LoginForm error={searchParams?.error} />

        <div className="pt-6 border-t border-slate-50 flex items-center justify-center gap-2 text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          <p className="text-xs font-semibold tracking-wide uppercase">OAuth-secured connection</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
