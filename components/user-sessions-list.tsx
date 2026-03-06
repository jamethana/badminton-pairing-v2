"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
};

export type UserSession = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: "draft" | "active" | "completed";
  creatorDisplayName?: string;
};

interface Props {
  sessions: UserSession[];
}

export default function UserSessionsList({ sessions }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);

  const hasCompleted = useMemo(
    () => sessions.some((s) => s.status === "completed"),
    [sessions]
  );

  const visibleSessions = useMemo(
    () => (showCompleted ? sessions : sessions.filter((s) => s.status !== "completed")),
    [sessions, showCompleted]
  );

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-gray-800">Your Sessions</h2>
        {hasCompleted && (
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            <span>{showCompleted ? "Hide completed" : "Show completed"}</span>
          </button>
        )}
      </div>
      <div className="divide-y">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{session.name}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(session.date + "T00:00:00"), "EEE, MMM d")}
                  {session.location && ` · ${session.location}`}
                </p>
                {session.creatorDisplayName && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    Created by {session.creatorDisplayName}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[session.status] ?? ""
                }`}
              >
                {session.status}
              </span>
            </Link>
          ))
        ) : sessions.length > 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No upcoming or active sessions. Toggle to show completed sessions.
          </p>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            You haven&apos;t been added to any sessions yet.
          </p>
        )}
      </div>
    </div>
  );
}

