export interface SchedulePluginSettings {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number;
	selectedCalendarIds: string[];
	includeAllDayEvents: boolean;
	placeholderKeyword: string;
	timeFormat: '12h' | '24h';
	dateFormatInFilename: string;
	autoInsertOnDailyNote: boolean;
}

export const DEFAULT_SETTINGS: SchedulePluginSettings = {
	clientId: '',
	clientSecret: '',
	redirectUri: '',
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

export interface CalendarEvent {
	title: string;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
}

export interface CalendarInfo {
	id: string;
	name: string;
	color: string;
}

export interface Placeholder {
	match: string;
	fullMatch: string;
	dateType: 'today' | 'tomorrow' | 'explicit';
	explicitDate: string | null;
	startIndex: number;
	endIndex: number;
}

export interface ScheduleBlock {
	date: string;
	startIndex: number;
	endIndex: number;
	fullMatch: string;
}
