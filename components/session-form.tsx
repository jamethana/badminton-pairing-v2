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
import { cn } from "@/lib/utils";
import type { PairingRule, SessionStatus } from "@/types/database";

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
  pairing_rule: PairingRule;
  max_partner_skill_level_gap: number;
}

export interface SessionFormSubmitOptions {
  rememberDefaults?: boolean;
}

interface SessionFormProps {
  mode: "create" | "edit";
  initialValues: SessionFormValues;
  onSubmit: (values: SessionFormValues, options?: SessionFormSubmitOptions) => Promise<void>;
  onCancel?: () => void;
  /** When true (create mode only), show "Remember my current settings for next time" checkbox. */
  showRememberDefaults?: boolean;
}

export default function SessionForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  showRememberDefaults = false,
}: SessionFormProps) {
  const [form, setForm] = useState<SessionFormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberDefaults, setRememberDefaults] = useState(false);

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
      await onSubmit(form, showRememberDefaults ? { rememberDefaults } : undefined);
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

  const courtsLevel: AssignmentLevel = form.allow_player_add_remove_courts
    ? "everyone"
    : "moderators";
  const inviteLevel: AssignmentLevel = form.allow_player_access_invite_qr
    ? "everyone"
    : "moderators";

  const setCourtsLevel = (level: AssignmentLevel) => {
    set("allow_player_add_remove_courts", level === "everyone");
  };
  const setInviteLevel = (level: AssignmentLevel) => {
    set("allow_player_access_invite_qr", level === "everyone");
  };

  const segmentButtonClass = (isSelected: boolean, idx: number) =>
    cn(
      "flex-1 min-w-0 px-2 py-2 text-xs font-medium text-center transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500",
      idx > 0 && "border-l border-gray-200",
      isSelected
        ? "bg-green-600 text-white"
        : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
    );

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

      {/* Pairing settings */}
      <div className="space-y-4 rounded-lg border bg-gray-50 px-3 py-3">
        <p className="text-sm font-semibold text-gray-800">Pairing settings</p>
        <p className="text-xs text-gray-500">
          Controls how the auto-pairing algorithm picks players for each court.
        </p>

        {/* Pairing rule */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">Player selection priority</p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: "least_played" as const, label: "Fewest games" },
              { value: "longest_wait" as const, label: "Longest wait" },
              { value: "balanced" as const, label: "Balanced" },
            ].map(({ value, label }, idx) => (
              <button
                key={value}
                type="button"
                className={segmentButtonClass(form.pairing_rule === value, idx)}
                onClick={() => set("pairing_rule", value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {form.pairing_rule === "least_played" && "Prioritise players who have played the fewest matches this session."}
            {form.pairing_rule === "longest_wait" && "Prioritise players who have been sitting out the longest."}
            {form.pairing_rule === "balanced" && "Blend both — equal weight on fewest matches and longest wait."}
          </p>
        </div>

        {/* Max partner skill gap */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Max partner skill gap</p>
            <span className="text-sm font-semibold text-green-700">
              {form.max_partner_skill_level_gap === 10 ? "Any" : `±${form.max_partner_skill_level_gap}`}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={form.max_partner_skill_level_gap}
            onChange={(e) => set("max_partner_skill_level_gap", parseInt(e.target.value))}
            className="w-full accent-green-600"
          />
          <p className="text-xs text-gray-500">
            {form.max_partner_skill_level_gap === 10
              ? "No restriction — any two players can be paired as partners."
              : `Partners must be within ${form.max_partner_skill_level_gap} skill level${form.max_partner_skill_level_gap === 1 ? "" : "s"} of each other (scale 1–10).`}
          </p>
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-4 rounded-lg border bg-gray-50 px-3 py-3">
        <p className="text-sm font-semibold text-gray-800">Player permissions</p>
        <p className="text-xs text-gray-500">
          Choose what players can do in this session. You can change these later from the
          session dashboard.
        </p>

        {/* Assign empty courts */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Who can assign games to empty courts?
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: "moderators" as const, label: "Moderators only" },
              { value: "everyone" as const, label: "Everyone in this session" },
            ].map(({ value, label }, idx) => (
              <button
                key={value}
                type="button"
                className={segmentButtonClass(assignmentLevel === value, idx)}
                onClick={() => setAssignmentLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Record results */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Who can record match results?
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: "none" as const, label: "Moderators only" },
              { value: "own" as const, label: "Own matches" },
              { value: "any" as const, label: "Any match" },
            ].map(({ value, label }, idx) => (
              <button
                key={value}
                type="button"
                className={segmentButtonClass(resultLevel === value, idx)}
                onClick={() => setResultLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Add/remove courts */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Who can add or remove courts?
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: "moderators" as const, label: "Moderators only" },
              { value: "everyone" as const, label: "Everyone in this session" },
            ].map(({ value, label }, idx) => (
              <button
                key={value}
                type="button"
                className={segmentButtonClass(courtsLevel === value, idx)}
                onClick={() => setCourtsLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Invite / QR access */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Who can access the invite link & QR code?
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: "moderators" as const, label: "Moderators only" },
              { value: "everyone" as const, label: "Everyone in this session" },
            ].map(({ value, label }, idx) => (
              <button
                key={value}
                type="button"
                className={segmentButtonClass(inviteLevel === value, idx)}
                onClick={() => setInviteLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Skill level in player list */}
        <div className="space-y-1.5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Show skill level in player list?
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { value: false, label: "Hide" },
              { value: true, label: "Show" },
            ].map(({ value, label }, idx) => (
              <button
                key={label}
                type="button"
                className={segmentButtonClass(form.show_skill_level_pills === value, idx)}
                onClick={() => set("show_skill_level_pills", value)}
              >
                {label}
              </button>
            ))}
          </div>
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

      {showRememberDefaults && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={rememberDefaults}
            onChange={(e) => setRememberDefaults(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span>Remember my current settings for next time</span>
        </label>
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
