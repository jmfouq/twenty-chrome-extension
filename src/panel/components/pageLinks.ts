import { normalizeDomain } from '../../shared/emailDomains';
import { type PageSnapshot } from '../../shared/types';
import { type Company, type Person } from '../api/types';

export type PageLink = { key: string; label: string; data: Record<string, unknown> };

const getPersonEmails = (person: Person) =>
  [person.emails?.primaryEmail, ...(person.emails?.additionalEmails ?? [])]
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

const isSameUrl = (left: string | null | undefined, right: string) =>
  (left ?? '').replace(/\/+$/, '').toLowerCase() === right.replace(/\/+$/, '').toLowerCase();

export const getPersonPageLinks = (snapshot: PageSnapshot | null, person: Person): PageLink[] => {
  if (snapshot?.source === 'linkedin' && snapshot.page?.kind === 'person' && 'linkedinLink' in person) {
    const { profileUrl } = snapshot.page;
    const currentUrl = person.linkedinLink?.primaryLinkUrl;

    return isSameUrl(currentUrl, profileUrl)
      ? []
      : [
          {
            key: 'linkedin',
            label: currentUrl ? 'Remplacer son LinkedIn par ce profil' : 'Lier à ce profil LinkedIn',
            data: { linkedinLink: { primaryLinkUrl: profileUrl } },
          },
        ];
  }

  if (
    (snapshot?.source === 'gmail' || snapshot?.source === 'outlook' || snapshot?.source === 'calendar') &&
    'emails' in person
  ) {
    const knownEmails = getPersonEmails(person);
    const primaryEmail = person.emails?.primaryEmail || null;
    const additionalEmails = person.emails?.additionalEmails ?? [];

    return snapshot.contacts
      .filter((contact) => !knownEmails.includes(contact.email.toLowerCase()))
      .map((contact) => ({
        key: contact.email,
        label: `Ajouter l'email ${contact.email}`,
        data: {
          emails: primaryEmail
            ? { primaryEmail, additionalEmails: [...additionalEmails, contact.email] }
            : { primaryEmail: contact.email, additionalEmails },
        },
      }));
  }

  return [];
};

export const getCompanyPageLinks = (snapshot: PageSnapshot | null, company: Company): PageLink[] => {
  const currentLinkedinUrl = company.linkedinLink?.primaryLinkUrl;
  const linkedinLink = (url: string, label: string): PageLink[] =>
    !('linkedinLink' in company) || isSameUrl(currentLinkedinUrl, url)
      ? []
      : [
          {
            key: 'linkedin',
            label: currentLinkedinUrl ? `${label} (remplace le lien actuel)` : label,
            data: { linkedinLink: { primaryLinkUrl: url } },
          },
        ];

  if (snapshot?.source === 'linkedin' && snapshot.page?.kind === 'company') {
    return linkedinLink(snapshot.page.companyUrl, 'Lier à cette page LinkedIn');
  }

  if (snapshot?.source === 'linkedin' && snapshot.page?.kind === 'person' && snapshot.page.companyUrl) {
    return linkedinLink(
      snapshot.page.companyUrl,
      `Lier à la page LinkedIn de ${snapshot.page.companyName ?? 'cette société'}`,
    );
  }

  if (snapshot?.source === 'website' && 'domainName' in company) {
    const currentDomain = normalizeDomain(company.domainName?.primaryLinkUrl ?? '');

    return currentDomain === snapshot.domain
      ? []
      : [
          {
            key: 'website',
            label: currentDomain
              ? `Remplacer ${currentDomain} par ${snapshot.domain}`
              : `Lier au site ${snapshot.domain}`,
            data: { domainName: { primaryLinkUrl: `https://${snapshot.domain}` } },
          },
        ];
  }

  return [];
};
