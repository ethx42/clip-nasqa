import QRCode from 'qrcode';

export async function QRCodeDisplay({
  url,
  size = 200,
}: {
  url: string;
  size?: number;
}) {
  const svg = await QRCode.toString(url, { type: 'svg', width: size, margin: 2 });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      className="rounded-xl bg-white p-3 shadow-sm"
      style={{ width: size, height: size }}
    />
  );
}
