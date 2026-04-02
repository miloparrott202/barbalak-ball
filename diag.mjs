import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on("console", (msg) => console.log(`  [console ${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`  [page error] ${err.message}`));
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      console.log(`  [HTTP ${resp.status()}] ${resp.url().slice(0, 120)}`);
    }
  });

  // 1. Landing
  console.log("--- Landing ---");
  await page.goto(BASE, { waitUntil: "load", timeout: 20000 });
  await sleep(3000);
  console.log(`  URL: ${page.url()}`);
  console.log(`  body: ${(await page.textContent("body")).slice(0, 100)}`);

  // Click Host
  await page.locator("button", { hasText: "Host Barbalak-Ball" }).first().click();
  console.log("  Clicked Host button");
  await sleep(5000);
  console.log(`  URL: ${page.url()}`);

  const sc = page.url().match(/\/host\/([A-Z0-9]+)/)?.[1];
  if (!sc) { console.log("FAIL: no shortcode"); await browser.close(); return; }

  // 2. Join a player in a separate context
  console.log("\n--- Player join ---");
  const playerPage = await (await browser.newContext()).newPage();
  await playerPage.goto(`${BASE}/join/${sc}`, { waitUntil: "load", timeout: 20000 });
  await sleep(3000);
  await playerPage.fill('input#player-name', 'P1');
  await playerPage.locator("button", { hasText: "Join Game" }).first().click();
  await sleep(3000);
  console.log(`  Player joined: ${(await playerPage.textContent("body")).slice(0, 60)}`);

  // 3. Proceed from lobby
  console.log("\n--- Lobby → Settings ---");
  await sleep(5000);
  console.log(`  Lobby body: ${(await page.textContent("body")).slice(0, 100)}`);

  // Wait for the button to be enabled
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find(el => el.textContent.includes("All Players Joined"));
    return b && !b.disabled;
  }, { timeout: 15000 });

  await page.locator("button", { hasText: "All Players Joined" }).first().click();
  console.log("  Clicked All Players Joined");
  await sleep(5000);
  console.log(`  URL: ${page.url()}`);

  // 4. Settings → Play
  console.log("\n--- Settings → Play ---");
  await sleep(2000);
  console.log(`  Settings body: ${(await page.textContent("body")).slice(0, 150)}`);

  // Fill threshold
  try {
    await page.fill('input[type="number"]', '25');
    console.log("  Threshold set to 25");
  } catch (e) {
    console.log(`  Threshold fill failed: ${e.message.slice(0, 100)}`);
  }

  await sleep(1000);

  // Before clicking, add request interception
  page.on("request", (req) => {
    if (req.url().includes("supabase") && req.method() === "PATCH") {
      console.log(`  [REQUEST PATCH] ${req.url().slice(0, 100)}`);
      console.log(`  [REQUEST BODY] ${req.postData()?.slice(0, 200)}`);
    }
  });
  page.on("response", async (resp) => {
    if (resp.url().includes("supabase") && resp.request().method() === "PATCH") {
      console.log(`  [RESPONSE ${resp.status()}] ${resp.url().slice(0, 100)}`);
      try {
        const body = await resp.text();
        console.log(`  [RESPONSE BODY] ${body.slice(0, 200)}`);
      } catch {}
    }
  });

  console.log("  About to click Begin...");
  await page.locator("button", { hasText: "Begin Barbalak-Ball" }).first().click();
  console.log("  Clicked Begin Barbalak-Ball!");

  // Wait and check
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    console.log(`  [${i*2}s] URL: ${page.url()}`);
    if (page.url().includes("/play")) {
      console.log("  ✓ Successfully navigated to /play!");
      break;
    }
  }

  console.log(`\n  Final URL: ${page.url()}`);
  console.log(`  Final body: ${(await page.textContent("body")).slice(0, 200)}`);

  await browser.close();
  console.log("\n--- DONE ---");
}

main().catch(console.error);
