"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const inputClass =
  "rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand-primary focus:outline-none";

export function CreateLinkForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [campaign, setCampaign] = useState("");
  const [ownerClientId, setOwnerClientId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, destinationUrl, campaign: campaign || undefined, ownerClientId: ownerClientId || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível criar o link.");
        return;
      }
      setLabel("");
      setDestinationUrl("");
      setCampaign("");
      setOwnerClientId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-line bg-elevated/50 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rótulo (ex: Bio do Instagram)"
          className={inputClass}
          required
        />
        <input
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="URL de destino"
          className={inputClass}
          required
        />
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="Campanha (opcional)"
          className={inputClass}
        />
        <select value={ownerClientId} onChange={(e) => setOwnerClientId(e.target.value)} className={inputClass}>
          <option value="">Link da Brain (sem cliente dono)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Criar link
      </button>
    </form>
  );
}
