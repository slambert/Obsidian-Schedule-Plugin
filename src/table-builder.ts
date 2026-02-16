import { CalendarEvent, SchedulePluginSettings } from './types';

function formatDateYMD(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatTime12h(date: Date): string {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHour = hours % 12 === 0 ? 12 : hours % 12;
	const displayMinutes = String(minutes).padStart(2, '0');
	return `${displayHour}:${displayMinutes} ${period}`;
}

function formatTime24h(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

function formatTimeRange(start: Date, end: Date, timeFormat: '12h' | '24h'): string {
	const formatter = timeFormat === '12h' ? formatTime12h : formatTime24h;
	return `${formatter(start)} - ${formatter(end)}`;
}

export function buildScheduleTable(
	events: CalendarEvent[],
	date: Date,
	settings: SchedulePluginSettings
): string {
	const dateStr = formatDateYMD(date);

	const allDayEvents = events.filter((e) => e.isAllDay);
	const timedEvents = events
		.filter((e) => !e.isAllDay)
		.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

	const rows: string[] = [];

	if (settings.includeAllDayEvents) {
		for (const event of allDayEvents) {
			rows.push(`| **All Day** | **${event.title}** |`);
		}
	}

	for (const event of timedEvents) {
		const timeRange = formatTimeRange(event.startTime, event.endTime, settings.timeFormat);
		rows.push(`| ${timeRange} | ${event.title} |`);
	}

	if (rows.length === 0) {
		rows.push('| | No events scheduled |');
	}

	const tableLines = [
		'| Time | Event |',
		'| --: | :-- |',
		...rows,
	];

	return `%%schedule-start ${dateStr}%%\n${tableLines.join('\n')}\n%%schedule-end%%`;
}
