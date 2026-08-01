"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Phone, Plus, Pencil } from "lucide-react";
import { ClientForm, type ClientFormValues } from "@/components/admin/ClientForm";

export interface ClientRow {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  enteredAt: string | null;
  createdAt: string | Date;
  briefingsCount: number;
  lastSubmittedAt: string | null;
  mrr: string;
  saude: "boa" | "atencao" | "critica";
  nextActionDate: string | null;
}

const SAUDE_LABEL: Record<ClientRow["saude"], string> = { boa: "Boa", atencao: "Atenção", critica: "Crítica" };
const SAUDE_CLASS: Record<ClientRow["saude"], string> = {
  boa: "bg-os-accent-soft text-os-accent",
  atencao: "bg-os-warning-soft text-os-warning",
  critica: "bg-os-danger-soft text-os-danger",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatEnteredAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function formatMrr(value: string) {
  const n = Number(value);
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ClientsListClient({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  async function handleCreate(values: ClientFormValues) {
    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error ?? "Não foi possível criar o cliente." };
    }
    setShowCreateForm(false);
    router.refresh();
  }

  async function handleEdit(slug: string, values: ClientFormValues) {
    const response = await fetch(`/api/admin/clients/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, whatsapp: values.whatsapp, enteredAt: values.enteredAt || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error ?? "Não foi possível atualizar o cliente." };
    }
    setEditingSlug(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-os-ink">Clientes</h1>
          <p className="text-sm text-os-muted">Clientes da agência — cadastrados manualmente ou via briefing (/briefing/[cliente]).</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => {
              setEditingSlug(null);
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-os-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        )}
      </div>

      {showCreateForm && <ClientForm mode="create" onSubmit={handleCreate} onCancel={() => setShowCreateForm(false)} />}

      {clients.length === 0 && !showCreateForm && (
        <p className="rounded-xl border border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
          Nenhum cliente cadastrado ainda.
        </p>
      )}

      <div className="space-y-2">
        {clients.map((client) =>
          editingSlug === client.slug ? (
            <ClientForm
              key={client.id}
              mode="edit"
              initialValues={{
                name: client.name,
                whatsapp: client.whatsapp ?? "",
                enteredAt: client.enteredAt ? client.enteredAt.slice(0, 10) : "",
                slug: client.slug,
              }}
              onSubmit={(values) => handleEdit(client.slug, values)}
              onCancel={() => setEditingSlug(null)}
            />
          ) : (
            <div
              key={client.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-os-border bg-os-card/40 px-4 py-3 transition hover:border-os-accent/50"
            >
              <Link href={`/admin/clients/${client.slug}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-os-ink">
                  {client.name}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SAUDE_CLASS[client.saude]}`}>
                    {SAUDE_LABEL[client.saude]}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-os-muted">
                  {client.whatsapp && (
                    <>
                      <Phone className="h-3 w-3" /> {client.whatsapp}
                      <span className="mx-1 text-os-border">·</span>
                    </>
                  )}
                  MRR {formatMrr(client.mrr)}
                  <span className="mx-1 text-os-border">·</span>
                  {client.briefingsCount} briefing(s) · último em {formatDate(client.lastSubmittedAt)}
                  {formatEnteredAt(client.enteredAt) && (
                    <>
                      <span className="mx-1 text-os-border">·</span>
                      entrou em {formatEnteredAt(client.enteredAt)}
                    </>
                  )}
                  {client.nextActionDate && (
                    <>
                      <span className="mx-1 text-os-border">·</span>
                      próxima ação em{" "}
                      {new Date(client.nextActionDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </>
                  )}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingSlug(client.slug);
                  }}
                  className="text-os-muted hover:text-os-ink"
                  aria-label={`Editar ${client.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Link href={`/admin/clients/${client.slug}`}>
                  <ArrowRight className="h-4 w-4 text-os-muted" />
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
