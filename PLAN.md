# Obsidian Schedule Plugin — PLAN.md

## What It Does

Fetches Google Calendar events and inserts them as markdown tables into Obsidian notes. User writes a placeholder like `[schedule]` or `[today's schedule]`, runs a command, and the placeholder is replaced with a formatted events table.

## Placeholders

Case-insensitive, keyword configurable (default: "schedule"):

- `[schedule]` — date from note filename
- `[today's schedule]` — date from note filename (or today if no date found)
- `[tomorrow's schedule]` — day after filename date (or tomorrow)
- `[2026-02-16 schedule]` — explicit date

## Table Output

```markdown
%%schedule-start 2026-02-16%%

| Time | Event |
| --: | :-- |
| **All Day** | **Conference** |
| 9:00 AM - 9:30 AM | Standup |
| 1:30 PM - 2:30 PM | Client Call |
```

- `%%schedule-start DATE%%` marker hidden in editor via CM6 StateField
- No end marker — refresh detects table end by scanning for `|` rows
- All-day events first (bolded), timed events sorted chronologically
- Empty state: "No events scheduled"

## Commands

1. **Insert schedule** — Replace placeholders with event tables
2. **Refresh schedule** — Re-fetch and update existing tables
3. **Connect Google Calendar** — Open OAuth consent screen

## Auto-Insert

On `file-open` event, if enabled and file created <10s ago and contains a placeholder → auto-runs insert.

## Phase 2 Plans
### 2.1 Refresh on File Open
- On file open, check for existing schedule tables
- If tables exist, auto-refresh them with latest events

#### Plan

**Goal**: When a file is opened that already contains `%%schedule-start%%` blocks, auto-refresh them with latest calendar data.

**Approach**: Extend the existing `file-open` handler in `main.ts` (line 55). Currently it only auto-inserts on new files (<10s old). Add a second path: if the file has schedule blocks (regardless of age), refresh them.

**New setting**: `autoRefreshOnFileOpen: boolean` (default `false`) in `types.ts` — user opt-in to avoid unexpected API calls.

**Changes**:

1. **`src/types.ts`** — Add `autoRefreshOnFileOpen: boolean` to `SchedulePluginSettings` and `DEFAULT_SETTINGS` (default `false`).

2. **`src/main.ts`** — Refactor the `file-open` handler (lines 55-63):
   - Keep existing auto-insert logic (new file + has placeholders).
   - Add: if `autoRefreshOnFileOpen` is enabled, file has schedule blocks (`findScheduleBlocks`), and user is authenticated with calendars selected → call `refreshSchedule()`.
   - Guard against double-processing: if auto-insert ran, skip auto-refresh.
   - Read content via `this.app.vault.read(file)` (not editor, since view may not be ready yet). Use `findScheduleBlocks()` to check for existing tables before calling `refreshSchedule()`.

3. **`src/settings.ts`** — Add toggle for "Auto-refresh schedules on file open" under the behavior section.

**Edge cases**:
- No-op if not authenticated or no calendars selected (silent, no notice).
- No-op if file has no schedule blocks.
- Avoid refresh storm: the `file-open` event fires once per file open, so no debounce needed.

#### Delegated tasks:
| Task | SubAgent Model | Status |
| -- | -- | -- |
| Add `autoRefreshOnFileOpen` to types.ts | haiku | pending |
| Update file-open handler in main.ts | sonnet | pending |
| Add settings toggle in settings.ts | haiku | pending |

### 2.2 Refresh Button
- Add a button/icon to the table that runs the "Refresh schedule" command on existing tables

#### Plan

**Goal**: Show a clickable refresh button near each schedule table so users can manually re-fetch without running a command.

**Approach**: Use the existing CM6 `StateField` in `editor-extension.ts` to render a refresh button widget alongside (or replacing) the hidden marker line. This keeps everything in Live Preview and requires no post-processing of markdown.

**Design decision — button placement**: Render a small refresh icon (↻) as an inline widget at the start of the `%%schedule-start%%` marker line. In Live Preview, the marker is already hidden by the `ScheduleMarkerWidget`; we replace it with a widget that shows a clickable refresh icon instead of being invisible.

**Changes**:

1. **`src/editor-extension.ts`** — Modify `ScheduleMarkerWidget`:
   - Change `toDOM()` to render a clickable refresh icon button (↻ character or SVG icon from Obsidian's `lucide` icons).
   - The button needs access to the plugin to call `refreshSchedule()`. Pass the plugin instance to the `StateField` via a `Facet` or via `EditorView` compartment. Simplest approach: use an `EditorView.updateListener` facet that the plugin provides, or store plugin ref on the view via a facet.
   - **Preferred pattern**: Define a `Facet<SchedulePlugin>` in `editor-extension.ts`. The plugin provides its instance via `pluginFacet.of(this)` when registering the extension. The widget reads it from `view.state.facet(pluginFacet)`.
   - On click: call `plugin.refreshSchedule()`.

2. **`src/main.ts`** — Update `registerEditorExtension` call (line 53):
   - Change from `scheduleMarkerField` to `[pluginFacet.of(this), scheduleMarkerField]` so the field can access the plugin.
   - Make `refreshSchedule()` public (it already is).

3. **`styles.css`** (create if not exists) — Style the refresh button:
   - Small, unobtrusive, positioned at the left margin above the table.
   - Hover effect for discoverability.
   - `.schedule-refresh-btn { cursor: pointer; opacity: 0.5; font-size: 14px; }`
   - `.schedule-refresh-btn:hover { opacity: 1; }`

**Edge cases**:
- Button only appears in Live Preview (editing mode), not Reading mode — this is inherent to CM6 decorations.
- Multiple schedule blocks → each gets its own button.
- While refreshing, could briefly disable button / show spinner, but keep v1 simple.

#### Delegated tasks:
| Task | SubAgent Model | Status |
| -- | -- | -- |
| Add `Facet` for plugin ref + update widget in editor-extension.ts | sonnet | pending |
| Update registerEditorExtension in main.ts | haiku | pending |
| Create styles.css with refresh button styles | haiku | pending |

## Future Features

- Event filtering (exclude by pattern)
- Additional table columns (location, description, calendar name)
- Multi-day / date range for weekly notes
- CalDAV support for non-Google calendars
