"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Settings } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { categories as allCategories } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";

export default function SettingsPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [gameId, setGameId] = useState<string | null>(null);
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allCategories.map((c) => [c.id, c.enabled])),
  );
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);

  function toggleCategory(id: string) {
    setEnabledCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(() => {
    async function fetchGame() {
      const { data } = await getSupabase()
        .from("games")
        .select("id")
        .eq("short_code", shortCode)
        .single();
      if (data) setGameId(data.id);
    }
    fetchGame();
  }, [shortCode]);

  async function handleBack() {
    if (!gameId) return;
    await getSupabase()
      .from("games")
      .update({ status: "lobby" })
      .eq("id", gameId);
    router.push(`/host/${shortCode}`);
  }

  async function handleBegin() {
    if (!gameId) return;
    setLoading(true);
    await getSupabase()
      .from("games")
      .update({ status: "playing" })
      .eq("id", gameId);
    router.push(`/host/${shortCode}/play`);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-emerald-600 tracking-wide uppercase">
            Game Settings
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {shortCode}
          </h1>
        </div>

        {/* Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900">
                Categories
              </h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {allCategories.map((cat) => (
              <ToggleRow
                key={cat.id}
                label={cat.label}
                description={cat.description}
                checked={enabledCategories[cat.id] ?? false}
                onChange={() => toggleCategory(cat.id)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Difficulty */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">
              Difficulty
            </h2>
          </CardHeader>
          <CardContent>
            <Select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </Button>
          <Button size="lg" onClick={handleBegin} disabled={loading}>
            {loading ? "Starting\u2026" : "Begin Barbalak-Ball!"}
            {!loading && <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-zinc-900 cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
