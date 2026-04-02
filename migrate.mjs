import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sql = `
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS point_threshold integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS enabled_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_round jsonb,
  ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ffi_count integer NOT NULL DEFAULT 0;
`;

async function tryMethods() {
  // Method 1: Supabase SQL API (newer)
  console.log("--- Method 1: /pg/query ---");
  try {
    const resp = await fetch(`${url}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify({ query: sql }),
    });
    console.log(`  Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`  Body: ${text.slice(0, 300)}`);
    if (resp.ok) return true;
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // Method 2: RPC (create function first)
  console.log("\n--- Method 2: /rest/v1/rpc ---");
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify({ sql_text: sql }),
    });
    console.log(`  Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`  Body: ${text.slice(0, 200)}`);
    if (resp.ok) return true;
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // Method 3: Supabase management API
  console.log("\n--- Method 3: Management API ---");
  const ref = url.replace("https://", "").split(".")[0];
  try {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    console.log(`  Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`  Body: ${text.slice(0, 200)}`);
    if (resp.ok) return true;
  } catch (e) { console.log(`  Error: ${e.message}`); }

  return false;
}

const ok = await tryMethods();
if (!ok) {
  console.log("\n=================================================");
  console.log("NONE of the methods worked with the anon key.");
  console.log("You need to run this SQL in the Supabase SQL Editor:");
  console.log("=================================================");
  console.log(sql);
}
