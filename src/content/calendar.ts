import { extractCalendarSnapshot } from './extractCalendarSnapshot';
import { publishSnapshot } from './publishSnapshot';

publishSnapshot(() => ({ source: 'calendar', ...extractCalendarSnapshot(document) }));
