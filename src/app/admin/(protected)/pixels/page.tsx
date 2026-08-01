"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import type { PixelConfig, PixelProvider } from "@/types/tracking";

const PAGE_OPTIONS = ["/", "/hub", "/proposta/vaz-ferreira"];

export default function AdminPixelsPage() {
  const [pixels, setPixels] = useState<PixelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePath, setPagePath] = useState(PAGE_OPTIONS[0]);
  const [provider, setProvider] = useState<PixelProvider>("meta");
  const [pixelId, setPixelId] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/pixels")
      .then((res) => res.json())
      .then((data) => {
        if (active) setPixels(data.pixels ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pixelId.trim()) return;

    try {
      const response = await fetch("/api/admin/pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagePath, provider, pixelId: pixelId.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        setPixels((prev) => [...prev, data.pixel]);
        setPixelId("");
      }
    } catch {
      // falha silenciosa — usuário pode tentar novamente
    }
  }

  async function toggle(id: string) {
    const current = pixels.find((p) => p.id === id);
    if (!current) return;
    setPixels((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
    try {
      await fetch(`/api/admin/pixels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current.enabled }),
      });
    } catch {
      // UI já refletiu a mudança
    }
  }

  async function remove(id: string) {
    setPixels((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/admin/pixels/${id}`, { method: "DELETE" });
    } catch {
      // UI já refletiu a remoção
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-black text-os-ink">
          Pixels
          {loading && <Loader2 className="h-4 w-4 animate-spin text-os-muted" />}
        </h1>
        <p className="text-sm text-os-muted">
          Cadastre um pixel (Meta ou GA4) por página para injetar o script automaticamente.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-os-border bg-os-card/50 p-5 sm:grid-cols-[1fr_1fr_2fr_auto]"
      >
        <select
          value={pagePath}
          onChange={(e) => setPagePath(e.target.value)}
          className="rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink focus:border-os-accent focus:outline-none"
        >
          {PAGE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as PixelProvider)}
          className="rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink focus:border-os-accent focus:outline-none"
        >
          <option value="meta">Meta Pixel</option>
          <option value="ga4">GA4</option>
        </select>

        <input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="ID do pixel / measurement ID"
          className="rounded-lg border border-os-border bg-os-bg/60 px-3 py-2 text-sm text-os-ink placeholder:text-os-muted/60 focus:border-os-accent focus:outline-none"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      <div className="space-y-2">
        {!loading && pixels.length === 0 && (
          <p className="rounded-xl border border-os-border bg-os-card/30 px-4 py-6 text-center text-sm text-os-muted">
            Nenhum pixel configurado ainda.
          </p>
        )}
        {pixels.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-os-border bg-os-card/40 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-os-accent/15 px-2 py-1 text-xs font-bold text-os-accent">
                {p.provider === "meta" ? "Meta" : "GA4"}
              </span>
              <div>
                <p className="text-sm font-semibold text-os-ink">{p.pagePath}</p>
                <p className="text-xs text-os-muted">{p.pixelId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(p.id)} className="text-os-muted hover:text-os-ink">
                {p.enabled ? (
                  <ToggleRight className="h-6 w-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
              <button onClick={() => remove(p.id)} className="text-os-muted hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
