"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LinkIcon, QrCodeIcon, UserPlusIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// QR library loaded only when the QR dialog is opened (bundle-conditional)
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

interface Props {
  sessionId: string;
}

export default function SessionInviteActions({ sessionId }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [sessionUrl, setSessionUrl] = useState("");

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/sessions/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShowQR = () => {
    setSessionUrl(`${window.location.origin}/sessions/${sessionId}`);
    setQrOpen(true);
  };

  return (
    <>
      {/* Screen-reader live region for copy feedback */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Invite players"
            className="touch-action-manipulation gap-1.5"
          >
            <UserPlusIcon />
            Invite Players
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? (
              <CheckIcon className="text-green-600" />
            ) : (
              <LinkIcon />
            )}
            {copied ? "Link Copied!" : "Copy Link"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShowQR}>
            <QrCodeIcon />
            Show QR Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm overscroll-contain">
          <DialogHeader>
            <DialogTitle>Invite Players</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrOpen ? (
              <div className="rounded-lg border bg-white p-4">
                <QRCode value={sessionUrl} size={220} />
              </div>
            ) : null}
            <p className="text-center text-xs text-gray-500">
              Players can scan this code to open the session and join.
            </p>
            <div className="flex w-full items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                {sessionUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy session link"
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {copied ? (
                  <CheckIcon className="size-4 text-green-600" />
                ) : (
                  <LinkIcon className="size-4" />
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
