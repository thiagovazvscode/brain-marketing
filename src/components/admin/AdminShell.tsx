"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Building2,
  Package,
  Workflow,
  Activity,
  CheckSquare,
  FileText,
  Wallet,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
  Link2,
  Users,
  Radio,
  LogOut,
  Search,
  Plus,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
}

// IA do Brain OS (prompt do usuário). Só as seções com página real apontam
// pra uma rota; o resto fica visível (não sumimos com a estrutura pedida)
// mas marcado "Em breve" — nada de link morto/404 antes da Fase que constrói
// aquela entidade.
const MAIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/crm", label: "CRM Comercial", icon: Target },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/products", label: "Produtos e Planos", icon: Package },
  { href: "/admin/metodos", label: "Métodos & Execução", icon: Workflow },
  { href: "/admin/operations", label: "Operações", icon: Activity, comingSoon: true },
  { href: "/admin/tasks", label: "Tarefas", icon: CheckSquare, comingSoon: true },
  { href: "/admin/contracts", label: "Contratos", icon: FileText, comingSoon: true },
  { href: "/admin/financials", label: "Financeiro", icon: Wallet, comingSoon: true },
  { href: "/admin/agenda", label: "Agenda", icon: Calendar, comingSoon: true },
  { href: "/admin/documents", label: "Documentos", icon: FolderOpen, comingSoon: true },
  { href: "/admin/reports", label: "Relatórios", icon: BarChart3, comingSoon: true },
  { href: "/admin/settings", label: "Configurações", icon: Settings, comingSoon: true },
];

// Módulos que já existiam antes do Brain OS (tracking do site institucional)
// — continuam funcionando, só ganham uma seção própria na sidebar.
const TRACKING_NAV: NavItem[] = [
  { href: "/admin/links", label: "Links", icon: Link2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/pixels", label: "Pixels", icon: Radio },
];

interface NewMenuItem {
  label: string;
  href?: string;
  comingSoon?: boolean;
}

const NEW_MENU: NewMenuItem[] = [
  { href: "/admin/clients", label: "Novo cliente" },
  { href: "/admin/products", label: "Novo produto" },
  { label: "Nova contratação", comingSoon: true },
  { label: "Novo lead", comingSoon: true },
  { label: "Nova oportunidade", comingSoon: true },
  { label: "Novo contrato", comingSoon: true },
  { label: "Nova reunião", comingSoon: true },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.comingSoon) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-os-sidebar-muted/50"
        title="Em breve"
      >
        <item.icon className="h-4 w-4" />
        {item.label}
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-os-sidebar-muted/70">
          Em breve
        </span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active ? "bg-os-accent/15 text-os-accent" : "text-os-sidebar-muted hover:bg-os-sidebar-hover hover:text-os-sidebar-ink"
      }`}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }

  return (
    <div className="brain-os min-h-screen bg-os-bg text-os-ink">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-os-sidebar-line bg-os-sidebar px-4 py-6 sm:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <Image src="/images/logo.png" alt="Brain" width={32} height={32} className="rounded-lg" />
            <div>
              <p className="text-sm font-black text-os-sidebar-ink">Brain OS</p>
              <p className="text-[11px] text-os-sidebar-muted">Clientes, Operação, Métodos e Receita</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.label} item={item} active={pathname === item.href} />
            ))}

            <p className="mb-1 mt-5 px-3 text-[11px] font-bold uppercase tracking-wide text-os-sidebar-muted/60">
              Tracking do site
            </p>
            {TRACKING_NAV.map((item) => (
              <NavLink key={item.label} item={item} active={pathname === item.href} />
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-os-sidebar-muted transition hover:bg-os-sidebar-hover hover:text-os-sidebar-ink"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-os-border bg-os-card/95 px-5 py-3 backdrop-blur sm:px-8">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-os-muted" />
              <input
                type="text"
                disabled
                placeholder="Buscar cliente, lead, contrato... (em breve)"
                className="w-full cursor-not-allowed rounded-lg border border-os-border bg-os-bg py-2 pl-9 pr-3 text-sm text-os-ink placeholder:text-os-muted"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setNewMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setNewMenuOpen(false), 150)}
                className="flex items-center gap-1.5 rounded-lg bg-os-accent px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Novo
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {newMenuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-os-border bg-os-card shadow-lg">
                  {NEW_MENU.map((item) =>
                    item.comingSoon || !item.href ? (
                      <span
                        key={item.label}
                        className="flex cursor-not-allowed items-center justify-between px-4 py-2.5 text-sm text-os-muted/60"
                      >
                        {item.label}
                        <span className="text-[10px] font-bold uppercase tracking-wide">Em breve</span>
                      </span>
                    ) : (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="block px-4 py-2.5 text-sm font-medium text-os-ink hover:bg-os-bg"
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
