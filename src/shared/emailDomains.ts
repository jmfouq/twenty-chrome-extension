const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.fr',
  'hotmail.com',
  'hotmail.fr',
  'live.com',
  'live.fr',
  'msn.com',
  'yahoo.com',
  'yahoo.fr',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.fr',
  'free.fr',
  'orange.fr',
  'wanadoo.fr',
  'laposte.net',
  'sfr.fr',
  'neuf.fr',
  'bbox.fr',
]);

const NO_REPLY_PATTERN = /^(no-?reply|do-?not-?reply|notifications?|mailer-daemon|bounce)/i;

export const getEmailDomain = (email: string): string => email.slice(email.lastIndexOf('@') + 1).toLowerCase();

export const isPersonalEmailDomain = (domain: string): boolean => PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase());

export const isAutomatedEmail = (email: string): boolean => NO_REPLY_PATTERN.test(email.slice(0, email.indexOf('@')));

export const normalizeDomain = (urlOrDomain: string): string | null => {
  const trimmed = urlOrDomain.trim();

  if (trimmed === '') {
    return null;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);

    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

const SECOND_LEVEL_SUFFIXES = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'gouv']);

const getRegistrableLabelCount = (labels: string[]) =>
  labels.length > 2 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 2]) ? 3 : 2;

// "app.eu.agicap.com" and "agicap.com" are the same company in Twenty.
export const getRegistrableDomain = (hostname: string): string => {
  const labels = hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .split('.');

  return labels.slice(-getRegistrableLabelCount(labels)).join('.');
};

export const guessCompanyNameFromDomain = (domain: string): string => {
  const labels = domain.split('.');
  const label = labels[labels.length - getRegistrableLabelCount(labels)] ?? domain;

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const toComparable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Page titles read "Agicap | Logiciel de trésorerie": keep the part that matches the domain.
export const guessCompanyNameFromPage = (title: string | null | undefined, domain: string): string => {
  const domainLabel = toComparable(guessCompanyNameFromDomain(domain));
  const segments = (title ?? '')
    .split(/\s+[|–—:·•-]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const match = segments.find((segment) => {
    const comparable = toComparable(segment);

    return comparable.length > 0 && (comparable.includes(domainLabel) || domainLabel.includes(comparable));
  });

  return match && match.length <= 60 ? match : guessCompanyNameFromDomain(domain);
};

export const splitFullName = (fullName: string | null, email: string): { firstName: string; lastName: string } => {
  const source = fullName?.trim() || email.slice(0, email.indexOf('@')).replace(/[._-]+/g, ' ');
  const parts = source.split(/\s+/).filter(Boolean);
  const capitalize = (value: string) => (fullName ? value : value.charAt(0).toUpperCase() + value.slice(1));

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: capitalize(parts[0]),
    lastName: parts.slice(1).map(capitalize).join(' '),
  };
};
