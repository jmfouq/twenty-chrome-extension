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

export const guessCompanyNameFromDomain = (domain: string): string => {
  const labels = domain.split('.');
  const hasSecondLevelSuffix = labels.length > 2 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 2]);
  const label = labels[labels.length - (hasSecondLevelSuffix ? 3 : 2)] ?? domain;

  return label.charAt(0).toUpperCase() + label.slice(1);
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
