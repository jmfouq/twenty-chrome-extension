import { type GmailSnapshot } from "../shared/types";
import { collectContacts, extractOwnEmail } from "./extractGmailSnapshot";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const READING_PANE_SELECTOR = "#ReadingPaneContainerId";
const SUBJECT_SELECTOR = '[id$="_SUBJECT"][role="heading"]';
// Each message header exposes its sender and recipient lines with ids ending in _FROM, _TO, _CC.
const PARTICIPANT_LINE_SELECTOR = ["_FROM", "_TO", "_CC", "_BCC"]
  .map((suffix) => `[id^="MSG_"][id$="${suffix}"]`)
  .join(", ");
const MAILBOX_SELECTOR = '[id^="primaryMailboxRoot"][title*="@"]';

const toParticipants = (element: Element) => {
  const label = element.getAttribute("aria-label") ?? "";
  const text = element.textContent ?? "";
  const emails = [...new Set(`${label} ${text}`.match(EMAIL_PATTERN) ?? [])];
  const name = text
    .replace(EMAIL_PATTERN, "")
    .replace(/[<>()]/g, "")
    .trim();

  return emails.map((email) => ({
    email,
    name: emails.length === 1 ? name : null,
  }));
};

const extractOutlookOwnEmail = (document: Document) =>
  document
    .querySelector(MAILBOX_SELECTOR)
    ?.getAttribute("title")
    ?.toLowerCase() ?? extractOwnEmail(document);

export const extractOutlookSnapshot = (document: Document): GmailSnapshot => {
  const ownEmail = extractOutlookOwnEmail(document);
  const readingPane = document.querySelector(READING_PANE_SELECTOR);
  const subject =
    readingPane?.querySelector(SUBJECT_SELECTOR)?.textContent?.trim() || null;

  if (!readingPane || !subject) {
    return { ownEmail, subject: null, contacts: [], attachments: [] };
  }

  const candidates = [
    ...readingPane.querySelectorAll(PARTICIPANT_LINE_SELECTOR),
  ].flatMap((line) => {
    const entries = [...line.querySelectorAll('[role="button"]')];

    return (entries.length > 0 ? entries : [line]).flatMap(toParticipants);
  });

  return {
    ownEmail,
    subject,
    contacts: collectContacts(candidates, ownEmail),
    attachments: [],
  };
};
