# CLAUDE.md — Obsidian Schedule Plugin

Obsidian plugin: fetches Google Calendar events, inserts as markdown tables. Works desktop + mobile.

## Build

```bash
npm install
npm run dev    # watch mode → main.js
npm run build  # production (tsc + esbuild)
```

Symlink repo into vault's `.obsidian/plugins/obsidian-schedule-plugin/` for testing.

## Source Files

| File | Role |
|---|---|
| `src/main.ts` | Plugin lifecycle, 3 commands (insert/refresh/connect), URI handler, auto-insert on file-open |
| `src/settings.ts` | PluginSettingTab — OAuth credentials, calendar picker, display/behavior settings |
| `src/google-auth.ts` | `GoogleAuth` class — startAuth, handleCallback, getAccessToken (auto-refresh), disconnect |
| `src/google-calendar.ts` | `listCalendars(token)`, `fetchEvents(token, calId, date)` via `requestUrl` |
| `src/schedule-parser.ts` | `findPlaceholders`, `findScheduleBlocks`, `parseDateFromFilename`, `resolveDate` |
| `src/table-builder.ts` | `buildScheduleTable(events, date, settings)` → markdown string |
| `src/editor-extension.ts` | CM6 StateField — hides `%%schedule-start%%` markers in editor |
| `src/types.ts` | `SchedulePluginSettings`, `CalendarEvent`, `CalendarInfo`, `Placeholder`, `ScheduleBlock` |
| `docs/callback.html` | Static OAuth redirect page (hosted on GitHub Pages) |

## Key Patterns

- **All HTTP**: Use `requestUrl` from `'obsidian'`. Never `fetch`.
- **OAuth redirect**: Goes through hosted `docs/callback.html` → `obsidian://google-calendar-schedule-auth`. Redirect URI is a user setting (not hardcoded).
- **Placeholders**: `[schedule]`, `[today's schedule]`, `[tomorrow's schedule]`, `[YYYY-MM-DD schedule]`. Keyword configurable. Case-insensitive.
- **Table markers**: `%%schedule-start YYYY-MM-DD%%` precedes the table. No end marker — refresh scans forward through `|` rows to find table boundary.
- **Editor extension**: CM6 `StateField` replaces marker lines (+ trailing blank line) with invisible widget. Must use StateField not ViewPlugin (cross-line replacement).
- **Auto-insert**: On `file-open`, if file created <10s ago and contains placeholder, auto-runs insert.
- **Reverse processing**: Placeholders/blocks processed in reverse index order to preserve offsets during replacement.

## Settings (defaults)

```
clientId: '', clientSecret: '', redirectUri: '',
accessToken: '', refreshToken: '', tokenExpiresAt: 0,
selectedCalendarIds: [], includeAllDayEvents: true,
placeholderKeyword: 'schedule', timeFormat: '12h',
dateFormatInFilename: 'YYYY-MM-DD', autoInsertOnDailyNote: false
```

## Constraints

- Must work on Obsidian mobile — no Node.js APIs, no `fs`
- No runtime dependencies (only devDependencies for build)
- `minAppVersion`: 1.4.0, plugin ID: `obsidian-schedule-plugin`
