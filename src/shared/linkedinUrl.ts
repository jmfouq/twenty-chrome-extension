export type LinkedinKey = { kind: 'person' | 'company'; slug: string };

const LINKEDIN_PATH_PATTERN = /linkedin\.com\/(in|company|school|showcase)\/([^/?#\s]+)/i;

export const parseLinkedinUrl = (url: string | null | undefined): LinkedinKey | null => {
  const match = url?.match(LINKEDIN_PATH_PATTERN);

  if (!match) {
    return null;
  }

  let slug = match[2];

  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Keep the raw slug when it is not valid percent-encoding.
  }

  return { kind: match[1].toLowerCase() === 'in' ? 'person' : 'company', slug: slug.toLowerCase() };
};

export const isSameLinkedinUrl = (first: string | null | undefined, second: string | null | undefined) => {
  const firstKey = parseLinkedinUrl(first);
  const secondKey = parseLinkedinUrl(second);

  return Boolean(firstKey && secondKey && firstKey.kind === secondKey.kind && firstKey.slug === secondKey.slug);
};

export const toCanonicalLinkedinUrl = (url: string): string => {
  const key = parseLinkedinUrl(url);

  if (!key) {
    return url;
  }

  return `https://www.linkedin.com/${key.kind === 'person' ? 'in' : 'company'}/${encodeURIComponent(key.slug)}`;
};
