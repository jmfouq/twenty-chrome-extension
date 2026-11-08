import { extractGmailSnapshot } from './extractGmailSnapshot';
import { publishSnapshot } from './publishSnapshot';

publishSnapshot(() => ({ source: 'gmail', ...extractGmailSnapshot(document) }));
