# Schedule — Obsidian Plugin

Fetch events from Google Calendar and insert them as markdown tables into your notes.

Write a placeholder like `[today's schedule]` in any note, run the **Insert schedule** command, and the plugin replaces it with a table of your events for that day. Works on both desktop and mobile.

## Features

- **Placeholder-based insertion** — Write `[today's schedule]`, `[tomorrow's schedule]`, or `[2026-02-16 schedule]` in a note, then run a command to replace it with a formatted events table.
- **Refreshable tables** — Re-fetch and update previously inserted tables with the **Refresh schedule** command, or click the inline refresh button in Live Preview.
- **Multiple calendars** — Select which Google calendars to include in settings.
- **Auto-insert** — Optionally insert the schedule automatically when a new daily note is created.
- **Auto-refresh on file open** — Optionally refresh existing schedule tables whenever you open a note.
- **Configurable** — 12/24-hour time format, custom placeholder keyword, date format in filenames, all-day event toggle.

## Example output

```markdown
%%schedule-start 2026-02-16%%
| Time | Event |
| --: | :-- |
| **All Day** | **Company Offsite** |
| 9:00 AM - 9:30 AM | Standup |
| 1:30 PM - 2:30 PM | Client Call |
```

The `%%schedule-start%%` marker is hidden in Live Preview and replaced with a small refresh button (↻) you can click to update the table.

## Setup

### 1. Host the callback page

The plugin includes a small callback page (`docs/callback.html`) that bridges Google's OAuth redirect to Obsidian. You need to host it at a public HTTPS URL.

**Using GitHub Pages (easiest):**
1. Push this repo to GitHub.
2. Go to **Settings → Pages** in your repo.
3. Set the source to the `docs/` folder on your main branch.
4. Your callback URL will be `https://<username>.github.io/<repo-name>/callback.html`.

You can also host `docs/callback.html` anywhere that serves static files over HTTPS.

### 2. Create Google OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Enable the **Google Calendar API**.
4. Go to **APIs & Services → OAuth consent screen**. Set the publishing status to **Testing**, then under **Test users**, add your Google email address.
5. Go to **Credentials** and create an **OAuth 2.0 Client ID** (Web application type). Create a consent screen when prompted.
6. Add your callback page URL (from step 1) as an **authorized redirect URI**.
7. Copy the **Client ID** and **Client Secret**.

### 3. Configure the plugin

1. Open **Settings → Community plugins → Schedule**.
2. Enter your **Client ID**, **Client Secret**, and **Redirect URI** (the callback page URL from step 1).
3. Click **Connect** to authorize with Google.
4. After connecting, select which calendars to include.

## Commands

| Command | Description |
|---|---|
| **Insert schedule** | Scans the current note for placeholders and replaces them with event tables |
| **Refresh schedule** | Re-fetches events for all previously inserted schedule tables in the current note |
| **Connect Google Calendar** | Opens the Google OAuth consent screen |

## Placeholders

Write any of these in a note (case-insensitive):

- `[schedule]` — Extracts the date from the note's filename
- `[today's schedule]` — Uses the date from the note's filename
- `[tomorrow's schedule]` — One day after the note's filename date
- `[2026-02-16 schedule]` — Uses the specified date

The keyword "schedule" is configurable in settings.

## Settings

| Setting | Default | Description |
|---|---|---|
| Client ID / Client Secret | — | Your Google OAuth credentials |
| Calendars | All selected | Which calendars to include |
| Include all-day events | On | Show all-day events at the top of the table |
| Time format | 12-hour | 12-hour or 24-hour time display |
| Placeholder keyword | `schedule` | The trigger word inside brackets |
| Date format in filename | `YYYY-MM-DD` | How to extract the date from note filenames |
| Auto-insert on daily note creation | Off | Automatically run Insert schedule when a new daily note is opened |
| Auto-refresh on file open | Off | Automatically refresh existing schedule tables when opening a file |

## Installation

### From community plugins

Search for "Schedule" in **Settings → Community plugins → Browse**.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a folder at `<vault>/.obsidian/plugins/obsidian-schedule-plugin/`.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```
