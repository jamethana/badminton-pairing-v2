"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function NewSessionPage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    name: "",
    date: today,
    start_time: "09:00",
    end_time: "12:00",
    location: "",
    num_courts: 4,
    max_players: 24,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create session");
      }
      const session = await res.json();
      router.push(`/moderator/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Session</h1>
      <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Session Name *</label>
          <Input
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. Tuesday Morning Session"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date *</label>
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
            <Input
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g. 71 Sports Club"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Time *</label>
            <Input
              type="time"
              required
              value={form.start_time}
              onChange={(e) => handleChange("start_time", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">End Time *</label>
            <Input
              type="time"
              required
              value={form.end_time}
              onChange={(e) => handleChange("end_time", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Courts</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.num_courts}
              onChange={(e) => handleChange("num_courts", parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Max Players</label>
            <Input
              type="number"
              min={4}
              max={50}
              value={form.max_players}
              onChange={(e) => handleChange("max_players", parseInt(e.target.value))}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
            {loading ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
