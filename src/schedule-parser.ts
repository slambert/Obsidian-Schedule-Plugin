import { Placeholder, ScheduleBlock } from './types';

export function findPlaceholders(content: string, keyword: string): Placeholder[] {
	const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(
		`\\[(today'?s?\\s+${escapedKeyword}|tomorrow'?s?\\s+${escapedKeyword}|(\\d{4}-\\d{2}-\\d{2})\\s+${escapedKeyword})\\]`,
		'gi'
	);

	const results: Placeholder[] = [];
	let regexMatch: RegExpExecArray | null;

	while ((regexMatch = pattern.exec(content)) !== null) {
		const fullMatch = regexMatch[0]!;
		const inner = regexMatch[1] ?? '';
		const explicitDateCapture = regexMatch[2] ?? null;

		const lowerInner = inner.toLowerCase();
		let dateType: 'today' | 'tomorrow' | 'explicit';

		if (lowerInner.startsWith('today')) {
			dateType = 'today';
		} else if (lowerInner.startsWith('tomorrow')) {
			dateType = 'tomorrow';
		} else {
			dateType = 'explicit';
		}

		results.push({
			match: inner,
			fullMatch,
			dateType,
			explicitDate: explicitDateCapture,
			startIndex: regexMatch.index,
			endIndex: regexMatch.index + fullMatch.length,
		});
	}

	return results;
}

export function findScheduleBlocks(content: string): ScheduleBlock[] {
	const startPattern = /^%%schedule-start (\d{4}-\d{2}-\d{2})%%$/gm;
	const results: ScheduleBlock[] = [];
	let regexMatch: RegExpExecArray | null;

	while ((regexMatch = startPattern.exec(content)) !== null) {
		const date = regexMatch[1] ?? '';
		const startIndex = regexMatch.index;

		// Scan forward past blank lines and table rows (lines starting with |)
		let endIndex = regexMatch.index + regexMatch[0]!.length;
		const remaining = content.slice(endIndex);
		const lines = remaining.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed === '' || trimmed.startsWith('|')) {
				endIndex += line.length + 1; // +1 for the newline
			} else {
				break;
			}
		}

		// Trim trailing newline
		if (endIndex > 0 && content[endIndex - 1] === '\n') {
			endIndex--;
		}

		results.push({
			date,
			startIndex,
			endIndex,
			fullMatch: content.slice(startIndex, endIndex),
		});
	}

	return results;
}

export function parseDateFromFilename(filename: string, format: string): Date | null {
	let regexStr = format
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace('YYYY', '(\\d{4})')
		.replace('MM', '(\\d{2})')
		.replace('DD', '(\\d{2})');

	const pattern = new RegExp(regexStr);
	const match = pattern.exec(filename);

	if (!match) {
		return null;
	}

	// Determine the order of year, month, day captures based on format token positions
	const yearPos = format.indexOf('YYYY');
	const monthPos = format.indexOf('MM');
	const dayPos = format.indexOf('DD');

	const positions = [
		{ token: 'year', pos: yearPos },
		{ token: 'month', pos: monthPos },
		{ token: 'day', pos: dayPos },
	].sort((a, b) => a.pos - b.pos);

	const captured: Record<string, number> = {};
	positions.forEach((entry, i) => {
		captured[entry.token] = parseInt(match[i + 1] ?? '0', 10);
	});

	const year = captured['year'] ?? 0;
	const month = (captured['month'] ?? 1) - 1; // JS months are 0-indexed
	const day = captured['day'] ?? 1;

	const date = new Date(year, month, day);

	// Validate the parsed date components round-trip correctly
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

export function resolveDate(placeholder: Placeholder, filenameDate: Date | null): Date {
	switch (placeholder.dateType) {
		case 'today': {
			if (filenameDate !== null) {
				return new Date(filenameDate);
			}
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return today;
		}

		case 'tomorrow': {
			const base = filenameDate !== null ? new Date(filenameDate) : (() => {
				const d = new Date();
				d.setHours(0, 0, 0, 0);
				return d;
			})();
			base.setDate(base.getDate() + 1);
			return base;
		}

		case 'explicit': {
			if (placeholder.explicitDate === null) {
				throw new Error('Placeholder has dateType "explicit" but no explicitDate value');
			}
			const parts = placeholder.explicitDate.split('-');
			return new Date(
				parseInt(parts[0] ?? '0', 10),
				parseInt(parts[1] ?? '1', 10) - 1,
				parseInt(parts[2] ?? '1', 10)
			);
		}
	}
}
