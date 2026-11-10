import { type GmailSnapshot } from "../shared/types";
import { collectContacts, extractOwnEmail } from "./extractGmailSnapshot";

// An open event shows as a dialog (quick view) or, once opened in full, inside the main area.
const EVENT_CONTAINER_SELECTORS = ['[role="dialog"]', '[role="main"]'];
const GUEST_SELECTOR = "[data-email]";
const TITLE_INPUT_SELECTOR =
  'input[aria-label="Titre"], input[aria-label="Title"], input[aria-label="Ajouter un titre"], input[aria-label="Add title"]';

const getFirstText = (element: Element) => {
  const walker = element.ownerDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
  );

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();

    if (text) {
      return text;
    }
  }

  return null;
};

const getEventTitle = (container: Element) => {
  const input = container.querySelector<HTMLInputElement>(TITLE_INPUT_SELECTOR);

  if (input?.value.trim()) {
    return input.value.trim();
  }

  const heading = container.querySelector('[role="heading"]');

  return heading?.textContent?.trim() || null;
};

export const extractCalendarSnapshot = (document: Document): GmailSnapshot => {
  const ownEmail = extractOwnEmail(document);
  const container = EVENT_CONTAINER_SELECTORS.flatMap((selector) => [
    ...document.querySelectorAll(selector),
  ]).find((element) => element.querySelector(GUEST_SELECTOR));

  if (!container) {
    return { ownEmail, subject: null, contacts: [], attachments: [] };
  }

  const contacts = collectContacts(
    [...container.querySelectorAll(GUEST_SELECTOR)].map((element) => ({
      email: element.getAttribute("data-email"),
      name: element.getAttribute("data-name") ?? getFirstText(element),
    })),
    ownEmail,
  );

  return {
    ownEmail,
    subject: getEventTitle(container),
    contacts,
    attachments: [],
  };
};
