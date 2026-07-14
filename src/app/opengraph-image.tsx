import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#050510",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.2), transparent 45%), radial-gradient(circle at 80% 80%, rgba(217,70,239,0.16), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              backgroundColor: "#7C3AED",
              display: "flex",
            }}
          />
          <span style={{ fontSize: 28, color: "#D946EF", letterSpacing: 2 }}>
            MARKETING &amp; PERFORMANCE
          </span>
        </div>
        <span
          style={{
            marginTop: 32,
            fontSize: 84,
            fontWeight: 600,
            color: "#F5F7F6",
            lineHeight: 1.1,
          }}
        >
          Brain
        </span>
        <span
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "#A89BC2",
            maxWidth: 820,
          }}
        >
          {siteConfig.description}
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
