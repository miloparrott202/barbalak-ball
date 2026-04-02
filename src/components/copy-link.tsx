"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyLinkProps {
  url: string;
}

export function CopyLink({ url }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-600">Link Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>Copy Join Link</span>
        </>
      )}
    </Button>
  );
}
