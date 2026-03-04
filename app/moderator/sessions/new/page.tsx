"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import SessionForm, { type SessionFormValues } from "@/components/session-form";

export default function NewSessionPage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const initialValues: SessionFormValues = {
    name: "",
    date: today,
    start_time: "09:00",
    end_time: "12:00",
    location: "",
    num_courts: 4,
    max_players: 24,
    notes: "",
  };

  const handleSubmit = async (values: SessionFormValues) => {
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
    router.push(`/moderator/sessions/${session.id}`);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Session</h1>
      <div className="rounded-xl border bg-white p-6">
        <SessionForm
          mode="create"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
