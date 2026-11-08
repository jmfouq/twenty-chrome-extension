import { parseLinkedinUrl, toCanonicalLinkedinUrl } from '../shared/linkedinUrl';
import { type LinkedinCompanyPage, type LinkedinPersonPage, type LinkedinSnapshot } from '../shared/types';

const CURRENT_COMPANY_LABEL_PATTERN = /(?:current company|entreprise actuelle)\s*:\s*([^.]+)/i;
const COMPANY_LINK_LABEL_PATTERN = /^[^:]*:\s*(.+)$/;
const WEBSITE_LABEL_PATTERN = /site web|website/i;
// "chez", "at" and "@" name the company more reliably than a dash, which also joins words in titles.
const HEADLINE_ROLE_PATTERNS = [/^(.+?)\s*,?\s+(?:chez|at|@)\s+(.+)$/i, /^(.+?)\s+[-–]\s+(.+)$/];
const MORE_COMPANIES_SUFFIX_PATTERN = /\s*\+\s*\d+\s*(?:autres?|others?|more)\s*$/i;
const MAX_CARD_DEPTH = 20;

const cleanText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() || null;

const getTitleName = (document: Document) => {
  const name = cleanText(
    document.title
      .replace(/^\(\d+\+?\)\s*/, '')
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .replace(/\s*:\s*[^:]*$/, ''),
  );

  return name && name.toLowerCase() !== 'linkedin' ? name : null;
};

const getHeading = (document: Document) =>
  cleanText(document.querySelector('main h1')?.textContent) ?? getTitleName(document);

const getVisibleTexts = (element: Element, selector = 'span[aria-hidden="true"]') =>
  [...element.querySelectorAll(selector)]
    .map((span) => cleanText(span.textContent))
    .filter((text): text is string => Boolean(text));

const getImageUrl = (document: Document, selector: string) => {
  const src = document.querySelector<HTMLImageElement>(selector)?.getAttribute('src');

  return src?.startsWith('https://') ? src : null;
};

const toCompanyUrl = (href: string | null | undefined) => {
  const absoluteHref = href ? new URL(href, 'https://www.linkedin.com').href : null;

  return parseLinkedinUrl(absoluteHref)?.kind === 'company' ? toCanonicalLinkedinUrl(absoluteHref ?? '') : null;
};

const getNameHeading = (document: Document, fullName: string) =>
  [...document.querySelectorAll('main h1, main h2')].find((heading) => cleanText(heading.textContent) === fullName) ??
  null;

const getTopCard = (heading: Element | null) => {
  let element = heading?.parentElement ?? null;

  for (let depth = 0; element && depth < MAX_CARD_DEPTH; depth++) {
    if (element.tagName === 'SECTION') {
      return element;
    }

    element = element.parentElement;
  }

  return null;
};

const getHeadline = (document: Document, heading: Element | null, card: Element | null, fullName: string) => {
  const legacyHeadline = cleanText(document.querySelector('main .text-body-medium.break-words')?.textContent);

  if (legacyHeadline || !heading || !card) {
    return legacyHeadline;
  }

  const paragraphs = [...card.querySelectorAll('p')].filter(
    (paragraph) => heading.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

  for (const paragraph of paragraphs) {
    const text = cleanText(paragraph.textContent);

    // Skips connection degree ("· 1er"), pronouns ("(Elle)") and the name repeated.
    if (text && text !== fullName && !text.startsWith('·') && !/^\(.*\)$/.test(text) && text.length > 2) {
      return text;
    }
  }

  return null;
};

// The current company shows next to the name, as a link or as a button with its logo.
const getTopCardCompany = (card: Element | null) => {
  const link = card?.querySelector('a[href*="/company/"]');

  if (!link) {
    const logoButton = card?.querySelector('img[src*="company-logo"]')?.closest('[role="button"], button, a');

    // LinkedIn appends "+ 13 autres" when the person lists several current positions.
    return {
      companyName: cleanText(logoButton?.textContent?.replace(MORE_COMPANIES_SUFFIX_PATTERN, '')),
      companyUrl: null,
    };
  }

  const labelName = link.getAttribute('aria-label')?.match(COMPANY_LINK_LABEL_PATTERN)?.[1];

  return {
    companyName: cleanText(labelName) ?? cleanText(link.textContent),
    companyUrl: toCompanyUrl(link.getAttribute('href')),
  };
};

const getCurrentExperience = (document: Document) => {
  const firstItem = document.getElementById('experience')?.closest('section')?.querySelector('ul > li');

  if (!firstItem) {
    return { jobTitle: null, companyName: null, companyUrl: null };
  }

  const companyUrl = toCompanyUrl(firstItem.querySelector('a[href*="/company/"]')?.getAttribute('href'));
  const nestedRole = firstItem.querySelector('ul li');
  const nestedTexts = nestedRole ? getVisibleTexts(nestedRole) : [];
  const texts = getVisibleTexts(firstItem);

  // Several roles at the same company are grouped under a company header.
  if (nestedTexts.length > 0) {
    return { jobTitle: nestedTexts[0], companyName: texts[0] ?? null, companyUrl };
  }

  return {
    jobTitle: texts[0] ?? null,
    companyName: cleanText(texts[1]?.split(' · ')[0]),
    companyUrl,
  };
};

const getCurrentCompanyFromLabel = (document: Document) => {
  for (const element of document.querySelectorAll('main [aria-label]')) {
    const match = element.getAttribute('aria-label')?.match(CURRENT_COMPANY_LABEL_PATTERN);

    if (match) {
      return cleanText(match[1]);
    }
  }

  return null;
};

// Headlines often read "CTO chez Acme | Investisseur"; the role is the part before the company.
const parseHeadline = (headline: string | null) => {
  const firstPart = headline?.split(/\s*[|•·]\s*/)[0] ?? null;
  const match = HEADLINE_ROLE_PATTERNS.map((pattern) => firstPart?.match(pattern)).find(Boolean);

  return match
    ? { jobTitle: cleanText(match[1]), companyName: cleanText(match[2]) }
    : { jobTitle: cleanText(firstPart), companyName: null };
};

const extractPersonPage = (document: Document, profileUrl: string): LinkedinPersonPage | null => {
  const rawName = getHeading(document);

  if (!rawName) {
    return null;
  }

  const heading = getNameHeading(document, rawName);
  const card = getTopCard(heading);
  const headline = getHeadline(document, heading, card, rawName);
  const headlineRole = parseHeadline(headline);
  const experience = getCurrentExperience(document);
  const topCardCompany = getTopCardCompany(card);

  return {
    kind: 'person',
    profileUrl,
    fullName: rawName.split(',')[0].trim(),
    headline,
    jobTitle: experience.jobTitle ?? headlineRole.jobTitle,
    companyName:
      experience.companyName ??
      topCardCompany.companyName ??
      getCurrentCompanyFromLabel(document) ??
      headlineRole.companyName,
    companyUrl: experience.companyUrl ?? topCardCompany.companyUrl,
    photoUrl: getImageUrl(
      document,
      'main img[src*="profile-displayphoto"], main img.pv-top-card-profile-picture__image, main img[class*="profile-picture"]',
    ),
  };
};

export const unwrapRedirect = (href: string) => {
  try {
    const url = new URL(href, 'https://www.linkedin.com');
    const isLinkedinRedirect = /(^|\.)linkedin\.com$/i.test(url.hostname) && url.searchParams.has('url');
    const target = isLinkedinRedirect ? url.searchParams.get('url') : null;

    return new URL(target ?? url.href);
  } catch {
    return null;
  }
};

const MAX_WEBSITE_LABEL_DEPTH = 4;

export const isExternalUrl = (url: URL) =>
  url.protocol.startsWith('http') && !/(^|\.)(linkedin\.com|licdn\.com|lnkd\.in)$/i.test(url.hostname);

// On the "À propos" tab the bare URL sits right after a "Site web" heading; posts also contain bare links.
const followsWebsiteLabel = (anchor: Element) => {
  let element: Element | null = anchor;

  for (let depth = 0; element && depth < MAX_WEBSITE_LABEL_DEPTH; depth++) {
    if (WEBSITE_LABEL_PATTERN.test(cleanText(element.previousElementSibling?.textContent) ?? '')) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
};

const getCompanyWebsite = (document: Document) => {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('main a[href]')) {
    const url = unwrapRedirect(anchor.getAttribute('href') ?? '');
    const label = `${anchor.getAttribute('aria-label') ?? ''} ${anchor.textContent ?? ''}`;
    const isWebsiteLink =
      WEBSITE_LABEL_PATTERN.test(label) || Boolean(anchor.closest('dd')) || followsWebsiteLabel(anchor);

    if (url && isExternalUrl(url) && isWebsiteLink) {
      return url.href;
    }
  }

  return null;
};

type ExtractOptions = {
  // The website only shows on the "À propos" tab; other tabs fall back to a copy fetched in the background.
  getAboutPageWebsite?: (companyUrl: string) => string | null;
};

const extractCompanyPage = (
  document: Document,
  companyUrl: string,
  options: ExtractOptions,
): LinkedinCompanyPage | null => {
  const name = getHeading(document);

  if (!name) {
    return null;
  }

  return {
    kind: 'company',
    companyUrl,
    name,
    website: getCompanyWebsite(document) ?? options.getAboutPageWebsite?.(companyUrl) ?? null,
    logoUrl: getImageUrl(document, 'main img[src*="company-logo"], main img[class*="logo"]'),
  };
};

export const extractLinkedinSnapshot = (
  document: Document,
  pageUrl: string,
  options: ExtractOptions = {},
): LinkedinSnapshot => {
  const key = parseLinkedinUrl(pageUrl);

  if (!key) {
    return { page: null };
  }

  const canonicalUrl = toCanonicalLinkedinUrl(pageUrl);

  return {
    page:
      key.kind === 'person'
        ? extractPersonPage(document, canonicalUrl)
        : extractCompanyPage(document, canonicalUrl, options),
  };
};
