import { isExternalUrl, unwrapRedirect } from './extractLinkedinSnapshot';

const normalizeUrlText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

// In the server-rendered "À propos" page, the website is the external link whose text is its own URL.
export const findWebsiteInAboutPage = (html: string): string | null => {
  const document = new DOMParser().parseFromString(html, 'text/html');

  for (const anchor of document.querySelectorAll('a[href]')) {
    const url = unwrapRedirect(anchor.getAttribute('href') ?? '');

    if (url && isExternalUrl(url) && normalizeUrlText(anchor.textContent ?? '') === normalizeUrlText(url.href)) {
      return url.href;
    }
  }

  return null;
};
