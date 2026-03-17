import { ImageResponse } from "next/og";

import { getSession, getSessionData } from "@/lib/session";

export const alt = "clip session";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SessionOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession(slug);

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
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 96,
            fontWeight: 700,
            color: "#10b981",
            letterSpacing: "-0.04em",
          }}
        >
          clip
        </span>
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
          background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0) 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Top bar: "clip" branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "absolute",
          top: 40,
          left: 60,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#10b981",
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

        {/* Right: QR code placeholder rendered as a grid pattern */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* QR code via external API */}
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
