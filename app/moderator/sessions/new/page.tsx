"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import SessionForm, {
  type SessionFormValues,
  type SessionFormSubmitOptions,
} from "@/components/session-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionDefaultsPayload } from "@/app/api/session-defaults/route";

const BASE_DEFAULTS: Omit<SessionFormValues, "date" | "notes"> = {
  name: "",
  start_time: "09:00",
  end_time: "12:00",
  location: "",
  num_courts: 4,
  max_players: 24,
  allow_player_assign_empty_court: false,
  allow_player_record_own_result: false,
  allow_player_record_any_result: false,
  show_skill_level_pills: true,
  allow_player_add_remove_courts: false,
  allow_player_access_invite_qr: false,
  pairing_rule: "least_played",
  max_partner_skill_level_gap: 2,
};

function valuesToDefaultsPayload(values: SessionFormValues): SessionDefaultsPayload {
  return {
    name: values.name,
    start_time: values.start_time,
    end_time: values.end_time,
    location: values.location || null,
    num_courts: values.num_courts,
    max_players: values.max_players,
    allow_player_assign_empty_court: values.allow_player_assign_empty_court,
    allow_player_record_own_result: values.allow_player_record_own_result,
    allow_player_record_any_result: values.allow_player_record_any_result,
    show_skill_level_pills: values.show_skill_level_pills,
    allow_player_add_remove_courts: values.allow_player_add_remove_courts,
    allow_player_access_invite_qr: values.allow_player_access_invite_qr,
    pairing_rule: values.pairing_rule,
    max_partner_skill_level_gap: values.max_partner_skill_level_gap,
  };
}

export default function NewSessionPage() {
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<SessionFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    const todayForForm = format(new Date(), "yyyy-MM-dd");
    (async () => {
      const res = await fetch("/api/session-defaults");
      if (!res.ok || cancelled) return;
      const saved = (await res.json()) as SessionDefaultsPayload | null;
      const merged: SessionFormValues = saved
        ? {
            ...BASE_DEFAULTS,
            ...saved,
            location: saved.location ?? "",
            date: todayForForm,
            notes: "",
          }
        : {
            ...BASE_DEFAULTS,
            date: todayForForm,
            notes: "",
          };
      if (!cancelled) setInitialValues(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (
    values: SessionFormValues,
    options?: SessionFormSubmitOptions
  ) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create session");
    }
    const session = await res.json();

    if (options?.rememberDefaults) {
      await fetch("/api/session-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valuesToDefaultsPayload(values)),
      });
    }

    router.push(`/moderator/sessions/${session.id}`);
  };

  if (initialValues === null) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">New Session</h1>
        <div className="rounded-xl border bg-white p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          {/* Date */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          {/* Time row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          {/* Location */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          {/* Courts + max players */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          {/* Permission toggles */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Session</h1>
      <div className="rounded-xl border bg-white p-6">
        <SessionForm
          mode="create"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          showRememberDefaults
        />
      </div>
    </div>
  );
}
