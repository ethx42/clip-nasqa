"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/report-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#fafafa",
          color: "#18181b",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "#71717a",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
