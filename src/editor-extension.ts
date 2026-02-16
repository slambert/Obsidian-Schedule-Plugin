import { EditorState, RangeSetBuilder, StateField, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';

const SCHEDULE_START_RE = /^%%schedule-start \d{4}-\d{2}-\d{2}%%$/;

class ScheduleMarkerWidget extends WidgetType {
	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'schedule-marker';
		return span;
	}
}

const replaceDecoration = Decoration.replace({
	widget: new ScheduleMarkerWidget(),
});

function buildDecorations(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = state.doc;

	for (let i = 1; i <= doc.lines; i++) {
		const line = doc.line(i);
		const text = line.text.trim();

		if (SCHEDULE_START_RE.test(text)) {
			// Hide the marker line plus the blank line after it
			let end = line.to;
			if (i < doc.lines) {
				const nextLine = doc.line(i + 1);
				if (nextLine.text.trim() === '') {
					end = nextLine.to;
				}
			}
			builder.add(line.from, end, replaceDecoration);
		}
	}

	return builder.finish();
}

export const scheduleMarkerField = StateField.define<DecorationSet>({
	create(state) {
		return buildDecorations(state);
	},
	update(decorations, tr: Transaction) {
		if (tr.docChanged) {
			return buildDecorations(tr.state);
		}
		return decorations;
	},
	provide(field) {
		return EditorView.decorations.from(field);
	},
});
