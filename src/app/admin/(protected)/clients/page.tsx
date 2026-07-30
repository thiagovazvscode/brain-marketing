"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Phone } from "lucide-react";

interface ClientRow {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  createdAt: string;
  briefingsCount: number;
  lastSubmittedAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-black text-ink">
          Clientes
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </h1>
        <p className="text-sm text-muted">
          Clientes com briefing preenchido pelo formulário interno (/briefing/[cliente]).
        </p>
      </div>

      {!loading && clients.length === 0 && (
        <p className="rounded-xl border border-line bg-elevated/30 px-4 py-6 text-center text-sm text-muted">
          Nenhum cliente com briefing preenchido ainda.
        </p>
      )}

      <div className="space-y-2">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/admin/clients/${client.slug}`}
            className="flex items-center justify-between rounded-xl border border-line bg-elevated/40 px-4 py-3 transition hover:border-brand-primary/50"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{client.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                {client.whatsapp && (
                  <>
                    <Phone className="h-3 w-3" /> {client.whatsapp}
                    <span className="mx-1 text-line">·</span>
                  </>
                )}
                {client.briefingsCount} briefing(s) · último em {formatDate(client.lastSubmittedAt)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
