import { requestUrl } from 'obsidian';
import { CalendarEvent, CalendarInfo } from './types';

/**
 * Fetch the list of calendars accessible to the authenticated user.
 * @param accessToken - Valid Google OAuth access token
 * @returns Array of CalendarInfo objects representing calendars
 */
export async function listCalendars(accessToken: string): Promise<CalendarInfo[]> {
	const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

	try {
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
			},
		});

		const data = response.json;

		// Handle empty or invalid response
		if (!data.items || !Array.isArray(data.items)) {
			return [];
		}

		// Map calendar list items to CalendarInfo
		return data.items.map((item: any) => ({
			id: item.id,
			name: item.summary || 'Untitled Calendar',
			color: item.backgroundColor || '#9FE1E7',
		}));
	} catch (error) {
		console.error('Error fetching calendars:', error);
		throw error;
	}
}

/**
 * Fetch events from a specific calendar for a given date.
 * @param accessToken - Valid Google OAuth access token
 * @param calendarId - The calendar ID to fetch events from
 * @param date - The date to fetch events for
 * @returns Array of CalendarEvent objects
 */
export async function fetchEvents(
	accessToken: string,
	calendarId: string,
	date: Date
): Promise<CalendarEvent[]> {
	// Create start-of-day and end-of-day timestamps in local time
	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);

	const endOfDay = new Date(date);
	endOfDay.setHours(23, 59, 59, 999);

	// Convert to ISO strings for the API
	const timeMin = startOfDay.toISOString();
	const timeMax = endOfDay.toISOString();

	const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
		calendarId
	)}/events`;

	const params = new URLSearchParams({
		timeMin,
		timeMax,
		singleEvents: 'true',
		orderBy: 'startTime',
	});

	try {
		const response = await requestUrl({
			url: `${url}?${params.toString()}`,
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
			},
		});

		const data = response.json;

		// Handle empty or invalid response
		if (!data.items || !Array.isArray(data.items)) {
			return [];
		}

		// Map event items to CalendarEvent
		return data.items.map((item: any) => {
			// Determine if this is an all-day event
			const isAllDay = !!item.start.date;

			// Parse start time
			let startTime: Date;
			if (isAllDay) {
				// All-day events have a date string like "2026-02-15"
				startTime = new Date(item.start.date + 'T00:00:00');
			} else {
				// Timed events have a dateTime string like "2026-02-15T10:30:00-05:00"
				startTime = new Date(item.start.dateTime);
			}

			// Parse end time
			let endTime: Date;
			if (isAllDay) {
				// All-day events have a date string
				endTime = new Date(item.end.date + 'T00:00:00');
			} else {
				// Timed events have a dateTime string
				endTime = new Date(item.end.dateTime);
			}

			return {
				title: item.summary || '(No title)',
				startTime,
				endTime,
				isAllDay,
			};
		});
	} catch (error) {
		console.error('Error fetching events:', error);
		throw error;
	}
}
