# Barbalak-Ball — Master Architectural & Functional Specification

> **Version:** 4.0.0  
> **Status:** Canonical  
> **Stack:** Next.js (App Router) · Supabase (Realtime + Postgres) · Vercel  
> **Content Source:** All generated content lives in `content/*.json`. This document defines mechanics only.

---

## Table of Contents

1. [Global Game Mechanics](#1-global-game-mechanics)
2. [Minigame: Charades](#2-minigame-charades)
3. [Minigame: Trivia](#3-minigame-trivia)
4. [Minigame: Scategories](#4-minigame-scategories)
5. [Minigame: Fifty Fifty](#5-minigame-fifty-fifty)
6. [Event: World Event](#6-event-world-event)
7. [Non-Minigame Event: Fun Fact Interjection](#7-non-minigame-event-fun-fact-interjection)
8. [Asset Manifest](#8-asset-manifest)
9. [Content File Map](#9-content-file-map)

---

## 1. Global Game Mechanics

### 1.1 Player Architecture

| Role | Description |
|---|---|
| **Host** | Creates the game. After creation, picks a name and icon just like any joined player. Inserted into the `players` table with `is_host = true`. Participates in every minigame — can be randomly selected, scores points, etc. Has exclusive write-access to the Settings/Toggle page and host-only controls (advance buttons, etc.). |
| **Joined Players** | Scan QR / tap link to join. Full participants. Pick a name and icon. Can view settings and read rules but cannot modify toggles. |

- Every participant plays from their own phone. There are no "phoneless" players.
- **The host is a full player.** They pick a name and ball icon on the lobby page before other players join.

### 1.1.1 Player Icons (Ball Icons)

- Player icons are images stored in `public/balls/`. Source files: `content/images/balls/*.png`.
- On the join screen (and host lobby), each player selects an icon from the available set.
- The chosen icon filename is stored in `players.icon_id` (e.g. `"ball-1.png"`).
- Whenever a player is "up" (selected for a minigame), their ball icon is displayed alongside their name.

### 1.2 Settings / Toggle Page

- Accessible by all players. **Only the Main Player can modify toggles.**
- Joined players can tap any setting to read its rules and see its current on/off state.
- Configurable items: minigame toggles, trivia subcategory toggles, FFI toggle, Default Pool toggle, point threshold.

### 1.3 Winning Condition

- Game continues until any player reaches the **configurable point threshold** (default: **100 points**).
- When a player reaches the threshold the game ends immediately. A final scoreboard is displayed.

### 1.4 UI / HUD (All Screens)

- **Top-left:** Player's own name.
- **Top-right:** Player's current point total.
- **Between minigames:** Full scoreboard — all players sorted descending by points. Displayed for 4 seconds.

### 1.5 Branding & Lobby

| Element | Requirement |
|---|---|
| **Logo** | `public/logo.png` is the game logo. Used on the landing page and anywhere branding appears. Served as a Next.js `<Image>` component. Source file: `content/images/logo.png` → copied to `public/logo.png`. |
| **Join Link** | The lobby page does **not** display the raw URL. Instead it shows only a compact "Copy Link" button. The full URL is copied to clipboard on click. |
| **QR Code** | Encodes the **canonical public URL** for the join page (`/join/{shortCode}`). Uses the `NEXT_PUBLIC_APP_URL` env var when set (production), falls back to `window.location.origin` (dev). This avoids Vercel preview-deployment auth walls. |
| **App URL env var** | `NEXT_PUBLIC_APP_URL` — set in Vercel to the production domain (e.g. `https://barbalak-ball.vercel.app`). When absent, the app falls back to `window.location.origin`. |

### 1.6 Content Exhaustion

- Once a content item is used in a session, it is removed from the pool for the rest of the session.
- If an entire pool is exhausted, it resets. A brief "Pool refreshed" indicator appears.

### 1.7 Flow

- Minigames are selected **at random** from enabled minigames.
- Participant(s) for each minigame are selected **at random**.
- Transitions must be seamless. No loading screens, no dead air.

### 1.8 Content Quality Guidelines

All game content must follow these rules. They apply to trivia, charades, fifty-fifty, world events, fun facts, and scategories.

**What makes BAD content (never do this):**

| Pattern | Example | Why It's Bad |
|---|---|---|
| Ambiguous / debatable answers | "How many continents?" (5? 6? 7?) | Players will argue about correctness, kills momentum |
| Raw arithmetic | "What is 7 × 8?" | Not interesting, just math homework |
| Overused internet memes / clichés | "Powerhouse of the cell" | Everyone knows the meme; it's not a real question anymore |
| Questions so basic they're insulting | "What organ pumps blood?" | Nobody is learning anything or having fun |
| Multi-step / compound actions | "Person X does A, then person Y does B" | Too complex for a party game; one clear action per event |
| Forced-quirky / tryhard humor | "The frogs have become self-aware" | Sounds like a random-humor generator, not a real joke |
| Lazy internet-meme jokes | "Wyoming doesn't exist" jokes | Recycled Twitter humor, not original |
| Non-actions disguised as rewards | "You're safe, sit back" | Boring, no engagement, wastes a turn |
| Non-drinking physical challenges | "Do 10 push-ups or drink" | This is a drinking game, not CrossFit |
| Coercive social interactions | "Make someone compliment you" | Awkward, not fun |
| Impractical / unsafe actions | "Make a mystery shot from random bottles" | Liability, tastes awful, nobody will do it |

**What makes GOOD content (always do this):**

| Principle | Description |
|---|---|
| Single clear action | One instruction, one person (or "everyone"), immediately executable |
| Sharp humor | Dark, satirical, or absurd — but witty, not forced |
| Genuinely interesting trivia | Makes you think, teaches something, has ONE unambiguous correct answer |
| Appropriate difficulty | Easy = most adults know it; Medium = you might know it; Hard = you probably don't; Ruinous = almost nobody knows |
| Physically actable charades | Specific scenario a person can mime, funny to watch |
| Direct drinking consequences | Sips, shots, finishes — no point manipulation or future-state dependencies |
| Universally playable | No actions requiring specific props, locations, or equipment beyond drinks |

### 1.9 Transition Sequence (Every Minigame)

| Step | What Happens | Audio |
|---|---|---|
| 1. Announcement | Minigame name + selected player name(s) pop up on all screens. | `gong.mp4` |
| 2. Rules | Rules display on all joined players' screens. Persist until the selected player presses **"Begin"**. | — |
| 3. Countdown | Words appear one at a time on all screens: **"Ready?"** → **"Set?"** → **"BARBALAK!!!"** with extra left margin on "BARBALAK!!!" to prevent overlap when it scales up. | `ding.mp4` on each word |
| 4. Start | Minigame begins immediately. | — |

### 1.10 Floating Balls Background

- During every transition/intro screen, ball icons from `public/balls/` float across the background.
- Balls spawn at random positions outside the viewport edge and drift in a random direction.
- **Density range:** 3–10 balls visible at once (randomized per transition).
- **Speed range:** 15–45px/second (randomized per ball).
- **Direction:** Random angle per ball.
- If more than 20 balls exist on screen simultaneously, the oldest ones are removed.
- Multiple copies of the same ball image can appear.
- Each new transition randomizes density and speed range.

---

## 2. Minigame: Charades

### 2.1 Pool

- Players can input **custom phrases** on their phones before or during setup. These enter the session pool.
- The **Default Pool** (`content/charades.json`) is toggleable by the host. When on, defaults mix with customs.
- **No-repeat rule:** A phrase cannot be used more than once per game session (standard content exhaustion applies).

### 2.2 Gameplay

1. Random player selected. Their ball icon + name displayed.
2. Phrase shown **only** on that player's phone.
3. Player reads phrase, presses **"Begin"**.
5. **20-second countdown timer** appears on the main device (visible to all).
6. `tick.mp4` plays every second.
7. Group shouts guesses (honor system). Actor or host confirms via Yes/No prompt on actor's device.

### 2.3 Scoring

| Outcome | Points |
|---|---|
| Guessed correctly | Actor **+5** |
| Not guessed | Actor drinks |
| Guessed (everyone else) | Everyone else drinks |

### 2.6 Seed Defaults

> Squeezing out toothpaste at waist level · Shaking salt directly into mouth · Starting a lawnmower · The concept of time · BDSM sex · Gardening

---

## 3. Minigame: Trivia

### 3.1 Pool

- All trivia lives in a single unified pool (`content/trivia.json`).
- Questions span multiple knowledge domains (elementary, American culture, world culture, general academic) but are **not** split into subcategories at runtime.

### 3.2 Gameplay

- **One player is selected per trivia round.** Their ball icon + name displayed. The selected player answers the questions; everyone else watches.
- **Questions per round:** 1 question per trivia round.
- All questions are **multiple choice (4 options)**.
- **15-second timer** per question.
- Points at stake are displayed prominently before the question appears (based on difficulty).

### 3.3 Difficulty Distribution

| Difficulty | Probability | Points | Visual | Audio |
|---|---|---|---|---|
| Easy | 30% | +3 | Flash `happy.png` | — |
| Medium | 30% | +6 | Flash `medium.png` | — |
| Hard | 30% | +10 | Flash `hard.png` | — |
| Ruinous | 10% | +20 | `ruinous-trivia.gif` pops up, fades linearly over 2 seconds | `ruinous.mp3` plays in full |

### 3.4 Answer Presentation Constraint

- **CRITICAL:** When displaying a question, the order of the four answer options **must be randomized** on every player's screen independently. The stored `answer` index refers to the correct option in the JSON's original `options` array — the client must map this correctly after shuffling.
- This prevents pattern recognition (e.g., "the answer is always C").

---

## 4. Minigame: Scategories

### 4.1 Gameplay

1. Random player selected. Their ball icon + name displayed. Host starts the round.
2. A **Letter** and a **Category** are displayed on all screens.
3. The letter is chosen at random from the valid letter pool. The category is chosen at random from the category pool. **They are not pre-paired** — assignment is fully random at runtime.

**Phase 1 — Think (5 seconds):**
- All phones show a dramatic 5-second countdown.
- Player thinks of a word starting with the letter that fits the category.
- **No typing.** The player does NOT enter their answer. They think silently.

**Phase 2 — Defend (15 seconds):**
- All screens show **"Defend your answer!"** with a 15-second timer.
- Player verbally says and defends their word.
- All **other** players (not the hot-seat player) see a voting screen with thumbs up / thumbs down.
- Votes are recorded to the `votes` table in real-time.
- Round ends when **all voters have voted** OR the 15-second timer expires.
- Players who do not vote by timer expiry **default to thumbs-down** (reject).

### 4.2 Letter Pool

Valid letters (no hard letters): **A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, R, S, T, W**

Excluded: Q, U, V, X, Y, Z.

### 4.3 Voting

- All other players see a private voting screen with thumbs up / thumbs down buttons.
- Votes are tallied in real-time. UI shows how many have voted.
- **Tie goes to the player** (50%+ of votes must be thumbs-down to reject).
- Non-voters at timer expiry default to thumbs-down.

### 4.4 Scoring

| Outcome | Points |
|---|---|
| Accepted (majority Yes or tie) | **+5** |
| Rejected (majority No) | **-5** |

---

## 5. Minigame: Fifty Fifty

### 5.1 Sequence (Dramatic Reveal)

1. **Select Player** — random. Ball icon + name displayed.
2. **Reveal Type** — Slot-machine-style spinning animation rapidly cycles through "PENALTY" / "BONUS" text, then locks in the result. Fast (~1.5s).
3. **Reveal Rarity** — Same spinning animation, cycles through "Common" / "Rare" / "Legendary", then locks in. Fast (~1.5s).
4. **Reveal Action** — The action text is displayed.
   - **Legendary:** Screen flashes green, pulsing glow effect, shaking animation — full "legendary drop" reveal.
   - **Rare:** Subtle shimmer/glow effect.
   - **Common:** No special effect.

### 5.2 Refusal Penalties

| Rarity | Point Deduction |
|---|---|
| Common | -1 |
| Rare | -2 |
| Legendary | -15 |

Negative point totals are allowed.

### 5.3 Pool Constraints

- Legendary: **exactly 2 entries** per type (Penalty and Bonus). No more.
- Common and Rare: expandable.
- All actions must be **immediately doable** in a party setting. No actions that depend on other game systems or future game state.

### 5.4 Seed Defaults

**Penalties:**
- Common: 3 big sips · 2 big sips · Nip of the handle
- Rare: Finish your drink · Handle pull
- Legendary: Shooey (pour drink into shoe and drink it)

**Bonuses:**
- Common: Make someone else drink 2 · Make someone else drink 1
- Rare: Make everyone drink · Acquire 10 points
- Legendary: Take anyone's drink (regardless of cost or quality)

---

## 6. Event: World Event

### 6.1 Trigger

- **50% chance** to fire between any two minigames (evaluated after the inter-minigame scoreboard).

### 6.2 Visuals

1. **"WORLD EVENT"** flashes on all screens (large, bold, centered).
2. After **1.5 seconds**, event text fades in below.
3. Remains for 6 seconds or until host dismisses.
4. **No** "this affects everyone for the rest of the game" subtitle — world events are one-time actions.

### 6.3 Tone

- Most events should be satirical, dark, or drinking-related.
- A few events should be **completely random and nonsensical** — pure absurdity with no logic.

### 6.4 Seed Events

> 1. Blizzard alert! If you have blow or ket on you, take a big bump. You piece of shit. Fuck you.  
> 2. The color of silverware in China is changing rapidly. Everyone wearing black or white shoes take a big sip you basic fuck.  
> 3. Suicide bomber! The first one to finish their drink gets to make two other people do the same.  
> 4. Stink bomb! Anyone who hasn't showered today, choose one person to take a pull.

---

## 7. Non-Minigame Event: Fun Fact Interjection

### 7.1 Trigger

- Toggleable by host.
- Fires **deterministically every 3rd minigame** (i.e., after minigames 3, 6, 9, …). Uses `round_number % 3 === 0`.
- When a fun fact is scheduled, it takes priority over world events for that inter-round slot.
- World events can still fire on non-fun-fact rounds (50% chance as usual).

### 7.2 Pool

- All fun facts live in a single flat list (`content/fun-facts.json`) with no type categories.
- Each entry has an `id` and `text`. No type field.
- Facts are selected at random from the unused pool, subject to content exhaustion rules.

### 7.3 Visuals

1. **"Fun Fact"** header appears.
2. Fact text fades in below.
3. Displayed for 6 seconds or until dismissed.

### 7.4 Seeds

> Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tons.  
> You can fit every other planet in our solar system between the Earth and the Moon.  
> The inventor of the Pringles can is buried in one.

---

## 8. Point Shop

### 8.1 Access

- At any time during the game, **any player** can tap their point total (top-right HUD) to open a slide-up Point Shop menu.
- The shop is a personal overlay — it does not pause the game or affect other players' screens.

### 8.2 Purchase Mechanics

- Each item has a **point cost**. Spending is immediate — points are deducted the moment "Buy" is confirmed.
- **The purchased action does NOT happen immediately.** It is queued and **executes at the end of the next completed minigame**, right before the inter-round scoreboard.
- If multiple players have queued purchases, they resolve in the order they were bought (FIFO).
- Some items require selecting a target player at purchase time.
- A player can have multiple purchases queued simultaneously.
- If a player's score drops below 0 before a queued purchase resolves, the purchase still resolves (they just go further negative).

### 8.3 Item Pool

Items are defined in `content/shop-items.json`. See Content File Map.

### 8.4 Visual

- When a queued purchase resolves, a brief notification appears on all screens: **"[Player] used [Item Name] on [Target]!"** (or just the player name if no target).
- The notification persists for 3 seconds.

---

## 9. Asset Manifest

### 8.1 Audio (`content/audio/`)

| File | Trigger | Description |
|---|---|---|
| `gong.mp4` | Transition step 1 | Minigame announcement gong |
| `ding.mp4` | Transition step 3 | Chime for each word in "Ready? Set? Barbalak!!!" |
| `tick.mp4` | Charades | Ticking clock, once per second |
| `ruinous.mp3` | Trivia — Ruinous | Dramatic sting |
| `buzzer.mp3` | Scategories | Plays on voter's device on thumbs-down |

### 8.2 Images (`content/images/`)

| File | Trigger |
|---|---|
| `happy.png` | Trivia — Easy |
| `medium.png` | Trivia — Medium |
| `hard.png` | Trivia — Hard |
| `yes.png` | Scategories — thumbs up |
| `no.png` | Scategories — thumbs down |

### 8.3 Video / GIF (`content/videos/`)

| File | Trigger | Behavior |
|---|---|---|
| `ruinous-trivia.gif` | Trivia — Ruinous | Pops up, fades linearly over 2 seconds |

---

## 10. Content File Map

All generated content lives in `content/`. The requirements doc references mechanics; the JSON files hold data.

| File | Contents |
|---|---|
| `content/charades.json` | Default charades phrases (all normal difficulty, no tiers) |
| `content/trivia.json` | Unified trivia pool across all knowledge domains |
| `content/scategories.json` | Category pool — simple, board-game-style categories (letters assigned randomly at runtime) |
| `content/fifty-fifty.json` | Penalty & bonus pools by rarity |
| `content/world-events.json` | World event text pool |
| `content/fun-facts.json` | Fun facts — flat list, no type categories |
| `content/shop-items.json` | Point Shop purchasable items |
| `content/categories.json` | Master registry of all minigames |

---

*End of specification. Generated content lives in `content/`, not here.*
