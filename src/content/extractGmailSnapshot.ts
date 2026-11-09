import { getEmailDomain, isAutomatedEmail, isPersonalEmailDomain } from '../shared/emailDomains';
import { type DetectedContact, type GmailSnapshot } from '../shared/types';
import { extractGmailAttachments } from './extractGmailAttachments';

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

// Gmail marks every participant of an open thread with an `email` attribute;
// `h2.hP` is the subject header, only present when a thread is open.
const OPEN_THREAD_SUBJECT_SELECTOR = 'div[role="main"] h2.hP';
const PARTICIPANT_SELECTOR = 'div[role="main"] [email]';

const extractOwnEmail = (document: Document): string | null => {
  const fromTitle = document.title.match(EMAIL_PATTERN)?.[0];

  if (fromTitle) {
    return fromTitle.toLowerCase();
  }

  const accountButton = document.querySelector('a[aria-label*="@"]');

  return accountButton?.getAttribute('aria-label')?.match(EMAIL_PATTERN)?.[0]?.toLowerCase() ?? null;
};

const cleanName = (name: string | null | undefined, email: string): string | null => {
  const trimmed = name?.trim();

  if (!trimmed || trimmed.toLowerCase() === email || trimmed.includes('@')) {
    return null;
  }

  return trimmed;
};

export const extractGmailSnapshot = (document: Document): GmailSnapshot => {
  const ownEmail = extractOwnEmail(document);
  const subjectElement = document.querySelector(OPEN_THREAD_SUBJECT_SELECTOR);

  if (!subjectElement) {
    return { ownEmail, subject: null, contacts: [], attachments: [] };
  }

  const contactsByEmail = new Map<string, DetectedContact>();
  const ownDomain = ownEmail ? getEmailDomain(ownEmail) : null;
  const isColleague = (email: string) =>
    ownDomain !== null && !isPersonalEmailDomain(ownDomain) && getEmailDomain(email) === ownDomain;

  document.querySelectorAll(PARTICIPANT_SELECTOR).forEach((element) => {
    const email = element.getAttribute('email')?.trim().toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email) || email === ownEmail || isColleague(email) || isAutomatedEmail(email)) {
      return;
    }

    const name = cleanName(element.getAttribute('name') ?? element.textContent, email);
    const existing = contactsByEmail.get(email);

    if (!existing || (!existing.name && name)) {
      contactsByEmail.set(email, { email, name });
    }
  });

  return {
    ownEmail,
    subject: subjectElement.textContent?.trim() || null,
    contacts: [...contactsByEmail.values()],
    attachments: extractGmailAttachments(document),
  };
};
