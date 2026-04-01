# Content Folder

Everything in this folder is **game content** — the stuff players see, hear, and interact with. Edit these files to change what appears in the game without touching any code.

## Files

| File | What it controls |
|---|---|
| `trivia.json` | Trivia questions, answer options, correct answer index, and difficulty |
| `charades.json` | Charades prompts and difficulty |
| `categories.json` | Which game categories exist, their labels, and which data file they reference |
| `icons.json` | Player icon options — id, display label, and image file path |

## Asset Folders

| Folder | What goes here |
|---|---|
| `icons/` | Player icon images (PNG recommended, square, at least 128×128) |
| `images/` | General images used in questions, cards, or the UI |
| `audio/` | Sound effects or music clips |
| `videos/` | Video clips for video-based rounds |

## How to edit

- **Add a trivia question:** Open `trivia.json`, copy an existing entry, change the fields, and give it a unique `id`.
- **Add a charades prompt:** Open `charades.json`, add a new object with `id`, `prompt`, and `difficulty`.
- **Add a new category:** Add an entry to `categories.json` with a new `dataFile`, then create that JSON file in this folder.
- **Change player icons:** Replace images in `icons/` and update `icons.json` to match.

## Rules

- `answer` in trivia is a **0-based index** into the `options` array.
- `difficulty` must be one of: `"easy"`, `"medium"`, `"hard"`.
- Every entry needs a unique `id` string.
