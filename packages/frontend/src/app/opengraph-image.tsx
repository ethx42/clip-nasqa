import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

export const alt = "clip — real-time clipboard and Q&A for live sessions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logoPath = path.join(process.cwd(), "public/images/clip-logo-og.png");
  const logoSrc = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        position: "relative",
      }}
    >
      {/* Subtle indigo glow behind the logo */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)",
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
        <img src={logoSrc} width={80} height={68} alt="" />
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 96,
            fontWeight: 700,
            color: "#6366f1",
            letterSpacing: "-0.04em",
          }}
        >
          clip
        </span>
      </div>
    </div>,
    { ...size },
  );
}
