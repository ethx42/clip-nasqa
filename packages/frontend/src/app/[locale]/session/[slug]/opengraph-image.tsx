import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { getSession, getSessionData } from "@/lib/session";

export const alt = "clip session — join and ask questions live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SessionOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession(slug);

  const logoPath = path.join(process.cwd(), "public/images/clip-logo-og.png");
  const logoSrc = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

  if (!session) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={logoSrc} width={64} height={55} alt="" />
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

  const { questions } = await getSessionData(slug);
  const questionCount = questions.length;
  const statusLabel = session.isActive ? "LIVE" : "ENDED";
  const statusColor = session.isActive ? "#22c55e" : "#71717a";
  const qrUrl = `https://clip.nasqa.io/session/${slug}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#09090b",
        position: "relative",
      }}
    >
      {/* Subtle glow — offset left for depth */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 70%)",
          top: "30%",
          left: "20%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Left column — branding + content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "56px 0 56px 64px",
          position: "relative",
        }}
      >
        {/* Top: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoSrc} width={36} height={36} alt="" />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#6366f1",
              letterSpacing: "-0.03em",
            }}
          >
            clip
          </span>
        </div>

        {/* Middle: session title + status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 620 }}>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            {session.title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Status pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "6px 16px",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                }}
              />
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: statusColor,
                  letterSpacing: "0.05em",
                }}
              >
                {statusLabel}
              </span>
            </div>
            {/* Question count */}
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 18,
                color: "#a1a1aa",
              }}
            >
              {questionCount} {questionCount === 1 ? "question" : "questions"}
            </span>
          </div>
        </div>

        {/* Bottom: CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#6366f1",
            borderRadius: 12,
            padding: "12px 28px",
            width: "fit-content",
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Join session →
          </span>
        </div>
      </div>

      {/* Right column — QR code card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 64px 56px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "32px 36px",
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&bgcolor=09090b&color=fafafa&format=png`}
            width={180}
            height={180}
            style={{ borderRadius: 12 }}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#71717a",
              letterSpacing: "0.02em",
            }}
          >
            Scan to join
          </span>
        </div>
      </div>

      {/* Bottom-right: URL watermark */}
      <span
        style={{
          position: "absolute",
          bottom: 24,
          right: 64,
          fontFamily: "sans-serif",
          fontSize: 14,
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
