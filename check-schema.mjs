import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

async function checkTable(name, cols) {
  console.log(`\n--- ${name} ---`);
  const { data, error, status } = await sb.from(name).select("*").limit(1);
  if (error) {
    console.log(`  ERROR ${status}: ${error.message}`);
    return;
  }
  if (data.length > 0) {
    console.log(`  Columns: ${Object.keys(data[0]).join(", ")}`);
  } else {
    console.log(`  Table exists, 0 rows. Checking columns...`);
    for (const c of cols) {
      const r = await sb.from(name).select(c).limit(1);
      console.log(`  ${c}: ${r.error ? "MISSING" : "OK"}`);
    }
  }
}

await checkTable("games", ["id","short_code","status","point_threshold","enabled_categories","current_round","round_number","ffi_count","created_at"]);
await checkTable("players", ["id","game_id","name","icon_id","is_host","score","created_at"]);
await checkTable("purchases", ["id","game_id","buyer_id","target_id","item_id","cost","status","created_at"]);
await checkTable("answers", ["id","game_id","player_id","question_id","selected_option","is_correct","answered_at"]);
await checkTable("votes", ["id","game_id","voter_id","round_id","vote","created_at"]);
await checkTable("used_content", ["id","game_id","content_type","content_id"]);
