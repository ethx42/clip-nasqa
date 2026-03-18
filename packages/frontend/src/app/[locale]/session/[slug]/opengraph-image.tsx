import { ImageResponse } from "next/og";

import { getSession, getSessionData } from "@/lib/session";

export const alt = "clip session — join and ask questions live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Inline SVG logo mark — Satori-compatible */
function LogoMark({ size: s, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="100 85 824 855"
      width={s}
      height={s}
      fill="none"
      stroke={color}
      strokeWidth={65}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M582.687,151.44c88.633,46.208 124.112,154.761 79.876,244.395c-51.925,105.214 -114.549,232.104 -139.582,282.828c-6.796,13.77 -20.916,22.393 -36.269,22.151c-53.688,-0.848 -182.101,-2.876 -273.696,-4.323c-22.082,-0.349 -42.459,-11.945 -54.037,-30.752c-11.578,-18.807 -12.754,-42.223 -3.12,-62.096c50.081,-103.308 132.337,-272.989 191.142,-394.294c18.364,-37.882 51.28,-66.717 91.248,-79.936c39.969,-13.219 83.586,-9.697 120.916,9.764c7.802,4.067 15.667,8.168 23.523,12.263Z" />
      <path d="M422.18,872.922c-89.217,-45.069 -126.083,-153.16 -82.998,-243.352c50.574,-105.87 111.568,-233.551 135.95,-284.592c6.619,-13.856 20.627,-22.659 35.983,-22.613c53.694,0.161 182.123,0.545 273.729,0.819c22.085,0.066 42.609,11.401 54.426,30.058c11.817,18.657 13.294,42.056 3.915,62.051c-48.754,103.941 -128.831,274.661 -186.078,396.708c-17.877,38.114 -50.421,67.368 -90.217,81.098c-39.796,13.73 -83.455,10.767 -121.031,-8.215c-7.853,-3.967 -15.771,-7.967 -23.678,-11.961Z" />
    </svg>
  );
}

export default async function SessionOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession(slug);
  } catch {
    /* DynamoDB or network error — fall through to fallback card */
  }

  if (!session) {
    const homeQrUrl = "https://clip.nasqa.io";

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#09090b",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #4f46e5 100%)",
          }}
        />

        {/* Primary glow */}
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 35%, rgba(99,102,241,0) 60%)",
            top: "35%",
            left: "25%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Secondary glow — QR zone */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(129,140,248,0.14) 0%, rgba(129,140,248,0) 65%)",
            top: "55%",
            left: "80%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "52px 0 52px 64px",
            position: "relative",
          }}
        >
          {/* Brand + tagline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LogoMark size={44} color="#818cf8" />
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#818cf8",
                  letterSpacing: "-0.02em",
                }}
              >
                CLIP
              </span>
            </div>
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 16,
                fontWeight: 500,
                color: "#71717a",
                letterSpacing: "0.01em",
                paddingLeft: 58,
              }}
            >
              Real-time Q&A for live sessions
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 620 }}>
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 56,
                fontWeight: 800,
                color: "#fafafa",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
              }}
            >
              Share snippets & collect questions in real-time
            </span>
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 19,
                color: "#a1a1aa",
                fontWeight: 500,
              }}
            >
              The live session companion for presenters and audiences
            </span>
          </div>

          {/* CTA + domain */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#6366f1",
                borderRadius: 14,
                padding: "14px 32px",
              }}
            >
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                Start a Session →
              </span>
            </div>
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 22,
                color: "#a1a1aa",
                fontWeight: 600,
              }}
            >
              clip.nasqa.io
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ display: "flex", alignItems: "center", padding: "80px 0" }}>
          <div
            style={{
              width: 1,
              height: "100%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)",
            }}
          />
        </div>

        {/* Right column — QR */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "52px 64px 52px 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              backgroundColor: "rgba(255,255,255,0.03)",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "36px 40px",
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(homeQrUrl)}&bgcolor=09090b&color=fafafa&format=png`}
              width={200}
              height={200}
              style={{ borderRadius: 12 }}
            />
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "#a1a1aa",
                letterSpacing: "0.02em",
              }}
            >
              Scan to Visit
            </span>
          </div>
        </div>
      </div>,
      { ...size },
    );
  }

  let questionCount = 0;
  try {
    const { questions } = await getSessionData(slug);
    questionCount = questions.length;
  } catch {
    /* best-effort — show 0 if data fetch fails */
  }
  const statusLabel = session.isActive ? "LIVE" : "ENDED";
  const statusDot = session.isActive ? "#22c55e" : "#71717a";
  const statusText = session.isActive ? "#4ade80" : "#a1a1aa";
  const qrUrl = `https://clip.nasqa.io/session/${slug}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#09090b",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line — 6px, visible even at thumbnail size */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #4f46e5 100%)",
        }}
      />

      {/* Primary glow — strong indigo spotlight on content */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 35%, rgba(99,102,241,0) 60%)",
          top: "35%",
          left: "25%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Secondary glow — subtle warm wash on QR zone */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,0.14) 0%, rgba(129,140,248,0) 65%)",
          top: "55%",
          left: "80%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Left column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "52px 0 52px 64px",
          position: "relative",
        }}
      >
        {/* Brand + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LogoMark size={44} color="#818cf8" />
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 36,
                fontWeight: 800,
                color: "#818cf8",
                letterSpacing: "-0.02em",
              }}
            >
              CLIP
            </span>
          </div>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 16,
              fontWeight: 500,
              color: "#71717a",
              letterSpacing: "0.01em",
              paddingLeft: 58,
            }}
          >
            Real-time Q&A for live sessions
          </span>
        </div>

        {/* Title + status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 620 }}>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 56,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            {session.title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "8px 18px",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: statusDot,
                }}
              />
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: statusText,
                  letterSpacing: "0.06em",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 19,
                color: "#a1a1aa",
                fontWeight: 500,
              }}
            >
              {questionCount} {questionCount === 1 ? "Question" : "Questions"}
            </span>
          </div>
        </div>

        {/* CTA + domain */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#6366f1",
              borderRadius: 14,
              padding: "14px 32px",
            }}
          >
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              Join Session →
            </span>
          </div>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 22,
              color: "#a1a1aa",
              fontWeight: 600,
            }}
          >
            clip.nasqa.io
          </span>
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{ display: "flex", alignItems: "center", padding: "80px 0" }}>
        <div
          style={{
            width: 1,
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>

      {/* Right column — QR */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "52px 64px 52px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "36px 40px",
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&bgcolor=09090b&color=fafafa&format=png`}
            width={200}
            height={200}
            style={{ borderRadius: 12 }}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#a1a1aa",
              letterSpacing: "0.02em",
            }}
          >
            Scan to Join
          </span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
