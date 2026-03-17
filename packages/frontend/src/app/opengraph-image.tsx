import { ImageResponse } from "next/og";

export const alt = "clip — real-time clipboard and Q&A for live sessions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
      {/* Subtle emerald glow behind the wordmark */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)",
        }}
      />
      {/* "clip" wordmark */}
      <span
        style={{
          fontFamily: "sans-serif",
          fontSize: 96,
          fontWeight: 700,
          color: "#10b981",
          letterSpacing: "-0.04em",
          position: "relative",
        }}
      >
        clip
      </span>
    </div>,
    { ...size },
  );
}
