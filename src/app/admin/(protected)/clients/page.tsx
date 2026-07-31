"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Phone, Plus, Pencil } from "lucide-react";
import { ClientForm, type ClientFormValues } from "@/components/admin/ClientForm";

interface ClientRow {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  enteredAt: string | null;
  createdAt: string;
  briefingsCount: number;
  lastSubmittedAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatEnteredAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  async function loadClients() {
    try {
      const response = await fetch("/api/admin/clients");
      const data = await response.json();
      setClients(data.clients ?? []);
    } catch {
      // mantém a lista anterior em caso de falha
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/clients")
      .then((res) => res.json())
      .then((data) => {
        if (active) setClients(data.clients ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    await loadClients();
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
    await loadClients();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-ink">
            Clientes
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
          </h1>
          <p className="text-sm text-muted">
            Clientes da agência — cadastrados manualmente ou via briefing (/briefing/[cliente]).
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => {
              setEditingSlug(null);
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        )}
      </div>

      {showCreateForm && (
        <ClientForm mode="create" onSubmit={handleCreate} onCancel={() => setShowCreateForm(false)} />
      )}

      {!loading && clients.length === 0 && !showCreateForm && (
        <p className="rounded-xl border border-line bg-elevated/30 px-4 py-6 text-center text-sm text-muted">
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
              className="flex items-center justify-between rounded-xl border border-line bg-elevated/40 px-4 py-3 transition hover:border-brand-primary/50"
            >
              <Link href={`/admin/clients/${client.slug}`} className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{client.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  {client.whatsapp && (
                    <>
                      <Phone className="h-3 w-3" /> {client.whatsapp}
                      <span className="mx-1 text-line">·</span>
                    </>
                  )}
                  {client.briefingsCount} briefing(s) · último em {formatDate(client.lastSubmittedAt)}
                  {formatEnteredAt(client.enteredAt) && (
                    <>
                      <span className="mx-1 text-line">·</span>
                      entrou em {formatEnteredAt(client.enteredAt)}
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
                  className="text-muted hover:text-ink"
                  aria-label={`Editar ${client.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Link href={`/admin/clients/${client.slug}`}>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
