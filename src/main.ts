import { Notice, Plugin, TFile, MarkdownView } from 'obsidian';
import { SchedulePluginSettings, DEFAULT_SETTINGS } from './types';
import { GoogleAuth } from './google-auth';
import { fetchEvents } from './google-calendar';
import { findPlaceholders, findScheduleBlocks, parseDateFromFilename, resolveDate } from './schedule-parser';
import { buildScheduleTable } from './table-builder';
import { ScheduleSettingTab } from './settings';

export default class SchedulePlugin extends Plugin {
	settings: SchedulePluginSettings;
	auth: GoogleAuth;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.auth = new GoogleAuth(
			() => this.settings,
			async (partial) => {
				Object.assign(this.settings, partial);
				await this.saveData(this.settings);
			}
		);

		this.registerObsidianProtocolHandler('google-calendar-schedule-auth', async (params) => {
			try {
				await this.auth.handleCallback(params);
				new Notice('Google Calendar connected successfully!');
			} catch (e) {
				new Notice('Failed to connect: ' + (e as Error).message);
			}
		});

		this.addCommand({
			id: 'insert-schedule',
			name: 'Insert schedule',
			callback: () => this.insertSchedule(),
		});

		this.addCommand({
			id: 'refresh-schedule',
			name: 'Refresh schedule',
			callback: () => this.refreshSchedule(),
		});

		this.addCommand({
			id: 'connect-google-calendar',
			name: 'Connect Google Calendar',
			callback: () => window.open(this.auth.startAuth()),
		});

		this.addSettingTab(new ScheduleSettingTab(this.app, this));

		this.registerEvent(this.app.workspace.on('file-open', async (file) => {
			if (!this.settings.autoInsertOnDailyNote || !file) return;
			if (Date.now() - file.stat.ctime > 10000) return;
			const content = await this.app.vault.read(file);
			const placeholders = findPlaceholders(content, this.settings.placeholderKeyword);
			if (placeholders.length > 0) {
				await this.insertSchedule();
			}
		}));
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async insertSchedule() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) {
			new Notice('No active note');
			return;
		}

		if (!this.auth.isAuthenticated()) {
			new Notice('Please connect Google Calendar in settings first.');
			return;
		}

		if (this.settings.selectedCalendarIds.length === 0) {
			new Notice('Please select calendars in settings.');
			return;
		}

		try {
			const content = view.editor.getValue();
			const placeholders = findPlaceholders(content, this.settings.placeholderKeyword);

			if (placeholders.length === 0) {
				new Notice('No schedule placeholders found.');
				return;
			}

			const filenameDate = parseDateFromFilename(view.file.name, this.settings.dateFormatInFilename);
			const accessToken = await this.auth.getAccessToken();

			// Process in reverse order to preserve indices
			for (let i = placeholders.length - 1; i >= 0; i--) {
				const placeholder = placeholders[i]!;
				const date = resolveDate(placeholder, filenameDate);

				const allEvents = (await Promise.all(
					this.settings.selectedCalendarIds.map(id => fetchEvents(accessToken, id, date))
				)).flat();

				const table = buildScheduleTable(allEvents, date, this.settings);

				const from = view.editor.offsetToPos(placeholder.startIndex);
				const to = view.editor.offsetToPos(placeholder.endIndex);
				view.editor.replaceRange(table, from, to);
			}
		} catch (e) {
			new Notice('Failed to fetch schedule: ' + (e as Error).message);
		}
	}

	async refreshSchedule() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) {
			new Notice('No active note');
			return;
		}

		if (!this.auth.isAuthenticated()) {
			new Notice('Please connect Google Calendar in settings first.');
			return;
		}

		if (this.settings.selectedCalendarIds.length === 0) {
			new Notice('Please select calendars in settings.');
			return;
		}

		try {
			const content = view.editor.getValue();
			const blocks = findScheduleBlocks(content);

			if (blocks.length === 0) {
				new Notice('No schedule blocks found to refresh.');
				return;
			}

			const accessToken = await this.auth.getAccessToken();

			// Process in reverse order to preserve indices
			for (let i = blocks.length - 1; i >= 0; i--) {
				const block = blocks[i]!;
				const parts = block.date.split('-');
				const date = new Date(
					parseInt(parts[0] ?? '0', 10),
					parseInt(parts[1] ?? '1', 10) - 1,
					parseInt(parts[2] ?? '1', 10)
				);

				const allEvents = (await Promise.all(
					this.settings.selectedCalendarIds.map(id => fetchEvents(accessToken, id, date))
				)).flat();

				const table = buildScheduleTable(allEvents, date, this.settings);

				const from = view.editor.offsetToPos(block.startIndex);
				const to = view.editor.offsetToPos(block.endIndex);
				view.editor.replaceRange(table, from, to);
			}
		} catch (e) {
			new Notice('Failed to fetch schedule: ' + (e as Error).message);
		}
	}
}
