import { type GmailAttachment } from '../shared/types';

// Gmail attachment chips carry `download_url="<mime type>:<file name>:<url>"`.
const DOWNLOAD_URL_PATTERN = /^([^:]+):(.+?):(https:\/\/mail\.google\.com\/.+)$/;
const MESSAGE_SELECTOR = 'div[role="main"] .adn';
const MESSAGE_BODY_SELECTOR = '.a3s';
const SENDER_SELECTOR = '.gD[email]';

// Gmail percent-encodes some file names in download_url, as in `Plan%20de%20Compte.xlsx`.
const decodeFileName = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

const getSenderName = (message: Element) => {
  const sender = message.querySelector(SENDER_SELECTOR);

  return sender?.getAttribute('name')?.trim() || sender?.textContent?.trim() || null;
};

export const extractGmailAttachments = (document: Document): GmailAttachment[] => {
  const attachmentsByUrl = new Map<string, GmailAttachment>();

  document.querySelectorAll(MESSAGE_SELECTOR).forEach((message) => {
    message.querySelectorAll('[download_url]').forEach((element) => {
      if (element.closest(MESSAGE_BODY_SELECTOR)) {
        return;
      }

      const match = element.getAttribute('download_url')?.match(DOWNLOAD_URL_PATTERN);

      if (!match || attachmentsByUrl.has(match[3])) {
        return;
      }

      attachmentsByUrl.set(match[3], {
        mimeType: match[1],
        name: decodeFileName(match[2]),
        downloadUrl: match[3],
        senderName: getSenderName(message),
      });
    });
  });

  return [...attachmentsByUrl.values()];
};
