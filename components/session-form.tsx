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

type AssignmentLevel = "moderators" | "everyone";
type ResultLevel = "none" | "own" | "any";

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
  allow_player_assign_empty_court: boolean;
  allow_player_record_own_result: boolean;
  allow_player_record_any_result: boolean;
  show_skill_level_pills: boolean;
  allow_player_add_remove_courts: boolean;
  allow_player_access_invite_qr: boolean;
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

  const set = <K extends keyof SessionFormValues>(field: K, value: SessionFormValues[K]) => {
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

  const assignmentLevel: AssignmentLevel = form.allow_player_assign_empty_court
    ? "everyone"
    : "moderators";

  const resultLevel: ResultLevel = form.allow_player_record_any_result
    ? "any"
    : form.allow_player_record_own_result
      ? "own"
      : "none";

  const setAssignmentLevel = (level: AssignmentLevel) => {
    set("allow_player_assign_empty_court", level === "everyone");
  };

  const setResultLevel = (level: ResultLevel) => {
    set("allow_player_record_own_result", level === "own");
    set("allow_player_record_any_result", level === "any");
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* Permissions */}
      <div className="space-y-3 rounded-lg border bg-gray-50 px-3 py-3">
        <p className="text-sm font-semibold text-gray-800">Player permissions</p>
        <p className="text-xs text-gray-500">
          Choose what players can do in this session. You can change these later from the
          session dashboard.
        </p>

        {/* Assign empty courts */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700">
            Who can assign games to empty courts?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-md border px-2 py-1.5 text-xs ${
                assignmentLevel === "moderators"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              onClick={() => setAssignmentLevel("moderators")}
            >
              Moderators only
            </button>
            <button
              type="button"
              className={`rounded-md border px-2 py-1.5 text-xs ${
                assignmentLevel === "everyone"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              onClick={() => setAssignmentLevel("everyone")}
            >
              Everyone in this session
            </button>
          </div>
        </div>

        {/* Record results */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700">
            Who can record match results?
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`rounded-md border px-2 py-1.5 text-xs ${
                resultLevel === "none"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              onClick={() => setResultLevel("none")}
            >
              Moderators only
            </button>
            <button
              type="button"
              className={`rounded-md border px-2 py-1.5 text-xs ${
                resultLevel === "own"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              onClick={() => setResultLevel("own")}
            >
              Own matches
            </button>
            <button
              type="button"
              className={`rounded-md border px-2 py-1.5 text-xs ${
                resultLevel === "any"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              onClick={() => setResultLevel("any")}
            >
              Any match
            </button>
          </div>
        </div>

        {/* Add/remove courts */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700">
            Can players add or remove courts?
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={form.allow_player_add_remove_courts}
              onChange={(e) => set("allow_player_add_remove_courts", e.target.checked)}
            />
            <span>Allow players in this session to add or remove courts.</span>
          </label>
        </div>

        {/* Invite / QR access */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700">
            Can players access the invite link & QR?
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={form.allow_player_access_invite_qr}
              onChange={(e) => set("allow_player_access_invite_qr", e.target.checked)}
            />
            <span>Show the invite button to players on the session page.</span>
          </label>
        </div>

        {/* Skill level pills */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={form.show_skill_level_pills}
              onChange={(e) => set("show_skill_level_pills", e.target.checked)}
            />
            <span>Show skill level pills next to player names.</span>
          </label>
        </div>
      </div>

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
