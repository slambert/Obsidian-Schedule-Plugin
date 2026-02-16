# CLAUDE.md — Obsidian Schedule Plugin

## What This Is

An Obsidian plugin that fetches Google Calendar events and inserts them as markdown tables into notes. See PLAN.md for the full design.

## Build & Development

```bash
npm install
npm run dev    # watches for changes, outputs to main.js
npm run build  # production build
```

Standard Obsidian plugin tooling: TypeScript compiled via esbuild. Output is `main.js`, `manifest.json`, and `styles.css` in the repo root.

For local development, symlink or copy the repo into an Obsidian vault's `.obsidian/plugins/obsidian-schedule-plugin/` directory.

## Architecture

### File Responsibilities

- **src/main.ts** — Plugin lifecycle (`onload`/`onunload`), registers commands ("Insert Schedule", "Refresh Schedule", "Connect Google Calendar"), registers the URI handler for OAuth callback (`obsidian://google-calendar-schedule-auth`), listens to `file-open` events for auto-insert feature. Coordinates between modules — this is the glue.

- **src/settings.ts** — `PluginSettingTab` subclass. Renders settings UI. After OAuth is connected, fetches calendar list and renders checkboxes. Stores settings via `this.plugin.saveData()`. Settings interface defined here.

- **src/google-auth.ts** — Handles the full OAuth 2.0 flow:
  - `startAuth()` — builds Google OAuth URL with calendar.readonly scope, opens in browser
  - `handleCallback(params)` — called by URI handler, exchanges auth code for tokens
  - `getAccessToken()` — returns valid access token, auto-refreshes if expired
  - `disconnect()` — clears stored tokens
  - Stores tokens in plugin data: `{ accessToken, refreshToken, expiresAt }`

- **src/google-calendar.ts** — API calls using `requestUrl` (Obsidian's cross-platform HTTP):
  - `listCalendars(accessToken)` — GET `https://www.googleapis.com/calendar/v3/users/me/calendarList`
  - `fetchEvents(accessToken, calendarId, date)` — GET `https://www.googleapis.com/calendar/v3/calendars/{id}/events` with `timeMin`, `timeMax`, `singleEvents=true`, `orderBy=startTime`
  - Returns normalized event objects: `{ title, startTime, endTime, isAllDay }`

- **src/schedule-parser.ts** — Text processing:
  - `findPlaceholders(content, keyword)` — regex to find `[today's schedule]`, `[tomorrow's schedule]`, `[YYYY-MM-DD schedule]` patterns (case-insensitive). Returns array of `{ match, fullMatch, dateType, explicitDate, startIndex, endIndex }`.
  - `findScheduleBlocks(content)` — regex to find `%%schedule-start DATE%%...%%schedule-end%%` blocks for refresh.
  - `parseDateFromFilename(filename, format)` — extracts date from note filename.
  - `resolveDate(placeholder, filenameDate)` — converts "today's", "tomorrow's", or explicit date string to a Date object relative to the filename date.

- **src/table-builder.ts** — Pure function: takes array of events + settings, returns markdown string:
  - Header row: `| Time | Event |`
  - All-day events first (if setting enabled), bolded
  - Timed events sorted chronologically
  - Time formatted per setting (12h/24h)
  - Wraps in `%%schedule-start DATE%%` / `%%schedule-end%%` comment markers
  - Empty state: single row "No events scheduled"

- **src/types.ts** — Shared interfaces:
  - `SchedulePluginSettings` — all settings fields
  - `CalendarEvent` — normalized event from Google API
  - `CalendarInfo` — id, name, color for calendar list
  - `Placeholder` — parsed placeholder info
  - `ScheduleBlock` — parsed schedule block for refresh

### Key Implementation Details

**Use `requestUrl` from Obsidian API** for all HTTP requests. Do NOT use `fetch` or `XMLHttpRequest` — `requestUrl` works on both desktop and mobile and avoids CORS issues.

**URI handler for OAuth callback:** Register with `this.registerObsidianProtocolHandler('google-calendar-schedule-auth', callback)` in `main.ts`. The callback receives URL parameters including the auth code.

**Placeholder regex pattern:** For a keyword like "schedule", match:
```
\[(today'?s?\s+schedule|tomorrow'?s?\s+schedule|\d{4}-\d{2}-\d{2}\s+schedule)\]
```
Case-insensitive flag. Must NOT match already-inserted tables (those use `%%` markers).

**Auto-insert detection:** On `file-open`, check `file.stat.ctime` against `Date.now()`. If within 10 seconds and file contains a placeholder, run insert. This avoids re-triggering on every file open. Only runs if the auto-insert setting is enabled.

**Error handling:** 
- Network failures: show `Notice` with error message, leave placeholder/table unchanged
- Auth expired: show `Notice` prompting to reconnect, don't silently fail
- No calendars selected: show `Notice` reminding user to select calendars in settings

**Settings defaults:**
```typescript
const DEFAULT_SETTINGS: SchedulePluginSettings = {
  clientId: '',
  clientSecret: '',
  accessToken: '',
  refreshToken: '',
  tokenExpiresAt: 0,
  selectedCalendarIds: [],
  includeAllDayEvents: true,
  placeholderKeyword: 'schedule',
  timeFormat: '12h',
  dateFormatInFilename: 'YYYY-MM-DD',
  autoInsertOnDailyNote: false,
};
```

## Testing Approach

- Test `schedule-parser.ts` and `table-builder.ts` as pure functions with unit tests
- Test OAuth flow manually on both desktop and mobile
- Test with notes containing: single placeholder, multiple placeholders, no placeholders, already-inserted tables, mixed placeholders and tables

## Important Constraints

- Must work on Obsidian mobile (iOS and Android) — no Node.js APIs, no `fs`, no shell commands
- All HTTP via `requestUrl` from the Obsidian API
- No external dependencies beyond what's needed for build tooling (esbuild, typescript)
- Minimum Obsidian API version: 1.4.0
- Plugin ID: `obsidian-schedule-plugin`
