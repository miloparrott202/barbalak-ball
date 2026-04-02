"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { categories as allCategories } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [gameId, setGameId] = useState<string | null>(null);
  const [pointThreshold, setPointThreshold] = useState(100);
  const [loading, setLoading] = useState(false);

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allCategories.map((c) => [c.id, c.enabled])),
  );
  const [subEnabled, setSubEnabled] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const c of allCategories) {
      if (c.subcategories) {
        for (const s of c.subcategories) {
          m[s.id] = s.enabled;
        }
      }
    }
    return m;
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchGame() {
      const { data } = await getSupabase()
        .from("games")
        .select("id, point_threshold")
        .eq("short_code", shortCode)
        .single();
      if (data) {
        setGameId(data.id);
        if (data.point_threshold) setPointThreshold(data.point_threshold);
      }
    }
    fetchGame();
  }, [shortCode]);

  function toggleCat(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleSub(id: string) {
    setSubEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function collectEnabledIds(): string[] {
    const ids: string[] = [];
    for (const c of allCategories) {
      if (!enabled[c.id]) continue;
      ids.push(c.id);
      if (c.subcategories) {
        for (const s of c.subcategories) {
          if (subEnabled[s.id]) ids.push(s.id);
        }
      }
    }
    return ids;
  }

  async function handleBack() {
    if (!gameId) return;
    await getSupabase().from("games").update({ status: "lobby" }).eq("id", gameId);
    router.push(`/host/${shortCode}`);
  }

  async function handleBegin() {
    if (!gameId) return;
    setLoading(true);
    const enabledIds = collectEnabledIds();
    await getSupabase()
      .from("games")
      .update({
        status: "playing",
        enabled_categories: enabledIds,
        point_threshold: pointThreshold,
      })
      .eq("id", gameId);
    router.push(`/host/${shortCode}/play`);
  }

  const minigames = allCategories.filter((c) => c.type === "minigame");
  const events = allCategories.filter((c) => c.type === "event");

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-emerald-600 tracking-wide uppercase">
            Game Settings
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {shortCode}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900">Minigames</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {minigames.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    {cat.subcategories && (
                      <button
                        onClick={() => toggleExpand(cat.id)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        {expanded[cat.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <div>
                      <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                      <p className="text-xs text-zinc-500">{cat.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled[cat.id] ?? false}
                    onCheckedChange={() => toggleCat(cat.id)}
                  />
                </div>

                {cat.subcategories && expanded[cat.id] && enabled[cat.id] && (
                  <div className="ml-8 mt-2 space-y-2 border-l-2 border-zinc-100 pl-4">
                    {cat.subcategories.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-700">{s.label}</span>
                        <Switch
                          checked={subEnabled[s.id] ?? false}
                          onCheckedChange={() => toggleSub(s.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">Events</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                  <p className="text-xs text-zinc-500">{cat.description}</p>
                </div>
                <Switch
                  checked={enabled[cat.id] ?? false}
                  onCheckedChange={() => toggleCat(cat.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">Win Condition</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-600 whitespace-nowrap">
                First to
              </label>
              <Input
                type="number"
                min={25}
                max={500}
                step={25}
                value={pointThreshold}
                onChange={(e) => setPointThreshold(Number(e.target.value) || 100)}
                className="w-24 text-center"
              />
              <span className="text-sm text-zinc-600">points wins</span>
            </div>
          </CardContent>
        </Card>

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
