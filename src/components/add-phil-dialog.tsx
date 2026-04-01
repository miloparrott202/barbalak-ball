"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { icons } from "@/lib/content";

interface AddPhilDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
}

export function AddPhilDialog({ open, onClose, gameId }: AddPhilDialogProps) {
  const [name, setName] = useState("");
  const [iconId, setIconId] = useState(icons[0]?.id ?? "icon-1");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await getSupabase().from("players").insert({
        game_id: gameId,
        name: name.trim(),
        icon_id: iconId,
        is_phoneless_phil: true,
      });
      if (error) throw error;
      setName("");
      setIconId(icons[0]?.id ?? "icon-1");
      onClose();
    } catch (err) {
      console.error("Failed to add Phoneless Phil:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Phoneless Phil">
      <div className="space-y-4">
        <div>
          <label htmlFor="phil-name" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Name
          </label>
          <Input
            id="phil-name"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Icon
          </label>
          <div className="grid grid-cols-6 gap-2">
            {icons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => setIconId(icon.id)}
                className={`flex h-10 w-full items-center justify-center rounded-lg border-2 text-xs font-semibold transition-colors ${
                  iconId === icon.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                }`}
              >
                {icon.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim() || submitting}>
            {submitting ? "Adding\u2026" : "Add Player"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
