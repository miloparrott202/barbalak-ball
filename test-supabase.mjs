import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("URL:", url);
console.log("Key:", key?.slice(0, 20) + "...");

const sb = createClient(url, key);

async function test() {
  console.log("\n--- Test 1: select * from games limit 1 ---");
  const r1 = await sb.from("games").select("*").limit(1);
  console.log("status:", r1.status, "error:", r1.error?.message);
  if (r1.data?.[0]) {
    console.log("columns:", Object.keys(r1.data[0]).join(", "));
  }

  console.log("\n--- Test 2: select id only ---");
  const r2 = await sb.from("games").select("id").limit(1);
  console.log("status:", r2.status, "error:", r2.error?.message);

  console.log("\n--- Test 3: select id, point_threshold ---");
  const r3 = await sb.from("games").select("id, point_threshold").limit(1);
  console.log("status:", r3.status, "error:", r3.error?.message);
  if (r3.data?.[0]) console.log("data:", r3.data[0]);

  console.log("\n--- Test 4: select id, enabled_categories ---");
  const r4 = await sb.from("games").select("id, enabled_categories").limit(1);
  console.log("status:", r4.status, "error:", r4.error?.message);

  console.log("\n--- Test 5: list columns via information_schema ---");
  const r5 = await sb.rpc("", {}).then(() => null).catch(() => null);
  // Try raw SQL via rpc
  console.log("(cannot query info_schema via Supabase client)");
}
test().catch(console.error);
