"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductStatusToggle({ productSlug, isActive }: { productSlug: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/admin/products/${productSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
        isActive ? "bg-os-accent-soft text-os-accent" : "bg-os-border text-os-muted"
      }`}
    >
      {isActive ? "Ativo — desativar" : "Inativo — reativar"}
    </button>
  );
}
