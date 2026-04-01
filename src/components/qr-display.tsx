"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRDisplayProps {
  url: string;
  size?: number;
}

export function QRDisplay({ url, size = 200 }: QRDisplayProps) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <QRCodeSVG
        value={url}
        size={size}
        bgColor="#ffffff"
        fgColor="#18181b"
        level="M"
      />
    </div>
  );
}
