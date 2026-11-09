import { type DownloadAttachmentResponse, type ExtensionMessage } from '../shared/types';
import { extractGmailSnapshot } from './extractGmailSnapshot';
import { publishSnapshot } from './publishSnapshot';

publishSnapshot(() => ({ source: 'gmail', ...extractGmailSnapshot(document) }));

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const downloadAttachment = async (url: string): Promise<DownloadAttachmentResponse> => {
  try {
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      return { error: `Gmail a répondu ${response.status}.` };
    }

    return { dataUrl: await readAsDataUrl(await response.blob()) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

// Fallback for the side panel: this script runs on mail.google.com with the user's Gmail session.
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type !== 'downloadAttachment' || !message.url.startsWith('https://mail.google.com/')) {
    return false;
  }

  void downloadAttachment(message.url).then(sendResponse);

  return true;
});
