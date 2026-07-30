"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Radio, LogOut, Building2 } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/pixels", label: "Pixels", icon: Radio },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-4 py-6 sm:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <Image src="/images/logo.png" alt="Brain" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-black">Painel Admin</span>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-primary/15 text-brand-magenta"
                      : "text-muted hover:bg-elevated hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-elevated hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
