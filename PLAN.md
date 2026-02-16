# Obsidian Schedule Plugin — PLAN.md

## Overview

An Obsidian plugin that fetches events from Google Calendar and inserts them as markdown tables into notes. It replaces placeholder text like `[today's schedule]` or `[2026-02-16 schedule]` with a formatted events table. Works identically on desktop and mobile.

## Core Concepts

### Placeholder System

The plugin scans notes for bracketed placeholder text (case-insensitive):

- `[today's schedule]` — resolves date from the note's filename (expects `YYYY-MM-DD` at the start)
- `[tomorrow's schedule]` — resolves to the day after the note's filename date
- `[2026-02-16 schedule]` — uses the explicit date provided
- The keyword "schedule" is the default trigger word, configurable in settings

### Table Output

After fetching, the placeholder is replaced with a commented, refreshable block:

```markdown
%%schedule-start 2026-02-16%%
| Time | Event |
| --: | :-- |
| **All Day** | **Conference** |
| 9:00 AM | Standup |
| 1:30 PM | Client Call |
%%schedule-end%%
```

- All-day events appear first, bolded, with "All Day" in the time column
- Timed events sorted chronologically
- If no events: shows "No events scheduled" in a single row
- Comment markers (`%%`) are invisible in reading view but allow the refresh command to find and replace the table

### Refresh

The "Refresh Schedule" command finds all `%%schedule-start DATE%%...%%schedule-end%%` blocks in the current note and re-fetches events for each date, replacing the table contents. This lets users update their schedule throughout the day.

## Commands

1. **Insert Schedule** — Scans the current note for placeholders, fetches events, replaces placeholders with tables.
2. **Refresh Schedule** — Re-fetches and updates all already-inserted schedule tables in the current note.
3. **Connect Google Calendar** — Initiates OAuth flow (also accessible from settings).

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| Google Account | OAuth button | — | Connect/disconnect Google Calendar |
| Calendars | Checklist | All selected | After auth, shows list of user's calendars to include |
| Include all-day events | Toggle | true | Show all-day events at top of table |
| Placeholder keyword | Text | `schedule` | The trigger word inside brackets |
| Time format | Dropdown | 12-hour | 12-hour or 24-hour time display |
| Date format in filename | Text | `YYYY-MM-DD` | Pattern for extracting date from note filenames |
| Auto-insert on daily note creation | Toggle | false | Automatically run Insert Schedule when a new daily note is created |

## Google Calendar OAuth Flow

### Setup (User performs once)

1. User creates a Google Cloud project and enables Calendar API
2. User creates OAuth 2.0 credentials (Web application type)
   - Redirect URI: `obsidian://google-calendar-schedule-auth` (custom URI handler)
3. User enters Client ID and Client Secret in plugin settings
4. User clicks "Connect" — plugin opens Google consent screen
5. After granting access, Google redirects to the custom URI
6. Plugin exchanges auth code for access + refresh tokens
7. Tokens stored in plugin data via Obsidian's data.json

### Token Management

- Access tokens expire after ~1 hour; plugin auto-refreshes using refresh token
- If refresh fails, plugin prompts user to re-authenticate
- Disconnect button clears all stored tokens

## Auto-Insert Behavior

When enabled, the plugin listens for the Obsidian `file-open` event. If the opened file:
1. Was created within the last 10 seconds (heuristic for "just created")
2. Has a filename matching the date format pattern
3. Contains a schedule placeholder

Then it automatically runs the Insert Schedule command.

## File Structure

```
obsidian-schedule-plugin/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── src/
│   ├── main.ts              # Plugin entry point, commands, event listeners
│   ├── settings.ts           # Settings tab UI and types
│   ├── google-auth.ts        # OAuth flow, token management
│   ├── google-calendar.ts    # Calendar API calls (list calendars, fetch events)
│   ├── schedule-parser.ts    # Find placeholders, parse dates, extract from filenames
│   ├── table-builder.ts      # Build markdown tables from events
│   └── types.ts              # Shared TypeScript interfaces
└── styles.css                # Minimal styling for settings UI
```

## Future Features (Not in v1)

- Event filtering (exclude by pattern)
- Additional table columns (location, description, calendar name)
- Multi-day / date range support for weekly notes
- CalDAV support for non-Google calendars
- ICS file parsing as offline fallback
