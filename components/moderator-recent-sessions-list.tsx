"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
};

export type ModeratorSession = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: "draft" | "active" | "completed";
  creatorDisplayName?: string;
};

interface Props {
  sessions: ModeratorSession[];
}

export default function ModeratorRecentSessionsList({ sessions }: Props) {
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
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-gray-800">Recent Sessions</h2>
        <div className="flex items-center gap-2">
          {hasCompleted && (
            <button
              type="button"
              onClick={() => setShowCompleted((prev) => !prev)}
              className="hidden text-xs font-medium text-gray-600 hover:text-gray-800 sm:inline-flex"
            >
              {showCompleted ? "Hide completed" : "Show completed"}
            </button>
          )}
          <Link
            href="/moderator/sessions"
            className="text-sm text-green-600 hover:underline"
          >
            View all →
          </Link>
        </div>
      </div>
      <div className="divide-y">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <Link
              key={session.id}
              href={`/moderator/sessions/${session.id}`}
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
              <Badge className={STATUS_STYLES[session.status]}>{session.status}</Badge>
            </Link>
          ))
        ) : sessions.length > 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No upcoming or active sessions. Toggle to show completed sessions.
          </p>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No sessions yet.{" "}
            <Link
              href="/moderator/sessions/new"
              className="text-green-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </>
  );
}

