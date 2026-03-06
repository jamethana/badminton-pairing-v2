"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import SessionForm, {
  type SessionFormValues,
  type SessionFormSubmitOptions,
} from "@/components/session-form";
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
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          </div>
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
