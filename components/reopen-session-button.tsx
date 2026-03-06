"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReopenSessionButtonProps {
  sessionId: string;
}

export default function ReopenSessionButton({ sessionId }: ReopenSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReopen = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to reopen session.");
        return;
      }
      router.push(`/moderator/sessions/${sessionId}`);
      router.refresh();
    } catch {
      setError("Failed to reopen session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReopen}
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Reopening…" : "Reopen Session"}
      </button>
      {error && (
        <p role="status" aria-live="polite" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
