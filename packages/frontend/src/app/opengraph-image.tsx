import { ImageResponse } from "next/og";

import { OG_LOGO_SRC } from "@/lib/og-logo";

export const alt = "clip — real-time clipboard and Q&A for live sessions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logoSrc = OG_LOGO_SRC;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        position: "relative",
      }}
    >
      {/* Subtle indigo glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)",
        }}
      />
      {/* Logo mark + wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "relative",
        }}
      >
        <img src={logoSrc} width={80} height={80} alt="" />
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 96,
            fontWeight: 800,
            color: "#6366f1",
            letterSpacing: "-0.04em",
          }}
        >
          clip
        </span>
      </div>
      {/* Tagline */}
      <span
        style={{
          fontFamily: "sans-serif",
          fontSize: 24,
          color: "#a1a1aa",
          marginTop: 24,
          letterSpacing: "-0.01em",
          position: "relative",
        }}
      >
        Real-time clipboard and Q&A for live sessions
      </span>
      {/* URL watermark */}
      <span
        style={{
          position: "absolute",
          bottom: 32,
          fontFamily: "sans-serif",
          fontSize: 16,
          color: "#3f3f46",
          letterSpacing: "0.02em",
        }}
      >
        clip.nasqa.io
      </span>
    </div>,
    { ...size },
  );
}
