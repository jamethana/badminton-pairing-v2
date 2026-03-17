"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AvatarStack, type PlayerLite } from "@/components/avatar-stack";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type UserSession = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: "draft" | "active" | "completed";
  creatorDisplayName?: string;
  playerCount?: number;
  playerSample?: PlayerLite[];
  maxPlayers?: number;
  /** Total players in session (for capacity badge); uses totalPlayerCount when set, else playerCount */
  totalPlayerCount?: number;
};

interface Props {
  sessions: UserSession[];
}

export default function UserSessionsList({ sessions }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);

  const hasCompleted = useMemo(() => sessions.some((s) => s.status === "completed"), [sessions]);

  const visibleSessions = useMemo(
    () => (showCompleted ? sessions : sessions.filter((s) => s.status !== "completed")),
    [sessions, showCompleted]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Your Sessions</h2>
        {hasCompleted && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowCompleted((prev) => !prev)}
          >
            {showCompleted ? "Hide Completed" : "Show Completed"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {visibleSessions.length > 0 ? (
            visibleSessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between px-4 py-3 outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.date + "T00:00:00"), "EEE, MMM d")}
                    {session.location && ` · ${session.location}`}
                  </p>
                  {session.creatorDisplayName && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Created by {session.creatorDisplayName}
                    </p>
                  )}
                  {session.maxPlayers != null && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {(session.totalPlayerCount ?? session.playerCount ?? 0)}/{session.maxPlayers} ·{" "}
                      {(session.totalPlayerCount ?? session.playerCount ?? 0) >= session.maxPlayers
                        ? "Full"
                        : "Open"}
                    </p>
                  )}
                  {session.playerCount !== undefined && session.playerCount > 0 && (
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {session.playerCount} {session.playerCount === 1 ? "player" : "players"}{" "}
                        joined
                      </p>
                      <AvatarStack players={session.playerSample ?? []} max={4} size={24} />
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    session.status === "active"
                      ? "secondary"
                      : session.status === "completed"
                        ? "outline"
                        : "ghost"
                  }
                  className="text-[11px] capitalize"
                >
                  {session.status}
                </Badge>
              </Link>
            ))
          ) : sessions.length > 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No upcoming or active sessions. Toggle to show completed sessions.
            </p>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You haven&apos;t been added to any sessions yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

