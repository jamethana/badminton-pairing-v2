"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SessionForm, { type SessionFormValues } from "@/components/session-form";
import type { PairingRule, SessionStatus } from "@/types/database";

export interface SessionEditProps {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  num_courts: number;
  max_players: number;
  status: SessionStatus;
  notes: string | null;
  allow_player_assign_empty_court: boolean;
  allow_player_record_own_result: boolean;
  allow_player_record_any_result: boolean;
  show_skill_level_pills: boolean;
  allow_player_add_remove_courts: boolean;
  allow_player_access_invite_qr: boolean;
  pairing_rule: PairingRule;
  max_partner_skill_level_gap: number;
}

export default function SessionEditDialog({
  id,
  name,
  date,
  start_time,
  end_time,
  location,
  num_courts,
  max_players,
  status,
  notes,
  allow_player_assign_empty_court,
  allow_player_record_own_result,
  allow_player_record_any_result,
  show_skill_level_pills,
  allow_player_add_remove_courts,
  allow_player_access_invite_qr,
  pairing_rule,
  max_partner_skill_level_gap,
}: SessionEditProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initialValues: SessionFormValues = {
    name,
    date,
    start_time: start_time.slice(0, 5),
    end_time: end_time.slice(0, 5),
    location: location ?? "",
    num_courts,
    max_players,
    status,
    notes: notes ?? "",
    allow_player_assign_empty_court,
    allow_player_record_own_result,
    allow_player_record_any_result,
    show_skill_level_pills,
    allow_player_add_remove_courts,
    allow_player_access_invite_qr,
    pairing_rule,
    max_partner_skill_level_gap,
  };

  const handleSubmit = async (values: SessionFormValues) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        location: values.location.trim() || null,
        notes: values.notes.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Failed to save session"
      );
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <SessionForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
