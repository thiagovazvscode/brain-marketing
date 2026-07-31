"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "brain_session_id";
const UTM_KEY = "brain_utm";

interface Utm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Se a URL trouxer "_bs" (setado pelo redirect de /l/[slug]), adota esse id
// como sessionId — dá continuidade entre o clique no link rastreável e as
// page views que acontecem depois, na mesma sessão.
function adoptSessionFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const bridged = params.get("_bs");
  if (bridged) {
    window.localStorage.setItem(SESSION_KEY, bridged);
  }
}

function captureUtm(): Utm {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl: Utm = {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
  };

  if (Object.values(fromUrl).some(Boolean)) {
    window.sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
    return fromUrl;
  }

  const stored = window.sessionStorage.getItem(UTM_KEY);
  return stored ? (JSON.parse(stored) as Utm) : {};
}

function sendBeacon(url: string, body: Record<string, unknown>) {
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // tracking nunca pode travar a experiência do visitante
  }
}

export function useTrackingSession() {
  const pathname = usePathname();
  const utmRef = useRef<Utm>({});

  useEffect(() => {
    adoptSessionFromUrl();
    utmRef.current = captureUtm();
  }, [pathname]);

  const trackPageView = useCallback(() => {
    sendBeacon("/api/track/pageview", {
      path: pathname,
      sessionId: getOrCreateSessionId(),
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      ...utmRef.current,
    });
  }, [pathname]);

  const trackClick = useCallback(
    (elementId: string) => {
      sendBeacon("/api/track/click", {
        elementId,
        path: pathname,
        sessionId: getOrCreateSessionId(),
        ...utmRef.current,
      });
    },
    [pathname]
  );

  const getSessionId = useCallback(() => getOrCreateSessionId(), []);
  const getUtm = useCallback(() => utmRef.current, []);

  return { trackPageView, trackClick, getSessionId, getUtm };
}
