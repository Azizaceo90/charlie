"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { LayoutDashboard, Shield, User as UserIcon } from "lucide-react";

export default function LoginPage() {
  const { ready, users, currentUser, login } = useData();
  const router = useRouter();

  useEffect(() => {
    if (ready && currentUser) router.replace("/dashboard");
  }, [ready, currentUser, router]);

  function signIn(userId: string) {
    login(userId);
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
            <LayoutDashboard className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Career Ops</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Choose a profile to sign in
          </p>
        </div>

        <div className="space-y-3">
          {!ready && (
            <div className="py-8 text-center text-sm text-neutral-500">
              Loading profiles…
            </div>
          )}
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => signIn(u.id)}
              className="card flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-bg-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex-1">
                <div className="font-medium text-neutral-900">{u.name}</div>
                <div className="text-xs text-neutral-500">{u.title}</div>
              </div>
              <span
                className={`chip ${
                  u.role === "admin"
                    ? "bg-brand/15 text-brand-soft"
                    : "bg-accent-teal/15 text-accent-teal"
                }`}
              >
                {u.role === "admin" ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <UserIcon className="h-3 w-3" />
                )}
                {u.role}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Prototype sign-in. No password required — pick admin to manage
          everything, or an employee to see their individual view.
        </p>
      </div>
    </div>
  );
}
