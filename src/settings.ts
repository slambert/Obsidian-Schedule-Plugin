import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SchedulePlugin from './main';
import { SchedulePluginSettings, CalendarInfo } from './types';
import { GoogleAuth } from './google-auth';
import { listCalendars } from './google-calendar';

export class ScheduleSettingTab extends PluginSettingTab {
	plugin: SchedulePlugin;

	constructor(app: App, plugin: SchedulePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// --- Section 1: Google Calendar ---
		containerEl.createEl('h2', { text: 'Google Calendar' });

		new Setting(containerEl)
			.setName('Client ID')
			.addText(text => text
				.setValue(this.plugin.settings.clientId)
				.onChange(async (value) => {
					this.plugin.settings.clientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client secret')
			.addText(text => text
				.setValue(this.plugin.settings.clientSecret)
				.onChange(async (value) => {
					this.plugin.settings.clientSecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Redirect URI')
			.setDesc('URL of your hosted callback page')
			.addText(text => text
				.setPlaceholder('https://username.github.io/.../callback.html')
				.setValue(this.plugin.settings.redirectUri)
				.onChange(async (value) => {
					this.plugin.settings.redirectUri = value;
					await this.plugin.saveSettings();
				}));

		if (!this.plugin.auth.isAuthenticated()) {
			new Setting(containerEl)
				.setName('Connect Google account')
				.addButton(button => button
					.setButtonText('Connect')
					.onClick(() => {
						const url = this.plugin.auth.startAuth();
						window.open(url);
					}));
		} else {
			new Setting(containerEl)
				.setName('Google account')
				.setDesc('Connected')
				.addButton(button => button
					.setButtonText('Disconnect')
					.onClick(async () => {
						await this.plugin.auth.disconnect();
						this.display();
					}));

			// --- Section 2: Calendars ---
			containerEl.createEl('h2', { text: 'Calendars' });

			this.loadCalendars(containerEl);
		}

		// --- Section 3: Display ---
		containerEl.createEl('h2', { text: 'Display' });

		new Setting(containerEl)
			.setName('Include all-day events')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeAllDayEvents)
				.onChange(async (value) => {
					this.plugin.settings.includeAllDayEvents = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Time format')
			.addDropdown(dropdown => dropdown
				.addOption('12h', '12-hour')
				.addOption('24h', '24-hour')
				.setValue(this.plugin.settings.timeFormat)
				.onChange(async (value) => {
					this.plugin.settings.timeFormat = value as '12h' | '24h';
					await this.plugin.saveSettings();
				}));

		// --- Section 4: Behavior ---
		containerEl.createEl('h2', { text: 'Behavior' });

		new Setting(containerEl)
			.setName('Placeholder keyword')
			.setDesc("The trigger word inside brackets, e.g. [today's schedule]")
			.addText(text => text
				.setValue(this.plugin.settings.placeholderKeyword)
				.onChange(async (value) => {
					this.plugin.settings.placeholderKeyword = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date format in filename')
			.setDesc('Pattern for extracting date from note filenames')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormatInFilename)
				.onChange(async (value) => {
					this.plugin.settings.dateFormatInFilename = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-insert on daily note creation')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoInsertOnDailyNote)
				.onChange(async (value) => {
					this.plugin.settings.autoInsertOnDailyNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-refresh schedules on file open')
			.setDesc('Automatically refresh existing schedule tables when opening a file')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefreshOnFileOpen)
				.onChange(async (value) => {
					this.plugin.settings.autoRefreshOnFileOpen = value;
					await this.plugin.saveSettings();
				}));
	}

	private async loadCalendars(containerEl: HTMLElement): Promise<void> {
		try {
			const accessToken = await this.plugin.auth.getAccessToken();
			const calendars: CalendarInfo[] = await listCalendars(accessToken);

			for (const cal of calendars) {
				new Setting(containerEl)
					.setName(cal.name)
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.selectedCalendarIds.includes(cal.id))
						.onChange(async (value) => {
							if (value) {
								if (!this.plugin.settings.selectedCalendarIds.includes(cal.id)) {
									this.plugin.settings.selectedCalendarIds.push(cal.id);
								}
							} else {
								this.plugin.settings.selectedCalendarIds =
									this.plugin.settings.selectedCalendarIds.filter(id => id !== cal.id);
							}
							await this.plugin.saveSettings();
						}));
			}
		} catch (err) {
			new Notice(`Failed to load calendars: ${(err as Error).message ?? err}`);
		}
	}
}
