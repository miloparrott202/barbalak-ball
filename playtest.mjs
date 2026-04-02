import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const THRESHOLD = 25;
const bugs = [];
let bugN = 0;
function bug(sev, desc, exp, act) {
  bugN++;
  bugs.push({ n: bugN, sev, desc, exp, act });
  console.log(`\n*** BUG #${bugN} [${sev}] ${desc}\n    exp: ${exp}\n    act: ${act}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function body(page) {
  return page.evaluate(() => document.body?.innerText ?? "");
}

async function clickBtn(page, text, timeout = 8000) {
  try {
    const loc = page.locator("button", { hasText: text }).first();
    await loc.waitFor({ state: "visible", timeout });
    if (await loc.isEnabled({ timeout: 2000 })) {
      await loc.click();
      return true;
    }
  } catch { /* */ }
  return false;
}

async function waitUrl(page, part, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (page.url().includes(part)) return true;
    await sleep(500);
  }
  return false;
}

async function playGame(num) {
  console.log(`\n${"=".repeat(50)}\nGAME ${num}\n${"=".repeat(50)}`);
  const browser = await chromium.launch({ headless: true });
  const host = await (await browser.newContext()).newPage();
  const player = await (await browser.newContext()).newPage();
  const errors = [];
  host.on("pageerror", (e) => errors.push(`host: ${e.message}`));
  player.on("pageerror", (e) => errors.push(`player: ${e.message}`));

  try {
    // 1. Create game
    console.log("\n[1] Create game");
    await host.goto(BASE, { waitUntil: "load", timeout: 20000 });
    await sleep(3000);
    if (!(await clickBtn(host, "Host Barbalak-Ball"))) { bug("block", "Can't click Host", "clickable", "nope"); return; }
    if (!(await waitUrl(host, "/host/"))) { bug("block", "No lobby redirect", "/host/XXX", host.url()); return; }
    const sc = host.url().match(/\/host\/([A-Z0-9]+)/)?.[1];
    console.log(`  code=${sc}`);

    // 2. Player joins
    console.log("\n[2] Player joins");
    await player.goto(`${BASE}/join/${sc}`, { waitUntil: "load", timeout: 20000 });
    await sleep(3000);
    await player.fill("input#player-name", "P1");
    await sleep(500);
    await clickBtn(player, "Join Game");
    await sleep(3000);

    // 3. Lobby → Settings
    console.log("\n[3] Lobby → Settings");
    await sleep(5000);
    for (let i = 0; i < 20; i++) {
      if ((await body(host)).includes("P1")) break;
      await sleep(1000);
    }
    try {
      await host.waitForFunction(() => {
        const b = [...document.querySelectorAll("button")].find(el => el.textContent.includes("All Players Joined"));
        return b && !b.disabled;
      }, { timeout: 15000 });
    } catch {
      bug("block", "All Players Joined never enabled", "enabled", "disabled");
      return;
    }
    await clickBtn(host, "All Players Joined");
    if (!(await waitUrl(host, "/settings"))) { bug("block", "No settings redirect", "/settings", host.url()); return; }
    console.log("  ✓ settings");

    // 4. Settings → Play
    console.log("\n[4] Settings → Play");
    await sleep(2000);
    try { await host.fill('input[type="number"]', String(THRESHOLD)); } catch {}
    await sleep(1000);
    await clickBtn(host, "Begin Barbalak-Ball");
    if (!(await waitUrl(host, "/play", 20000))) {
      bug("block", "Navigation to /play failed", "/play", host.url());
      return;
    }
    console.log("  ✓ play page");
    await sleep(3000);

    // 5. Game loop
    console.log("\n[5] Game loop");
    let round = 0;
    let stuck = 0;

    while (round < 60) {
      round++;
      let t = await body(host);

      // Game over check
      if (t.includes("Game Over") || t.includes("wins!")) {
        console.log(`\n  ✓✓✓ GAME OVER round ${round} ✓✓✓`);
        break;
      }

      // SCOREBOARD
      if (t.includes("Next Round") && !t.includes("Up Next")) {
        console.log(`\n  [R${round}] scoreboard`);
        if (!(await clickBtn(host, "Next Round"))) {
          await sleep(3000);
          await clickBtn(host, "Next Round", 15000);
        }
        await sleep(3000);
        t = await body(host);
      }

      // EVENTS (fun fact / world event)
      if (t.includes("Fun Fact") && t.includes("\u201c")) {
        console.log(`  [R${round}] fun fact`);
        await clickBtn(host, "Continue");
        await sleep(2500);
        t = await body(host);
      }
      if (t.includes("WORLD EVENT")) {
        console.log(`  [R${round}] world event`);
        await clickBtn(host, "Continue");
        await sleep(2500);
        t = await body(host);
      }

      // TRANSITION (auto-advances after ~3.8s)
      if (t.includes("Up Next") || t.includes("Ready?") || t.includes("BARBALAK")) {
        console.log(`  [R${round}] transition`);
        await sleep(5000);
        t = await body(host);
      }

      // CHARADES
      if (t.includes("is acting")) {
        console.log(`  [R${round}] CHARADES`);
        // staging → Start Timer
        await clickBtn(host, "Start Timer", 5000);
        await sleep(1000);
        // active → They Got It!
        await clickBtn(host, "They Got It", 5000);
        await sleep(2000);
        // result → Continue (outer button)
        await clickBtn(host, "Continue", 8000);
        await sleep(2000);
        stuck = 0;
        continue;
      }

      // TRIVIA
      if (t.includes("Trivia") && (t.includes("question") || t.includes("Start Trivia"))) {
        console.log(`  [R${round}] TRIVIA`);
        // staging → Start Trivia
        await clickBtn(host, "Start Trivia", 5000);
        await sleep(2000);

        for (let q = 0; q < 12; q++) {
          t = await body(host);
          if (t.includes("Trivia Complete")) break;

          // Player answers
          try {
            const pt = await body(player);
            if (pt.includes("?")) {
              const btns = await player.locator("button").all();
              for (const b of btns) {
                const txt = (await b.textContent()).trim();
                if (txt.length > 2 && txt.length < 80 && !txt.includes("★") && !txt.includes("pts")) {
                  if (await b.isVisible() && await b.isEnabled()) {
                    await b.click();
                    break;
                  }
                }
              }
            }
          } catch {}

          await sleep(1000);
          // Host advances
          (await clickBtn(host, "Next Question", 2000)) ||
          (await clickBtn(host, "See Results", 2000));
          await sleep(1500);
        }
        await sleep(2000);
        await clickBtn(host, "Continue", 10000);
        await sleep(2000);
        stuck = 0;
        continue;
      }

      // SCATEGORIES
      if (t.includes("hot seat")) {
        console.log(`  [R${round}] SCATEGORIES`);
        // staging → Start Timer
        await clickBtn(host, "Start Timer", 5000);
        await sleep(2000);

        // Player types answer
        try {
          const pInput = player.locator('input[placeholder*="starting with"]').first();
          await pInput.waitFor({ state: "visible", timeout: 5000 });
          await pInput.fill("Apple");
          await clickBtn(player, "Lock In Answer", 3000);
          console.log("    player answered");
        } catch {
          console.log("    (player not hot seat or no input)");
        }

        await sleep(3000);
        // Host: Move to Judging
        await clickBtn(host, "Move to Judging", 10000);
        await sleep(2000);

        // Host: Accept or Reject
        await clickBtn(host, "Accept", 5000);
        await sleep(2000);

        // Continue (outer)
        await clickBtn(host, "Continue", 8000);
        await sleep(2000);
        stuck = 0;
        continue;
      }

      // FIFTY-FIFTY
      if (t.includes("face fate") || t.includes("50 / 50")) {
        console.log(`  [R${round}] FIFTY-FIFTY`);
        // staging → Flip the Coin
        await clickBtn(host, "Flip the Coin", 5000);
        await sleep(2000);
        // active → Reveal
        await clickBtn(host, "Reveal", 5000);
        await sleep(3000);
        // result → Continue (outer)
        await clickBtn(host, "Continue", 8000);
        await sleep(2000);
        stuck = 0;
        continue;
      }

      // UNKNOWN STATE
      stuck++;
      console.log(`  [R${round}] ??? stuck=${stuck}: "${t.slice(0, 80).replace(/\n/g, " ")}"`);
      if (stuck > 8) {
        bug("major", `Game stuck ${stuck}x`, "progresses", t.slice(0, 200));
        break;
      }
      await sleep(3000);
      (await clickBtn(host, "Continue", 2000)) || (await clickBtn(host, "Next Round", 2000));
      await sleep(2000);
    }

    if (round >= 60) bug("major", "Game didn't finish in 60 rounds", "finish < 60", "60+");
    for (const e of errors) {
      if (!e.includes("logo.png") && !e.includes("400") && !e.includes("Failed to load resource")) {
        bug("minor", `JS: ${e.slice(0, 150)}`, "no errors", e.slice(0, 150));
      }
    }

  } catch (err) {
    bug("block", `Crash game ${num}`, "no crash", err.message.slice(0, 300));
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Barbalak-Ball Playtest\n");
  for (let g = 1; g <= 3; g++) {
    await playGame(g);
    console.log(`\n--- Game ${g} done. Bugs: ${bugs.length} ---`);
  }
  console.log(`\n${"=".repeat(50)}\nSUMMARY: ${bugs.length} bugs\n${"=".repeat(50)}`);
  for (const b of bugs) console.log(`#${b.n} [${b.sev}] ${b.desc}\n  exp: ${b.exp}\n  act: ${b.act}\n`);
  console.log("--- DONE ---");
}
main().catch(console.error);
