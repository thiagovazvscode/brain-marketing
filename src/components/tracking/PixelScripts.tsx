import { Fragment } from "react";
import Script from "next/script";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pixelConfigs } from "@/db/schema";

export async function PixelScripts({ path }: { path: string }) {
  let pixels: { provider: string; pixelId: string }[] = [];

  try {
    pixels = await db
      .select({ provider: pixelConfigs.provider, pixelId: pixelConfigs.pixelId })
      .from(pixelConfigs)
      .where(and(eq(pixelConfigs.pagePath, path), eq(pixelConfigs.enabled, true)));
  } catch {
    return null;
  }

  if (pixels.length === 0) return null;

  return (
    <>
      {pixels.map((pixel) =>
        pixel.provider === "meta" ? (
          <Script key={`meta-${pixel.pixelId}`} id={`meta-pixel-${pixel.pixelId}`} strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixel.pixelId}');
            fbq('track', 'PageView');`}
          </Script>
        ) : (
          <Fragment key={`ga4-${pixel.pixelId}`}>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${pixel.pixelId}`} strategy="afterInteractive" />
            <Script id={`ga4-init-${pixel.pixelId}`} strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${pixel.pixelId}');`}
            </Script>
          </Fragment>
        )
      )}
    </>
  );
}
