"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QRCodeClient({ url, size = 200 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    QRCode.toString(url, { type: "svg", width: size, margin: 2 }).then(setSvg);
  }, [url, size]);

  if (!svg)
    return (
      <div
        style={{ width: size + 24, height: size + 24 }}
        className="shrink-0 rounded-xl bg-white p-3 shadow-sm"
      />
    );

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      className="shrink-0 rounded-xl bg-white p-3 shadow-sm [&>svg]:block"
      style={{ width: size + 24, height: size + 24 }}
    />
  );
}
