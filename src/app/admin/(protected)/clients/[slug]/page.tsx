"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ClientDetail {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  createdAt: string;
}

interface Briefing {
  id: string;
  payload: Record<string, unknown>;
  submittedAt: string;
}

const TECHNICAL_KEYS = new Set(["client", "timestamp", "timestampFormatted"]);

function humanizeKey(key: string): string {
  const withSpaces = key.replace(/([A-Z])/g, " $1").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminClientDetailPage() {
  const params = useParams<{ slug: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/clients/${params.slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (active) setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (active && data) {
          setClient(data.client);
          setBriefings(data.briefings ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando cliente...
      </div>
    );
  }

  if (notFound || !client) {
    return <p className="text-sm text-muted">Cliente não encontrado.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-ink">{client.name}</h1>
        <p className="text-sm text-muted">
          {client.whatsapp ? `${client.whatsapp} · ` : ""}
          {briefings.length} briefing(s) registrado(s)
        </p>
      </div>

      {briefings.length === 0 && (
        <p className="rounded-xl border border-line bg-elevated/30 px-4 py-6 text-center text-sm text-muted">
          Nenhum briefing preenchido ainda para este cliente.
        </p>
      )}

      <div className="space-y-4">
        {briefings.map((briefing) => (
          <div key={briefing.id} className="rounded-2xl border border-line bg-elevated/40 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-magenta">
              Preenchido em {formatDate(briefing.submittedAt)}
            </p>
            <dl className="space-y-1.5">
              {Object.entries(briefing.payload)
                .filter(([key]) => !TECHNICAL_KEYS.has(key))
                .map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
                    <dt className="shrink-0 font-medium text-muted sm:w-56">{humanizeKey(key)}</dt>
                    <dd className="whitespace-pre-wrap text-ink/90">{formatValue(value)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
