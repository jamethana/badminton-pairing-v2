"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SessionStatus } from "@/types/database";

export interface SessionFormValues {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  num_courts: number;
  max_players: number;
  status?: SessionStatus;
  notes: string;
}

interface SessionFormProps {
  mode: "create" | "edit";
  initialValues: SessionFormValues;
  onSubmit: (values: SessionFormValues) => Promise<void>;
  onCancel?: () => void;
}

export default function SessionForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [form, setForm] = useState<SessionFormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof SessionFormValues, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.end_time <= form.start_time) {
      setError("End time must be after start time.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Session Name *
        </label>
        <Input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Tuesday Morning Session"
        />
      </div>

      {/* Date + Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Date *
          </label>
          <Input
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Location
          </label>
          <Input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. 71 Sports Club"
          />
        </div>
      </div>

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Start Time *
          </label>
          <Input
            type="time"
            required
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            End Time *
          </label>
          <Input
            type="time"
            required
            value={form.end_time}
            onChange={(e) => set("end_time", e.target.value)}
          />
        </div>
      </div>

      {/* Courts + Max Players */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Courts
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={form.num_courts}
            onChange={(e) => set("num_courts", parseInt(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Max Players
          </label>
          <Input
            type="number"
            min={1}
            value={form.max_players}
            onChange={(e) => set("max_players", parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Status — edit mode only */}
      {mode === "edit" && form.status !== undefined && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Status
          </label>
          <Select
            value={form.status}
            onValueChange={(val) => set("status", val as SessionStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed (ended)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes for this session…"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {loading
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create Session"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
