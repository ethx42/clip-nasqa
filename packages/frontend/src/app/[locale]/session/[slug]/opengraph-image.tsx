import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { getSession, getSessionData } from "@/lib/session";

export const alt = "clip session";
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
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
  const status = session.isActive
    ? `Live — ${questionCount} questions`
    : `Ended — ${questionCount} questions`;
  const qrUrl = `https://clip.nasqa.io/session/${slug}`;

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
        padding: 60,
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Top bar: logo mark + "clip" branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "absolute",
          top: 40,
          left: 60,
        }}
      >
        <img src={logoSrc} width={32} height={27} alt="" />
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#6366f1",
            letterSpacing: "-0.04em",
          }}
        >
          clip
        </span>
      </div>

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Left: title and status */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            paddingRight: 40,
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 48,
              fontWeight: 700,
              color: "#fafafa",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {session.title}
          </span>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 24,
              color: "#a1a1aa",
              marginTop: 16,
            }}
          >
            {status}
          </span>
        </div>

        {/* Right: QR code */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}&bgcolor=09090b&color=fafafa&format=png`}
            width={160}
            height={160}
            style={{ borderRadius: 8 }}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 14,
              color: "#71717a",
            }}
          >
            Scan to join
          </span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
